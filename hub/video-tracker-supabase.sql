-- Stan Media Hub · Videos (episode pipeline)
-- Run once in the Supabase SQL editor of the hub's project (the one with portals, hub_tasks, hub_inbox).
-- Episodes belong to portals (clients). Only admins (portal_admins) can read or write them; clients never see these tables.

create table if not exists public.vt_episodes (
  id         text primary key,
  portal_id  uuid not null references public.portals(id) on delete cascade,
  number     int  not null,
  title      text not null default '',
  stage      text not null check (stage in ('scripted','script_approved','sent_to_client','footage_uploaded','editing','waiting_approval','client_approval','approved','feedback_recorded')),
  history    jsonb not null default '[]',     -- [{stage, at (ISO), via?, back?}]
  notes      text not null default '',
  links      jsonb not null default '{}',     -- {notion, drive, video}
  blocked    jsonb,                           -- {reason, at (ISO)} or null
  due        date,
  task_id    text,                            -- hub_tasks row shown in the client's portal for sign-off
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portal_id, number)
);

create table if not exists public.vt_activity (
  id         text primary key,
  at         timestamptz not null default now(),
  type       text not null,                   -- added | stage | blocked | unblocked | due | deleted | client | note
  episode_id text,
  portal_id  uuid,
  from_stage text,
  to_stage   text,
  via        text,                            -- 'hub', 'client', 'super-client-video', …
  text       text not null default ''
);
create index if not exists vt_episodes_portal on public.vt_episodes (portal_id);
create index if not exists vt_activity_at on public.vt_activity (at desc);

-- Realtime, so the hub updates live when the skill moves an episode
alter publication supabase_realtime add table public.vt_episodes;
alter publication supabase_realtime add table public.vt_activity;

-- ── Row level security: admins only ───────────────────────────────────────
alter table public.vt_episodes enable row level security;
alter table public.vt_activity enable row level security;
create or replace function public.vt_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.portal_admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
drop policy if exists "vt episodes admin" on public.vt_episodes;
drop policy if exists "vt activity admin" on public.vt_activity;
create policy "vt episodes admin" on public.vt_episodes for all to authenticated using (public.vt_is_admin()) with check (public.vt_is_admin());
create policy "vt activity admin" on public.vt_activity for all to authenticated using (public.vt_is_admin()) with check (public.vt_is_admin());

-- ── Helper for the Super Client Video skill ────────────────────────────────
-- One call moves an episode and records it, exactly like the hub UI would:
--   select public.vt_set_stage('Camp Fit', 4, 'footage_uploaded');
--   select public.vt_set_stage('Camp Fit', 4, 'feedback_recorded');
-- The client is matched to a portal by name (case-insensitive). The episode is created if it does not exist.
create or replace function public.vt_set_stage(p_client text, p_number int, p_stage text, p_via text default 'super-client-video')
returns public.vt_episodes
language plpgsql security definer set search_path = public as $$
declare
  v_portal public.portals;
  v_ep     public.vt_episodes;
  v_order  text[] := array['scripted','script_approved','sent_to_client','footage_uploaded','editing','waiting_approval','client_approval','approved','feedback_recorded'];
  v_back   boolean;
  v_from   text;
begin
  if not (p_stage = any (v_order)) then raise exception 'unknown stage %', p_stage; end if;
  select * into v_portal from public.portals where lower(name) = lower(p_client) limit 1;
  if v_portal.id is null then
    select * into v_portal from public.portals where name ilike '%' || p_client || '%' order by created_at limit 1;
  end if;
  if v_portal.id is null then raise exception 'no portal called %', p_client; end if;

  select * into v_ep from public.vt_episodes where portal_id = v_portal.id and number = p_number;
  if v_ep.id is null then
    insert into public.vt_episodes (id, portal_id, number, stage, history)
    values ('ep' || substr(md5(random()::text), 1, 10), v_portal.id, p_number, p_stage,
            jsonb_build_array(jsonb_build_object('stage', p_stage, 'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'via', p_via)))
    returning * into v_ep;
    insert into public.vt_activity (id, type, episode_id, portal_id, to_stage, via)
    values ('a' || substr(md5(random()::text), 1, 10), 'added', v_ep.id, v_portal.id, p_stage, p_via);
    return v_ep;
  end if;
  if v_ep.stage = p_stage then return v_ep; end if;

  v_from := v_ep.stage;
  v_back := array_position(v_order, p_stage) < array_position(v_order, v_from);
  update public.vt_episodes
     set history    = history || (jsonb_build_object('stage', p_stage, 'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'via', p_via)
                                  || case when v_back then '{"back": true}'::jsonb else '{}'::jsonb end),
         stage      = p_stage,
         updated_at = now()
   where id = v_ep.id
  returning * into v_ep;
  insert into public.vt_activity (id, type, episode_id, portal_id, from_stage, to_stage, via)
  values ('a' || substr(md5(random()::text), 1, 10), 'stage', v_ep.id, v_portal.id, v_from, p_stage, p_via);
  return v_ep;
end;
$$;
revoke all on function public.vt_set_stage(text, int, text, text) from public;
grant execute on function public.vt_set_stage(text, int, text, text) to authenticated, service_role;
