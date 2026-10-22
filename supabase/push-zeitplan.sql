-- =====================================================================================
-- Zeitplan für Push (Nr. 6) und nächtlichen Withings-Abruf (pg_cron + pg_net).
-- Das CRON_SECRET liegt im Supabase-Tresor (Vault, Name «cron_secret») und wird erst beim Aufruf
-- gelesen – es steht weder hier noch in der Tabelle cron.job. Der anon key ist öffentlich (js/config.js);
-- er wird mitgeschickt, weil bei «notify» Verify JWT eingeschaltet ist.
-- Beide Functions prüfen die Uhrzeit (Zürich) selbst: notify sendet So 19 Uhr die Wochenbilanz und
-- täglich 18 Uhr Erinnerungen, withings-sync holt einmal pro Nacht um 4 Uhr.
-- Mehrfach ausführbar.
-- =====================================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.call_edge_function(p_name text, p_body jsonb default '{}'::jsonb)
returns bigint language sql security definer set search_path = public as $$
  select net.http_post(
    url := 'https://slvrawfomzgmyytzdnfx.supabase.co/functions/v1/' || p_name,
    body := p_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdnJhd2ZvbXpnbXl5dHpkbmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyODQ1ODYsImV4cCI6MjEwNzg2MDU4Nn0.6gjonj0VKiW2O1h-TG4oq08_-vaSfCtzkXDD-65g-lA',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    timeout_milliseconds := 60000
  );
$$;
revoke execute on function public.call_edge_function(text, jsonb) from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('benafit-notify', 'benafit-withings');
select cron.schedule('benafit-notify', '0 * * * *', $$select public.call_edge_function('notify')$$);
select cron.schedule('benafit-withings', '5 * * * *', $$select public.call_edge_function('withings-sync')$$);

select jobname, schedule, active from cron.job where jobname like 'benafit-%' order by jobname;
