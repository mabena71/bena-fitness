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
