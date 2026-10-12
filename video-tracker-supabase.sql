-- Video Tracker · Stan Media
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- Then put the project URL and anon key into CONFIG.supabase in video-tracker.html
-- (or have the hub set window.VIDEO_TRACKER_SUPABASE before the script runs).

-- ── Tables ─────────────────────────────────────────────────────────────────
-- Timestamps are epoch milliseconds (bigint) so they round-trip the browser untouched.
create table if not exists public.vt_clients (
  id         text primary key,
  name       text not null,
  updated_at bigint not null
);

create table if not exists public.vt_episodes (
  id         text primary key,
  client_id  text not null references public.vt_clients(id) on delete cascade,
  number     int  not null,
  title      text not null default '',
  stage      text not null check (stage in ('scripted','script_approved','sent_to_client','footage_uploaded','editing','waiting_approval','client_approval','approved','feedback_recorded')),
  history    jsonb not null default '[]',   -- [{stage, at, via?, back?}]
  notes      text not null default '',
  links      jsonb not null default '{}',   -- {notion, drive, video}
  blocked    jsonb,                         -- {reason, at} or null
  due_at     bigint,
  created_at bigint not null,
  updated_at bigint not null,
  unique (client_id, number)
);

create table if not exists public.vt_activity (
  id         text primary key,
  at         bigint not null,
  type       text not null,                 -- added | stage | blocked | unblocked | due | deleted | restored | client | import
  episode_id text,
  client_id  text,
  from_stage text,
  to_stage   text,
  via        text,                          -- 'super-client-video' when the skill did it
  text       text not null default ''
);

create index if not exists vt_episodes_updated_at on public.vt_episodes (updated_at);
create index if not exists vt_activity_at on public.vt_activity (at);

-- ── Row level security ─────────────────────────────────────────────────────
alter table public.vt_clients  enable row level security;
alter table public.vt_episodes enable row level security;
alter table public.vt_activity enable row level security;

-- Logged-in users (the hub) get full access.
drop policy if exists "vt clients authenticated"  on public.vt_clients;
drop policy if exists "vt episodes authenticated" on public.vt_episodes;
drop policy if exists "vt activity authenticated" on public.vt_activity;
create policy "vt clients authenticated"  on public.vt_clients  for all to authenticated using (true) with check (true);
create policy "vt episodes authenticated" on public.vt_episodes for all to authenticated using (true) with check (true);
create policy "vt activity authenticated" on public.vt_activity for all to authenticated using (true) with check (true);

-- Standalone use (the HTML file opened on its own, no login) needs the anon key to write.
-- Anyone holding the anon key can then edit these three tables, so only turn this on
-- while the tracker lives outside the hub, and drop the policies once it is merged.
-- create policy "vt clients anon"  on public.vt_clients  for all to anon using (true) with check (true);
-- create policy "vt episodes anon" on public.vt_episodes for all to anon using (true) with check (true);
-- create policy "vt activity anon" on public.vt_activity for all to anon using (true) with check (true);

-- ── Helper for the Super Client Video skill ────────────────────────────────
-- One call moves an episode and records it, exactly like the tracker UI would:
--   select public.vt_set_stage('Camp Fit', 4, 'footage_uploaded');
--   select public.vt_set_stage('Camp Fit', 4, 'feedback_recorded');
-- Creates the client and the episode when they do not exist yet.
create or replace function public.vt_set_stage(p_client text, p_number int, p_stage text, p_via text default 'super-client-video')
returns public.vt_episodes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now     bigint := (extract(epoch from now()) * 1000)::bigint;
  v_client  public.vt_clients;
  v_ep      public.vt_episodes;
  v_order   text[] := array['scripted','script_approved','sent_to_client','footage_uploaded','editing','waiting_approval','client_approval','approved','feedback_recorded'];
  v_back    boolean;
begin
  if not (p_stage = any (v_order)) then
    raise exception 'unknown stage %', p_stage;
  end if;

  select * into v_client from public.vt_clients where lower(name) = lower(p_client) limit 1;
  if v_client.id is null then
    insert into public.vt_clients (id, name, updated_at)
    values (regexp_replace(lower(p_client), '[^a-z0-9]+', '-', 'g'), p_client, v_now)
    returning * into v_client;
    insert into public.vt_activity (id, at, type, client_id, text)
    values ('act_' || substr(md5(random()::text), 1, 10), v_now, 'client', v_client.id, p_client || ' added');
  end if;

  select * into v_ep from public.vt_episodes where client_id = v_client.id and number = p_number;
  if v_ep.id is null then
    insert into public.vt_episodes (id, client_id, number, stage, history, created_at, updated_at)
    values ('ep_' || substr(md5(random()::text), 1, 10), v_client.id, p_number, p_stage,
            jsonb_build_array(jsonb_build_object('stage', p_stage, 'at', v_now, 'via', p_via)), v_now, v_now)
    returning * into v_ep;
    insert into public.vt_activity (id, at, type, episode_id, client_id, to_stage, via)
    values ('act_' || substr(md5(random()::text), 1, 10), v_now, 'added', v_ep.id, v_client.id, p_stage, p_via);
    return v_ep;
  end if;

  if v_ep.stage = p_stage then
    return v_ep;
  end if;

  v_back := array_position(v_order, p_stage) < array_position(v_order, v_ep.stage);
  update public.vt_episodes
     set history    = history || jsonb_build_object('stage', p_stage, 'at', v_now, 'via', p_via) || case when v_back then '{"back": true}'::jsonb else '{}'::jsonb end,
         stage      = p_stage,
         updated_at = v_now
   where id = v_ep.id
  returning * into v_ep;

  insert into public.vt_activity (id, at, type, episode_id, client_id, from_stage, to_stage, via)
  values ('act_' || substr(md5(random()::text), 1, 10), v_now, 'stage', v_ep.id, v_client.id,
          (select h->>'stage' from jsonb_array_elements(v_ep.history) with ordinality as t(h, n) order by n desc offset 1 limit 1),
          p_stage, p_via);
  return v_ep;
end;
$$;

-- Who may call the helper. Keep it to logged-in users (and the service role, which bypasses RLS anyway).
revoke all on function public.vt_set_stage(text, int, text, text) from public;
grant execute on function public.vt_set_stage(text, int, text, text) to authenticated, service_role;
