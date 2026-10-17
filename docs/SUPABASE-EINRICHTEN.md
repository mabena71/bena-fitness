# Supabase einrichten (Etappe 3)

Damit Handy und PC dieselben Daten haben und Sabine ihr eigenes Login bekommt. Dauer etwa
20 Minuten, kostenlos. Passwörter behältst du für dich, Claude braucht nur die
**Project URL** und den **anon/publishable key** aus Schritt 6.

## 1. Konto
1. https://supabase.com öffnen und auf **Start your project** klicken.
2. **Continue with GitHub** wählen (du bist dort schon angemeldet) und bestätigen.

## 2. Projekt anlegen
1. **New project** anklicken.
2. Name: `bena-fitness`
3. **Database Password**: auf „Generate“ klicken und das Passwort sicher aufbewahren
   (z. B. im Passwort-Manager). Claude braucht es nicht.
4. **Region**: *Central EU (Zurich)*, falls angeboten, sonst *Central EU (Frankfurt)*.
5. **Create new project** anklicken. Die Einrichtung dauert 1–2 Minuten.

## 3. Datenbank anlegen
1. Links auf **SQL Editor** klicken, dann auf **New query**.
2. Den ganzen Inhalt von
   https://github.com/mabena71/bena-fitness/blob/main/supabase/schema.sql
   kopieren (dort oben rechts auf „Copy raw file“) und einfügen.
3. Auf **Run** klicken. Erwartet wird: „Success. No rows returned“.

## 4. Registrierung abschalten
1. Links auf **Authentication** → **Sign In / Providers**.
2. **Email** muss eingeschaltet sein.
3. **Allow new users to sign up** ausschalten. So kann sich niemand Fremdes ein Konto anlegen.

## 5. Benutzer anlegen (Maurice und Sabine)
1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. E-Mail und Passwort eingeben, **Auto Confirm User** anhaken und dann auf **Create user** klicken.
3. Das Gleiche für Sabine wiederholen. Sabine kann ihr Passwort auch selbst wählen.

## 6. Zugangsdaten an Claude
1. Links auf **Project Settings** (Zahnrad) → **Data API** bzw. **API Keys**.
2. **Project URL** (sieht aus wie `https://abcd1234.supabase.co`) und den Schlüssel
   **anon / public** (oder „publishable“) kopieren und Claude schicken.
3. **Nicht** den Schlüssel `service_role` bzw. „secret“ schicken. Der bleibt geheim.

## Danach
Claude trägt die Werte in `js/config.js` ein und stellt die Version online. Dann:
1. App öffnen → „Mehr“ → **Mit Konto anmelden**.
2. Die App fragt, ob sie die bisherigen Daten dieses Geräts übernehmen soll → **Übernehmen**.
3. Am PC dieselbe Adresse öffnen und mit demselben Konto anmelden: Jetzt sind die Daten gleich.
