-- =====================================================================================
-- Nr. 26 Anmeldung für Freunde: Registrierung nur mit Einladungscode.
-- Angemeldete Personen erzeugen Codes (8 Zeichen, einmal verwendbar, 14 Tage gültig).
-- Erzwungen wird der Code in der Datenbank: Ein Trigger auf auth.users löst ihn beim Anlegen
-- des Kontos ein. Fehlt der Code oder ist er ungültig, bricht das Anlegen ab (gleiche
-- Transaktion, also nichts halb gespeichert) – egal ob über die App oder direkt über die API.
-- Bestehende Konten sind nicht betroffen (der Trigger läuft nur beim Anlegen neuer Konten).
-- Dieses Skript ist mehrfach ausführbar. Ablauf siehe docs/ANMELDUNG.md.
-- =====================================================================================

create table if not exists public.invites (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references auth.users on delete set null,
  used_at timestamptz,
  used_name text
);
create index if not exists invites_created_by on public.invites (created_by);

-- Lesen nur die eigenen Einladungen; Anlegen, Einlösen und Zurückziehen nur über die Funktionen unten
alter table public.invites enable row level security;
drop policy if exists "eigene Einladungen lesen" on public.invites;
create policy "eigene Einladungen lesen" on public.invites for select to authenticated
  using (created_by = auth.uid());

-- Neuen Code erzeugen (höchstens 10 offene pro Person)
create or replace function public.create_signup_invite()
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
  b bytea;
  i int;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  -- alte, nie verwendete Codes aufräumen
  delete from invites where created_by = auth.uid() and used_at is null and invites.expires_at < now() - interval '30 days';
  if (select count(*) from invites where created_by = auth.uid() and used_at is null and invites.expires_at > now()) >= 10 then
    raise exception 'Du hast schon 10 offene Einladungen. Zieh zuerst eine zurück.';
  end if;
  loop
    b := gen_random_bytes(8);
    c := '';
    for i in 0..7 loop
      c := c || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);  -- 256 / 32: gleich verteilt
    end loop;
    exit when not exists (select 1 from invites where invites.code = c);
  end loop;
  insert into invites (code, created_by) values (c, auth.uid());
  return query select i2.code, i2.expires_at from invites i2 where i2.code = c;
end $$;

-- Eigene Einladungen (neueste zuerst)
create or replace function public.my_signup_invites()
returns table (code text, created_at timestamptz, expires_at timestamptz, used_at timestamptz, used_name text)
language sql stable security definer set search_path = public as $$
  select i.code, i.created_at, i.expires_at, i.used_at, i.used_name
  from invites i where i.created_by = auth.uid()
  order by i.created_at desc limit 50;
$$;

-- Offenen Code zurückziehen
create or replace function public.revoke_signup_invite(p_code text) returns void
language sql security definer set search_path = public as $$
  delete from invites where code = upper(trim(p_code)) and created_by = auth.uid() and used_at is null;
$$;

-- Vorprüfung in der Registrierung (für eine verständliche Meldung; erzwungen wird im Trigger).
-- Gibt nur 'ok', 'unbekannt', 'verwendet' oder 'abgelaufen' zurück, nie wer eingeladen hat.
create or replace function public.check_signup_invite(p_code text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case when i.used_at is not null then 'verwendet'
                 when i.expires_at <= now() then 'abgelaufen'
                 else 'ok' end
       from invites i where i.code = upper(regexp_replace(coalesce(p_code, ''), '[[:space:]_.-]', '', 'g'))),
    'unbekannt');
$$;

revoke execute on function public.create_signup_invite(), public.my_signup_invites(), public.revoke_signup_invite(text) from public, anon;
grant execute on function public.create_signup_invite(), public.my_signup_invites(), public.revoke_signup_invite(text) to authenticated;
grant execute on function public.check_signup_invite(text) to anon, authenticated;

-- Einlösen beim Anlegen eines Kontos. Code und Vorname kommen aus signUp(options.data):
-- { invite_code: 'ABCD2345', first_name: 'Alex' }. Ohne gültigen Code: Fehler → kein Konto.
create or replace function public.redeem_signup_invite() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c text := upper(regexp_replace(coalesce(new.raw_user_meta_data->>'invite_code', ''), '[[:space:]_.-]', '', 'g'));
begin
  update invites
     set used_by = new.id, used_at = now(), used_name = left(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), 40)
   where code = c and used_at is null and expires_at > now();
  if not found then
    raise exception 'Einladungscode fehlt, ist ungültig, abgelaufen oder schon verwendet.' using errcode = 'P0001';
  end if;
  return null;
end $$;
revoke execute on function public.redeem_signup_invite() from public, anon, authenticated;

drop trigger if exists invites_redeem on auth.users;
create trigger invites_redeem after insert on auth.users
  for each row execute function public.redeem_signup_invite();

-- Kontrolle: muss genau eine Zeile «invites_redeem» zeigen
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'invites_redeem';
