-- BENA Fitness-Tagebuch: Datenbank für Supabase
-- Einmal im Supabase-Dashboard unter "SQL Editor" ausführen (New query → einfügen → Run).
-- Jede Person sieht nur ihre eigenen Daten (Row Level Security).
-- Sync-Prinzip: Der Browser vergibt IDs und updated_at; der Server setzt synced_at bei jedem
-- Schreiben neu. Andere Geräte holen alles mit synced_at > letztem Abruf.

create extension if not exists pgcrypto;

-- Gemeinsame Spalten und Trigger ------------------------------------------------
create or replace function public.touch_synced_at() returns trigger
language plpgsql as $$
begin
  new.synced_at := now();
  return new;
end $$;

-- Studios
create table if not exists public.gyms (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  sort int,
  lat double precision,
  lng double precision,
  geo_acc int,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now()
);

-- Übungen / Geräte
create table if not exists public.exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  gym_id uuid,
  name text not null,
  kind text not null default 'machine' check (kind in ('machine', 'free', 'bodyweight', 'cardio', 'sauna')),
  muscle_group text,
  photo_path text,
  notes text,
  settings jsonb not null default '[]'::jsonb,
  step numeric,
  sort_order int,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now()
);

-- Sätze
create table if not exists public.sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  exercise_id uuid not null,
  performed_at timestamptz not null,
  weight_kg numeric,
  reps int,
  duration_min numeric,
  distance_km numeric,
  feel smallint check (feel between 1 and 3),
  is_warmup boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now()
);

-- Energie-Check pro Trainingstag und Studio
create table if not exists public.day_checks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  gym_id uuid,
  energy smallint check (energy between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now()
);

-- Körpermessungen (von Hand oder Withings)
create table if not exists public.body_metrics (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric,
  fat_pct numeric,
  muscle_kg numeric,
  waist_cm numeric,
  source text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  unique (user_id, external_id)
);

-- Schritte pro Tag
create table if not exists public.daily_steps (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  steps int not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now()
);

-- Profil (eine Zeile pro Person, id = Benutzer-ID)
create table if not exists public.profiles (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  display_name text,
  avatar_emoji text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now()
);

-- Trigger, Indizes und Zugriffsregeln für alle Tabellen --------------------------
do $$
declare t text;
begin
  foreach t in array array['gyms', 'exercises', 'sets', 'day_checks', 'body_metrics', 'daily_steps', 'profiles'] loop
    execute format('drop trigger if exists %I_synced on public.%I', t, t);
    execute format('create trigger %I_synced before insert or update on public.%I for each row execute function public.touch_synced_at()', t, t);
    execute format('create index if not exists %I_user_synced on public.%I (user_id, synced_at)', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "eigene Daten" on public.%I', t);
    execute format('create policy "eigene Daten" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Fotos: privater Speicher, Ordner = Benutzer-ID ---------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "eigene Fotos lesen" on storage.objects;
create policy "eigene Fotos lesen" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eigene Fotos schreiben" on storage.objects;
create policy "eigene Fotos schreiben" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eigene Fotos ändern" on storage.objects;
create policy "eigene Fotos ändern" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "eigene Fotos löschen" on storage.objects;
create policy "eigene Fotos löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================================
-- Etappe 6a: Paar-Challenge. Geteilt werden NUR Kennzahlen (Trainingstage, Schritte,
-- Gewichtsveränderung in %), nie einzelne Sätze oder Messungen.
-- =====================================================================================
create table if not exists public.partner_invites (
  code text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
alter table public.partner_invites enable row level security;
drop policy if exists "eigene Einladungen" on public.partner_invites;
create policy "eigene Einladungen" on public.partner_invites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users on delete cascade,
  user_b uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);
alter table public.partnerships enable row level security;
drop policy if exists "eigene Partnerschaft lesen" on public.partnerships;
create policy "eigene Partnerschaft lesen" on public.partnerships for select to authenticated
  using (auth.uid() in (user_a, user_b));

-- Partner der angemeldeten Person (oder null)
create or replace function public.my_partner() returns uuid
language sql stable security definer set search_path = public as $$
  select case when user_a = auth.uid() then user_b else user_a end
  from partnerships where auth.uid() in (user_a, user_b) limit 1;
$$;

create or replace function public.create_invite() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if public.my_partner() is not null then raise exception 'Es gibt schon eine Challenge.'; end if;
  delete from partner_invites where user_id = auth.uid();
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into partner_invites (code, user_id) values (c, auth.uid());
  return c;
end $$;

create or replace function public.accept_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare inv partner_invites;
begin
  select * into inv from partner_invites where code = upper(trim(p_code)) and expires_at > now();
  if inv is null then raise exception 'Code ungültig oder abgelaufen.'; end if;
  if inv.user_id = auth.uid() then raise exception 'Das ist dein eigener Code.'; end if;
  if public.my_partner() is not null then raise exception 'Du hast schon eine Challenge.'; end if;
  insert into partnerships (user_a, user_b) values (least(inv.user_id, auth.uid()), greatest(inv.user_id, auth.uid()));
  delete from partner_invites where user_id = inv.user_id;
end $$;

create or replace function public.end_partnership() returns void
language sql security definer set search_path = public as $$
  delete from partnerships where auth.uid() in (user_a, user_b);
$$;

-- Kennzahlen einer Woche (Montag = p_week_start) für mich und den Partner
create or replace function public.challenge_week(p_week_start date)
returns table (user_id uuid, display_name text, is_me boolean, training_days int, steps bigint, weight_change_pct numeric)
language sql stable security definer set search_path = public as $$
  with people as (
    select auth.uid() as uid
    union
    select public.my_partner() where public.my_partner() is not null
  )
  select
    p.uid,
    (select pr.display_name from profiles pr where pr.id = p.uid and pr.deleted_at is null),
    p.uid = auth.uid(),
    (select count(distinct (s.performed_at at time zone 'Europe/Zurich')::date)::int
       from sets s join exercises e on e.id = s.exercise_id
      where s.user_id = p.uid and s.deleted_at is null and not s.is_warmup and e.kind <> 'sauna'
        and (s.performed_at at time zone 'Europe/Zurich')::date >= p_week_start
        and (s.performed_at at time zone 'Europe/Zurich')::date < p_week_start + 7),
    (select coalesce(sum(d.steps), 0) from daily_steps d
      where d.user_id = p.uid and d.deleted_at is null and d.day >= p_week_start and d.day < p_week_start + 7),
    (select case when prev.w is null or cur.w is null or prev.w = 0 then null
                 else round((cur.w - prev.w) / prev.w * 100, 2) end
       from (select avg(b.weight_kg) w from body_metrics b where b.user_id = p.uid and b.deleted_at is null and b.weight_kg is not null
               and (b.measured_at at time zone 'Europe/Zurich')::date >= p_week_start and (b.measured_at at time zone 'Europe/Zurich')::date < p_week_start + 7) cur,
            (select avg(b.weight_kg) w from body_metrics b where b.user_id = p.uid and b.deleted_at is null and b.weight_kg is not null
               and (b.measured_at at time zone 'Europe/Zurich')::date >= p_week_start - 7 and (b.measured_at at time zone 'Europe/Zurich')::date < p_week_start) prev)
  from people p;
$$;

grant execute on function public.my_partner(), public.create_invite(), public.accept_invite(text), public.end_partnership(), public.challenge_week(date) to authenticated;

-- =====================================================================================
-- Etappe 6b: Push-Benachrichtigungen
-- =====================================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "eigene Abos" on public.push_subscriptions;
create policy "eigene Abos" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Protokoll, damit jede Erinnerung nur einmal pro Fall kommt (nur für Edge Functions)
create table if not exists public.notify_log (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  ref text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);
alter table public.notify_log enable row level security;

-- =====================================================================================
-- Etappe 5: Withings (Tokens nur für Edge Functions lesbar: RLS an, keine Policy)
-- =====================================================================================
create table if not exists public.withings_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  withings_userid text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  last_meas_update bigint not null default 0,
  last_sync timestamptz,
  last_error text
);
alter table public.withings_tokens enable row level security;

create table if not exists public.withings_states (
  state text primary key,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.withings_states enable row level security;

-- Für die App: nur sehen, ob Withings verbunden ist (ohne Tokens)
create or replace function public.withings_status()
returns table (connected boolean, last_sync timestamptz, last_error text)
language sql stable security definer set search_path = public as $$
  select true, t.last_sync, t.last_error from withings_tokens t where t.user_id = auth.uid()
  union all
  select false, null, null where not exists (select 1 from withings_tokens where user_id = auth.uid())
  limit 1;
$$;
grant execute on function public.withings_status() to authenticated;

create or replace function public.withings_disconnect() returns void
language sql security definer set search_path = public as $$
  delete from withings_tokens where user_id = auth.uid();
$$;
grant execute on function public.withings_disconnect() to authenticated;

-- =====================================================================================
-- Zeitpläne (erst ausführen, wenn die Edge Functions laufen; siehe docs/WITHINGS-UND-PUSH.md)
-- Platzhalter <PROJEKT> und <CRON_SECRET> ersetzen.
-- =====================================================================================
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select cron.schedule('bena-stuendlich', '5 * * * *', $$
--   select net.http_post(url := 'https://<PROJEKT>.supabase.co/functions/v1/notify',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'), body := '{}'::jsonb);
--   select net.http_post(url := 'https://<PROJEKT>.supabase.co/functions/v1/withings-sync',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'), body := '{}'::jsonb);
-- $$);
-- =====================================================================================
-- Familien-Geräte: Beim Anlegen eines Geräts können Geräte übernommen werden, die ein
-- anderes Familienmitglied im gleichen Studio (gleicher Name) angelegt hat.
-- Übernommen werden Name, Art, Muskelgruppe und Foto – nie Einstellungen, Notizen oder Sätze.
-- "Familie" = alle Konten dieses Projekts (eine öffentliche Registrierung gibt es nicht).
-- =====================================================================================
create or replace function public.family_exercises(p_gym_name text)
returns table (id uuid, name text, kind text, muscle_group text, photo_path text, owner_name text)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.kind, e.muscle_group, e.photo_path,
         coalesce((select pr.display_name from profiles pr where pr.id = e.user_id and pr.deleted_at is null), 'Familie')
  from exercises e
  join gyms g on g.id = e.gym_id and g.deleted_at is null
  where e.user_id <> auth.uid()
    and auth.uid() is not null
    and e.deleted_at is null and not e.archived
    and lower(trim(g.name)) = lower(trim(p_gym_name))
  order by e.name;
$$;
grant execute on function public.family_exercises(text) to authenticated;

-- Gerätefotos dürfen alle angemeldeten Familienmitglieder ansehen (nur lesen)
drop policy if exists "Familie darf Fotos lesen" on storage.objects;
create policy "Familie darf Fotos lesen" on storage.objects for select to authenticated
  using (bucket_id = 'photos');
  using (bucket_id = 'photos');

-- Studio-Bilder der Familie: Bild eines gleichnamigen Studios eines anderen Familienmitglieds
-- (wird angezeigt, wenn man selbst kein Bild gesetzt hat). Neuestes Bild gewinnt.
create or replace function public.family_gym_photos()
returns table (gym_name text, photo_path text)
language sql stable security definer set search_path = public as $$
  select distinct on (lower(trim(g.name))) g.name, g.photo_path
  from gyms g
  where g.user_id <> auth.uid() and auth.uid() is not null
    and g.deleted_at is null and g.photo_path is not null
  order by lower(trim(g.name)), g.updated_at desc;
$$;
grant execute on function public.family_gym_photos() to authenticated;
