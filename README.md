# BenaFit – Fitness-Tagebuch

Web-App (PWA): Geräte, Gewichte und Wiederholungen im eigenen Fitnessstudio festhalten, dazu Körpergewicht, Fett, Schritte, Statistik,
Rekorde, Level und Rückblicke. Sie läuft im Browser am PC und auf Android (auf den
Startbildschirm legen).

Online: https://mabena71.github.io/bena-fitness/

Stand: **Etappen 1, 2 und 4 fertig, dazu Sauna.** Etappe 3 (Login und Sync über Supabase) ist
eingebaut, aber ausgeschaltet, solange `js/config.js` leer ist. Einrichtung:
`docs/SUPABASE-EINRICHTEN.md`. Offene Punkte stehen in `TODO.md`.

## Starten (am PC)

Im Projektordner:

```
python -m http.server 8000 --bind 127.0.0.1
```

Dann im Browser `http://localhost:8000` öffnen, „Demo ausprobieren“ (Beispieldaten aus
10 Wochen) oder „Eigenes Tagebuch starten“ (leer, mit den drei Studios).

`file://` funktioniert nicht, weil die Module einen Webserver brauchen.

## Tests

`http://localhost:8000/tests.html` prüft die Rechenlogik (Trainings, Rekorde, Geister,
Comeback, 7-Tage-Schnitt, Level, Statistik, Standort, Sauna) und den Abgleich mit zwei Geräten
gegen einen simulierten Server (`js/tests-sync.js`). Erwartet wird: „Alle 44 Tests bestanden“.

## Aufbau

| Datei | Zweck |
|---|---|
| `index.html`, `styles.css` | Seitengerüst und Design (Handy einspaltig, PC mit Seitenleiste) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Betrieb und Installation als App |
| `js/app.js` | Start, Modus (Demo/lokal), Router (`#/…`) |
| `js/db.js` | Lokale Datenbank (IndexedDB) mit Outbox für den späteren Sync |
| `js/data.js` | Daten-Schnappschuss, Meldungen zu neuen Abzeichen und Level-Aufstiegen |
| `js/stats.js` | Reine Rechenfunktionen: Trainings, Rekorde, Geister, Comeback, Körper, Statistik, Rückblicke |
| `js/rewards.js` | Erfahrungspunkte, Level, Abzeichen |
| `js/fun.js` | Lustige Vergleiche („so schwer wie 25 Autos“) |
| `js/demo.js` | Beispieldaten für den Demo-Modus |
| `js/sync.js`, `js/config.js` | Login und Abgleich mit Supabase (Etappe 3) |
| `js/geo.js` | Standort-Erkennung der Studios |
| `js/icons.js` | Linien-Icons |
| `js/backup.js` | Datensicherung |
| `supabase/schema.sql` | Tabellen, Zugriffsregeln, Foto-Speicher |
| `js/views/*.js` | Ein Bildschirm pro Datei |

## Regeln, die man kennen sollte

- **Training** = alle Sätze am selben Tag im selben Studio. Liegen mehr als 3 Stunden
  dazwischen, beginnt ein neues Training. Übungen ohne Studio („Überall“) zählen zum
  Studio-Training am selben Tag.
- **Rekord:** mehr Gewicht oder, beim gleichen Gewicht, mehr Wiederholungen (bei Cardio:
  weitere Distanz). Der allererste Trainingstag setzt nur die Basis. Aufwärmsätze zählen nie.
- **Körper-Rekord:** neuer Bestwert des 7-Tage-Schnitts, höchstens einer pro Woche und
  Wert. Erfolg heisst weniger Gewicht, weniger Fett, mehr Muskeln.
- **Sauna:** Ein Gang wird mit Minuten erfasst. Sauna zählt nicht als Training, Volumen oder
  Rekord und hat eine eigene Statistik.
- **Sync:** Alles wird zuerst lokal gespeichert. Die Outbox wird hochgeladen, danach holt die App
  alles mit `synced_at` > letztem Abruf. Bei Konflikten gewinnt die jüngere Änderung.
- **Comeback:** ab 14 Tagen Pause an einem Gerät wird das Gewicht um 10 % tiefer
  vorgeschlagen, ab 28 Tagen um 20 %.
- Studio-Logos sind **nicht** im Code enthalten (fremde Marke, öffentliches Repo). Jede
  Person lädt das Bild selbst über „⋯“ im Studio hoch.
