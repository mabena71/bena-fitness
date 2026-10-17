# Withings und Benachrichtigungen einrichten (Etappen 5 und 6)

**Voraussetzung:** Supabase ist eingerichtet ([SUPABASE-EINRICHTEN.md](SUPABASE-EINRICHTEN.md)) und
der Login funktioniert. Dauer etwa 30 Minuten. Claude kann dich Schritt für Schritt begleiten.

In der Anleitung steht `<PROJEKT>` für die Kennung deines Supabase-Projekts, also den Teil
vor `.supabase.co` in der Project URL.

---

## A. Withings-Entwicklerkonto (Freigabe kann einige Tage dauern, darum früh beginnen)
1. https://developer.withings.com öffnen und mit deinem **normalen Withings-Konto** anmelden.
2. Im **Developer Dashboard** auf **Create an application** klicken und **Public API integration** wählen.
3. Ausfüllen:
   - Application name: `BENA Fitness`
   - Description: `Privates Trainingstagebuch für Maurice und Sabine`
   - **Callback URL:** `https://<PROJEKT>.supabase.co/functions/v1/withings-auth`
   - Environment: *Production* (für den privaten Gebrauch reicht das)
4. Speichern. Notiere die **Client ID** und das **Client Secret**. Das Secret ist geheim, du trägst es
   nur in Supabase ein (Schritt C).

## B. Schlüssel für Benachrichtigungen erzeugen
1. https://mabena71.github.io/bena-fitness/tools/schluessel.html öffnen und auf
   **Schlüssel erzeugen** klicken.
2. Die Seite lassen wir offen. Die drei Werte brauchst du in Schritt C.
3. Den **VAPID_PUBLIC_KEY** (öffentlich) schickst du Claude, damit er in der App eingetragen wird.

## C. Secrets in Supabase eintragen
Supabase → **Edge Functions** → **Secrets** (bzw. *Manage secrets*) → für jede Zeile **Add new secret**:

| Name | Wert |
|---|---|
| `WITHINGS_CLIENT_ID` | Client ID aus A |
| `WITHINGS_CLIENT_SECRET` | Client Secret aus A |
| `WITHINGS_REDIRECT_URI` | `https://<PROJEKT>.supabase.co/functions/v1/withings-auth` |
| `APP_URL` | `https://mabena71.github.io/bena-fitness/` |
| `VAPID_PUBLIC_KEY` | aus B |
| `VAPID_PRIVATE_KEY` | aus B (geheim) |
| `VAPID_SUBJECT` | `mailto:` + deine E-Mail, z. B. `mailto:maurice@example.com` |
| `CRON_SECRET` | aus B (geheim) |

## D. Die drei Edge Functions bereitstellen
Für jede der drei Functions `withings-auth`, `withings-sync` und `notify`:
1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. **Name genau so** wie oben eingeben (z. B. `withings-auth`).
3. Den Inhalt der passenden Datei aus dem Repository einfügen:
   - https://github.com/mabena71/bena-fitness/blob/main/supabase/functions/withings-auth/index.ts
   - https://github.com/mabena71/bena-fitness/blob/main/supabase/functions/withings-sync/index.ts
   - https://github.com/mabena71/bena-fitness/blob/main/supabase/functions/notify/index.ts
4. Auf **Deploy** klicken.
5. In den Einstellungen der Function **Verify JWT** bzw. „Enforce JWT verification“ **ausschalten**.
   Die Functions prüfen das Login selbst. Nötig ist das, weil Withings und der Zeitplan ohne
   App-Login aufrufen.

## E. Zeitplan einschalten
1. Supabase → **Database** → **Extensions**: `pg_cron` und `pg_net` einschalten.
2. **SQL Editor** → New query, Folgendes einfügen, `<PROJEKT>` und `<CRON_SECRET>` ersetzen und
   dann auf **Run** klicken:

```sql
select cron.schedule('bena-stuendlich', '5 * * * *', $$
  select net.http_post(url := 'https://<PROJEKT>.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'), body := '{}'::jsonb);
  select net.http_post(url := 'https://<PROJEKT>.supabase.co/functions/v1/withings-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'), body := '{}'::jsonb);
$$);
```

Die Functions laufen jede Stunde kurz an, handeln aber nur zur richtigen Zeit: Withings holt die
Werte um 4 Uhr, die Erinnerungen kommen um 18 Uhr und die Wochenbilanz am Sonntag um 19 Uhr
(jeweils Zeit Zürich, Sommer- und Winterzeit automatisch).

## F. In der App einschalten (jede Person auf ihrem Handy)
1. App öffnen → **Mehr** → **Withings verbinden** → bei Withings anmelden → **Zulassen**. Danach kommst
   du zurück in die App, und die Werte werden sofort geholt.
2. **Mehr** → **Benachrichtigungen** → **Einschalten** → Erlauben.
3. Für die **Paar-Challenge**: **Erfolge** → **Paar-Challenge** → Maurice tippt auf „Code erzeugen“,
   Sabine gibt den Code ein.

## Wenn etwas nicht klappt
Unter Supabase → **Edge Functions** → Function wählen → **Logs** steht, was schiefging.
Einen Screenshot davon an Claude schicken.
