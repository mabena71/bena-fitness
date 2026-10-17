# BENA Fitness-Tagebuch

Web-App (PWA) für Maurice und Sabine: Geräte, Gewichte und Wiederholungen in den Studios
Bellevue, Archhöfe und Win4 festhalten, dazu Körpergewicht, Fett, Schritte, Statistik,
Rekorde, Level und Rückblicke. Sie läuft im Browser am PC und auf Android (auf den
Startbildschirm legen).

Stand: **Etappen 1–2 fertig**, die Daten liegen vorerst nur im jeweiligen Browser. Login und
Sync (Supabase) folgen in Etappe 3, siehe `TODO.md`.

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
Comeback, 7-Tage-Schnitt, Level, Statistik). Erwartet wird: „Alle 23 Tests bestanden“.

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
| `js/demo.js` | Beispieldaten und die Standard-Studios |
| `js/views/*.js` | Ein Bildschirm pro Datei |

## Regeln, die man kennen sollte

- **Training** = alle Sätze am selben Tag im selben Studio. Liegen mehr als 3 Stunden
  dazwischen, beginnt ein neues Training. Übungen ohne Studio („Überall“) zählen zum
  Studio-Training am selben Tag.
- **Rekord:** mehr Gewicht oder, beim gleichen Gewicht, mehr Wiederholungen (bei Cardio:
  weitere Distanz). Der allererste Trainingstag setzt nur die Basis. Aufwärmsätze zählen nie.
- **Körper-Rekord:** neuer Bestwert des 7-Tage-Schnitts, höchstens einer pro Woche und
  Wert. Erfolg heißt weniger Gewicht, weniger Fett, mehr Muskeln.
- **Comeback:** ab 14 Tagen Pause an einem Gerät wird das Gewicht um 10 % tiefer
  vorgeschlagen, ab 28 Tagen um 20 %.
- Studio-Logos sind **nicht** im Code enthalten (fremde Marke, öffentliches Repo). Jede
  Person lädt das Bild selbst über „⋯“ im Studio hoch.
