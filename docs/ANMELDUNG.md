# Anmeldung für Freunde (Nr. 26)

Registrierung nur mit Einladungscode, «Passwort vergessen», «Konto löschen». Stand 21.10.2026.

## Was die App macht

- **Mehr → Freunde einladen** (nur mit Konto): Knopf «Einladungscode erstellen» erzeugt einen Code wie `K7RM-3QXE` (8 Zeichen, ohne I, O, 0, 1), 14 Tage gültig, einmal verwendbar, höchstens 10 offene pro Person. Teilen über das Teilen-Menü des Handys (WhatsApp usw.), sonst wird der Text kopiert. Link: `https://mabena71.github.io/bena-fitness/#/login?code=K7RM3QXE`. Die Liste zeigt «offen, noch n Tage», «verwendet von <Vorname> am …» oder «abgelaufen»; offene Codes lassen sich zurückziehen.
- **Login**: «Ich habe einen Einladungscode» → Code, Vorname, E-Mail, Passwort (mind. 8 Zeichen). Der Einladungslink öffnet diese Ansicht direkt mit ausgefülltem Code (auch aus der Demo heraus). Ohne E-Mail-Bestätigung ist man sofort angemeldet; mit Bestätigung kommt zuerst eine Mail.
- **Passwort vergessen?** im Login → Mail mit Link → App öffnet «Neues Passwort» (`#/password`). Dieselbe Seite gibt es unter Mehr → Konto → «Passwort ändern».
- **Mehr → Konto löschen**: Hinweis auf «Alle Daten exportieren», Bestätigung durch Eintippen von LÖSCHEN, dann Edge Function `delete-account`. Danach Abmeldung, lokale Datenbank weg, zurück zum Willkommen.

## Wie der Code erzwungen wird (und warum so)

- **Trigger `invites_redeem` auf `auth.users` (AFTER INSERT)** in `supabase/invites.sql`. Er liest `invite_code` aus den Metadaten der Registrierung, löst den Code ein (`used_by`, `used_at`, `used_name`) und bricht mit Fehler ab, wenn kein gültiger, offener Code da ist. Weil der Trigger in **derselben Transaktion** wie das Anlegen des Kontos läuft, gibt es entweder Konto **und** eingelösten Code oder keines von beiden. Zwei gleichzeitige Registrierungen mit demselben Code: Nur eine gewinnt.
- Gilt für **jeden** Weg, ein Konto anzulegen (App, direkte API-Aufrufe mit dem öffentlichen anon key, Magic Link mit «create user»), weil alle in `auth.users` schreiben. Bestehende Konten sind nicht betroffen (der Trigger läuft nur bei neuen Zeilen).
- Für eine verständliche Meldung prüft die App den Code vorher mit `check_signup_invite(code)` (liefert nur `ok`, `unbekannt`, `verwendet` oder `abgelaufen`). Scheitert trotzdem etwas im Trigger, meldet Supabase «Database error saving new user»; die App übersetzt das in «Einladungscode ungültig, abgelaufen oder schon verwendet».
- **Warum nicht der Auth Hook «Before User Created»?** Den gibt es (auch im Free-Plan) und er kann eine eigene Fehlermeldung zurückgeben. Aber er läuft vor dem Anlegen, kennt die neue Benutzer-ID noch nicht und muss im Dashboard eingeschaltet bleiben; das Einlösen müsste trotzdem separat passieren. Der Trigger ist atomar, braucht keine Dashboard-Einstellung und kann nicht versehentlich ausgeschaltet werden. Die Vorprüfung ersetzt die schönere Meldung des Hooks.
- **Folge:** «Add user» bzw. «Invite user» im Supabase-Dashboard geht nicht mehr (kein Code). Braucht es doch einmal ein Konto von Hand: in der App selbst einen Code erzeugen und damit registrieren.

## Schritte für die Leitstelle in Supabase (in dieser Reihenfolge)

1. **SQL einspielen:** SQL Editor → Inhalt von `supabase/invites.sql` → Run. Das Ergebnis muss eine Zeile `invites_redeem` zeigen. (Setzt `family-devices.sql` voraus, das ist schon eingespielt.) **Muss vor Schritt 5 passieren**, sonst ist die Registrierung kurz offen für alle.
2. **Edge Function bereitstellen:** Edge Functions → neue Function `delete-account` → Code aus `supabase/functions/delete-account/index.ts` → Deploy. **Verify JWT AUS** (wie bei den anderen; die Function prüft das Login selbst). Keine Secrets nötig: `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` stellt Supabase in jeder Function selbst bereit.
3. **Adressen:** Authentication → URL Configuration
   - Site URL: `https://mabena71.github.io/bena-fitness/`
   - Redirect URLs: `https://mabena71.github.io/bena-fitness/**` und für Tests `http://localhost:8000/**` (bei Bedarf auch 8001–8003).
4. **Eigenen Mailversand einrichten** (siehe «E-Mail-Versand» unten): Authentication → Emails → SMTP Settings → «Enable custom SMTP», Zugangsdaten des Anbieters eintragen, Absender z. B. «BENA Fit». Danach unter Authentication → Rate Limits «Emails per hour» prüfen (Standard nach SMTP-Einrichtung 30/Std., reicht).
5. **Registrierung einschalten:** Authentication → Sign In / Providers → Email
   - «Allow new users to sign up»: **EIN** (je nach Dashboard-Version auch unter Authentication → Settings → User Signups).
   - «Confirm email»: **AUS, solange Schritt 4 nicht erledigt ist** (sonst kommt die Bestätigungs-Mail bei Freunden nie an und sie können sich nicht anmelden). Mit eigenem SMTP nach Wunsch EIN; die App kann beides.
   - «Minimum password length»: 8.
   - «Allow anonymous sign-ins»: AUS lassen.
6. **Mail-Vorlagen auf Deutsch:** Authentication → Emails → Templates (Link immer `{{ .ConfirmationURL }}` lassen):
   - *Confirm signup* – Betreff «BENA Fit: E-Mail bestätigen». Text: «Hallo {{ .Data.first_name }}, tippe auf den Link, um dein Konto bei BENA Fit zu bestätigen: <a href="{{ .ConfirmationURL }}">E-Mail bestätigen</a>. Hast du dich nicht registriert, kannst du diese Mail ignorieren.»
   - *Reset password* – Betreff «BENA Fit: Neues Passwort». Text: «Hallo, mit diesem Link kannst du ein neues Passwort für BENA Fit setzen: <a href="{{ .ConfirmationURL }}">Neues Passwort wählen</a>. Der Link gilt eine Stunde. Hast du nichts angefordert, ignoriere diese Mail.»
   - *Change email address* und *Magic link* braucht die App nicht.
7. **App hochladen** (Leitstelle): Beim Versionswechsel in `sw.js` die neuen Dateien in die Liste `SHELL` aufnehmen: `js/invite.js`, `js/views/password.js`, `js/views/settings-account.js` (sonst fehlen sie offline, bis sie einmal online geladen wurden).
8. **Ausprobieren** (mit einer eigenen Zweitadresse, nicht mit den Konten der Familie):
   1. Als Maurice unter Mehr einen Code erstellen → Link öffnen (privates Fenster) → registrieren → Code steht in der Liste als «verwendet von …».
   2. Denselben Code nochmals → Meldung «schon verwendet». Erfundener Code → «gibt es nicht».
   3. Abmelden → «Passwort vergessen?» → Mail → Link → neues Passwort → anmelden.
   4. Mit dem Testkonto ein Foto und eine Messung anlegen → Mehr → Konto löschen → in Supabase prüfen: keine Zeilen mit dieser `user_id`, kein Ordner `photos/<uid>/`, Benutzer weg (Edge Functions → delete-account → Logs zeigen «Konto gelöscht»).

**Zurück, falls nötig:** Registrierung im Dashboard wieder ausschalten genügt. Den Trigger entfernt `drop trigger if exists invites_redeem on auth.users;`.

## E-Mail-Versand: Befund

- **Der eingebaute Mailversand von Supabase reicht für Freunde nicht.** Er schickt nur an Adressen von Mitgliedern des Supabase-Teams (sonst Fehler «Email address not authorized»), höchstens **2 Mails pro Stunde**, ohne Zustellgarantie. Supabase empfiehlt ausdrücklich eigenes SMTP, sobald E-Mail-Anmeldung, Bestätigung oder Passwort-Reset genutzt werden. ([Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp))
- **Ohne eigenes SMTP:** Registrierung mit Code funktioniert trotzdem, wenn «Confirm email» AUS ist (keine Mail nötig). «Passwort vergessen» funktioniert dann nur für Maurice (Team-Mitglied), bei Freunden zeigt die App «Der E-Mail-Versand ist noch nicht eingerichtet …».
- **Kostenlose Anbieter** (Stand Oktober 2026, vor der Wahl kurz prüfen):
  - **Brevo** – Gratis-Plan rund 300 Mails pro Tag, Absender-Adresse per Mail bestätigen genügt für den Anfang; mit eigener Domain (SPF/DKIM) landen Mails seltener im Spam. Für den Start am einfachsten.
  - **Resend** – Gratis rund 3000 Mails pro Monat (100 pro Tag), braucht eine eigene Domain mit DNS-Einträgen.
  - **Gmail mit App-Passwort** (smtp.gmail.com, Port 587) – geht sofort mit einem eigenen Google-Konto, bis ca. 500 Mails pro Tag, Absender ist dann die Gmail-Adresse. Als Notlösung brauchbar, für Stores nicht ideal.
  - Weitere von Supabase genannte: AWS SES (sehr günstig, aufwendigere Einrichtung), Postmark, SendGrid, ZeptoMail.
- Für BENA Fit (wenige Dutzend Mails im Monat) reicht jeder Gratis-Plan. **Empfehlung:** Brevo mit einer eigens dafür angelegten Absender-Adresse; später für die Stores eine eigene Domain.

## Ungetestet (braucht den Server)

Alles, was Supabase braucht, ist nur gegen den Code geprüft, nicht live: Trigger und Funktionen in `invites.sql`, die Function `delete-account`, Registrierung, Bestätigungs- und Reset-Mails, Rücksprung mit Sitzung. Im Browser geprüft: Umschalten der Ansichten, Code aus dem Link, Prüfung des Code-Formats, Fehler-Rücksprung (abgelaufener Link), Demo unverändert, `tests.html` (59 bestanden).
