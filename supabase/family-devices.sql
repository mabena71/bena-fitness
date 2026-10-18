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
