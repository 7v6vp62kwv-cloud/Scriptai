-- Stan Media Hub · Videos (episode pipeline + performance)
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
revoke execute on function public.vt_is_admin() from public, anon;
grant execute on function public.vt_is_admin() to authenticated, service_role;
drop policy if exists "vt episodes admin" on public.vt_episodes;
drop policy if exists "vt activity admin" on public.vt_activity;
create policy "vt episodes admin" on public.vt_episodes for all to authenticated using (public.vt_is_admin()) with check (public.vt_is_admin());
create policy "vt activity admin" on public.vt_activity for all to authenticated using (public.vt_is_admin()) with check (public.vt_is_admin());

-- ── Helpers for the Super Client Video skill ───────────────────────────────
-- Only the skill (service role key) may call these; the hub UI writes to the tables directly under RLS.
-- The client is matched to a portal by name: exact, then first name ("Callum" → "Callum Woods"), then contains.
create or replace function public.vt_portal_for(p_client text)
returns public.portals
language plpgsql stable security definer set search_path = public as $$
declare v_portal public.portals;
begin
  select * into v_portal from public.portals where lower(name) = lower(trim(p_client)) order by created_at limit 1;
  if v_portal.id is null then
    select * into v_portal from public.portals where lower(split_part(name, ' ', 1)) = lower(trim(p_client)) order by created_at limit 1;
  end if;
  if v_portal.id is null then
    select * into v_portal from public.portals where name ilike '%' || trim(p_client) || '%' order by created_at limit 1;
  end if;
  if v_portal.id is null then raise exception 'no portal called %', p_client; end if;
  return v_portal;
end;
$$;
revoke all on function public.vt_portal_for(text) from public, anon, authenticated;
grant execute on function public.vt_portal_for(text) to service_role;

-- vt_set_stage: one call moves an episode and records it, exactly like the hub UI would.
-- The episode is created if it does not exist.
--   select public.vt_set_stage('Callum', 2, 'scripted');
--   select public.vt_set_stage('Callum', 2, 'footage_uploaded');
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
  v_portal := public.vt_portal_for(p_client);

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
revoke all on function public.vt_set_stage(text, int, text, text) from public, anon, authenticated;
grant execute on function public.vt_set_stage(text, int, text, text) to service_role;

-- vt_note: attach links and/or flag the episode as blocked (or clear the flag). Pass null to leave a field alone.
--   select public.vt_note('Callum', 2, p_notion => 'https://notion.so/…', p_drive => 'https://drive.google.com/…');
--   select public.vt_note('Callum', 2, p_blocked => 'Footage upload failed, chasing Callum');
--   select public.vt_note('Callum', 2, p_blocked => '');      -- empty string clears the block
create or replace function public.vt_note(p_client text, p_number int, p_notion text default null, p_drive text default null, p_video text default null, p_blocked text default null, p_via text default 'super-client-video')
returns public.vt_episodes
language plpgsql security definer set search_path = public as $$
declare
  v_portal public.portals;
  v_ep     public.vt_episodes;
  v_links  jsonb;
  v_was    boolean;
begin
  v_portal := public.vt_portal_for(p_client);
  select * into v_ep from public.vt_episodes where portal_id = v_portal.id and number = p_number;
  if v_ep.id is null then raise exception 'no episode % for %', p_number, v_portal.name; end if;

  v_links := coalesce(v_ep.links, '{}'::jsonb);
  if p_notion is not null then v_links := v_links || jsonb_build_object('notion', p_notion); end if;
  if p_drive  is not null then v_links := v_links || jsonb_build_object('drive',  p_drive);  end if;
  if p_video  is not null then v_links := v_links || jsonb_build_object('video',  p_video);  end if;
  v_was := v_ep.blocked is not null;

  update public.vt_episodes
     set links      = v_links,
         blocked    = case when p_blocked is null then blocked
                           when trim(p_blocked) = '' then null
                           else jsonb_build_object('reason', trim(p_blocked), 'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end,
         updated_at = now()
   where id = v_ep.id
  returning * into v_ep;

  if p_notion is not null or p_drive is not null or p_video is not null then
    insert into public.vt_activity (id, type, episode_id, portal_id, via, text)
    values ('a' || substr(md5(random()::text), 1, 10), 'note', v_ep.id, v_portal.id, p_via, 'Links updated');
  end if;
  if p_blocked is not null then
    if trim(p_blocked) = '' then
      if v_was then
        insert into public.vt_activity (id, type, episode_id, portal_id, via, text)
        values ('a' || substr(md5(random()::text), 1, 10), 'unblocked', v_ep.id, v_portal.id, p_via, '');
      end if;
    else
      insert into public.vt_activity (id, type, episode_id, portal_id, via, text)
      values ('a' || substr(md5(random()::text), 1, 10), 'blocked', v_ep.id, v_portal.id, p_via, trim(p_blocked));
    end if;
  end if;
  return v_ep;
end;
$$;
revoke all on function public.vt_note(text, int, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.vt_note(text, int, text, text, text, text, text) to service_role;

-- ── Performance: how each posted video did ─────────────────────────────────
-- One row per episode per platform holding the latest numbers (Stan updates them as they grow).
create table if not exists public.vt_stats (
  id          text primary key,
  portal_id   uuid not null references public.portals(id) on delete cascade,
  episode_id  text not null references public.vt_episodes(id) on delete cascade,
  platform    text not null check (platform in ('instagram','tiktok','youtube','facebook','linkedin','other')),
  posted      date,                              -- when it went live; months on the Performance page group by this
  views       int not null default 0,
  likes       int not null default 0,
  comments    int not null default 0,
  shares      int not null default 0,
  saves       int not null default 0,
  followers   int not null default 0,            -- new followers the post brought in
  link        text not null default '',
  notes       text not null default '',
  updated_at  timestamptz not null default now(),
  unique (episode_id, platform)
);
create index if not exists vt_stats_portal on public.vt_stats (portal_id);
alter publication supabase_realtime add table public.vt_stats;
alter table public.vt_stats enable row level security;
drop policy if exists "vt stats admin" on public.vt_stats;
create policy "vt stats admin" on public.vt_stats for all to authenticated using (public.vt_is_admin()) with check (public.vt_is_admin());

-- vt_set_stats: a skill (service role) can log or update numbers. Null leaves a field as it is.
--   select public.vt_set_stats('Callum', 2, 'instagram', p_views => 12400, p_likes => 830, p_posted => '2026-10-20');
create or replace function public.vt_set_stats(p_client text, p_number int, p_platform text, p_views int default null, p_likes int default null, p_comments int default null, p_shares int default null, p_saves int default null, p_followers int default null, p_posted date default null, p_link text default null, p_via text default 'skill')
returns public.vt_stats
language plpgsql security definer set search_path = public as $$
declare
  v_portal public.portals;
  v_ep     public.vt_episodes;
  v_row    public.vt_stats;
begin
  if not (p_platform = any (array['instagram','tiktok','youtube','facebook','linkedin','other'])) then raise exception 'unknown platform %', p_platform; end if;
  v_portal := public.vt_portal_for(p_client);
  select * into v_ep from public.vt_episodes where portal_id = v_portal.id and number = p_number;
  if v_ep.id is null then raise exception 'no episode % for %', p_number, v_portal.name; end if;
  insert into public.vt_stats (id, portal_id, episode_id, platform, posted, views, likes, comments, shares, saves, followers, link)
  values ('s' || substr(md5(random()::text), 1, 10), v_portal.id, v_ep.id, p_platform, p_posted, coalesce(p_views, 0), coalesce(p_likes, 0), coalesce(p_comments, 0), coalesce(p_shares, 0), coalesce(p_saves, 0), coalesce(p_followers, 0), coalesce(p_link, ''))
  on conflict (episode_id, platform) do update set
    posted     = coalesce(excluded.posted, public.vt_stats.posted),
    views      = coalesce(p_views, public.vt_stats.views),
    likes      = coalesce(p_likes, public.vt_stats.likes),
    comments   = coalesce(p_comments, public.vt_stats.comments),
    shares     = coalesce(p_shares, public.vt_stats.shares),
    saves      = coalesce(p_saves, public.vt_stats.saves),
    followers  = coalesce(p_followers, public.vt_stats.followers),
    link       = coalesce(p_link, public.vt_stats.link),
    updated_at = now()
  returning * into v_row;
  insert into public.vt_activity (id, type, episode_id, portal_id, via, text)
  values ('a' || substr(md5(random()::text), 1, 10), 'stats', v_ep.id, v_portal.id, p_via, p_platform || ': ' || v_row.views || ' views');
  return v_row;
end;
$$;
revoke all on function public.vt_set_stats(text, int, text, int, int, int, int, int, int, date, text, text) from public, anon, authenticated;
grant execute on function public.vt_set_stats(text, int, text, int, int, int, int, int, int, date, text, text) to service_role;
