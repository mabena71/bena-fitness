# To-do Fitness-App

Aufwand in Minuten = Schätzung. Modell = Empfehlung für den jeweiligen Auftrag.
App: https://mabena71.github.io/bena-fitness/ · Repo: https://github.com/mabena71/bena-fitness

## Offen

| Nr | Thema | Details | Wer | Modell | Aufwand (Min.) | Prio | Status | Abhängig von |
|---|---|---|---|---|---|---|---|---|
| 1 | Studio-Test | App auf dem Handy neu laden, installieren, „Eigenes Tagebuch starten“, Checkliste abarbeiten, Feedback mit Screenshots | Maurice | — | 60 | hoch | offen | — |
| 2 | Studio-Logos und -Standorte | In jedem Studio: Logo/Bild hochladen (⋯) und „Standort hier speichern“ | Maurice | — | 10 | mittel | offen | 1 |
| 3 | Feedback einarbeiten | Anpassungen nach dem Studio-Test | Claude | Sonnet | 60 | hoch | offen | 1 |
| 4 | Supabase einrichten | Anleitung: `docs/SUPABASE-EINRICHTEN.md` (Konto, Projekt, schema.sql, Benutzer Maurice + Sabine, URL + anon key an Claude) | Maurice | — | 20 | hoch | offen | — |
| 5 | Etappe 3 einschalten | `js/config.js` füllen, online stellen, gemeinsamer Test Handy ↔ PC, Datenübernahme vom Handy | Claude + Maurice | Opus | 30 | hoch | offen | 4 |
| 6 | Sabine einrichten | Sabine öffnet die App auf ihrem Handy und meldet sich mit ihrem Konto an | Sabine | — | 10 | hoch | offen | 5 |
| 7 | Withings-Entwicklerkonto | App bei Withings registrieren (Freigabe eventuell einige Tage), Anleitung folgt | Maurice | — | 20 | mittel | offen | 5 |
| 8 | Etappe 5: Withings | OAuth, Edge Function, nächtlicher Import von Gewicht/Fett/Muskeln (beide) und Schritten (Sabine, ggf. Maurice) | Claude | Opus | 120 | mittel | offen | 7 |
| 9 | Etappe 6: Paar-Challenge | Einladungscode, Wochenduell nur mit Kennzahlen (`challenge_week()`), Kronen-Bilanz | Claude | Opus | 60 | niedrig | offen | 6 |
| 10 | Etappe 6: Push | Wochen-Push am Sonntag, Erinnerungen (5 Tage kein Training, 7 Tage nicht gewogen) | Claude | Opus | 60 | niedrig | offen | 5 |
| 11 | Später/optional | Pausen-Timer, Steigerungs-Vorschlag, Ziele, Trainingspläne, Sprach-Eingabe | — | Sonnet | — | niedrig | Idee | — |

## Erledigt

| Nr | Thema | Details | Wer | Modell | Datum |
|---|---|---|---|---|---|
| E1 | Planung | Funktionsumfang, Etappen, Datenmodell | Maurice + Claude | Opus | 17.10.2026 |
| E2 | Etappe 1: Kern | Studios, Übungen aller Arten, Gerätefotos, Einstellungen, Laufweg (optional), Sätze mit Gefühl/Aufwärmen, Geister-Training, Comeback-Hilfe, Energie-Check, Verlauf und Diagramm | Claude | Opus | 17.10.2026 |
| E3 | Etappe 2: Auswertung | Rekorde, Statistik, Körper mit 7-Tage-Schnitt, Rekorden und Belohnungen, Schritte, Level, Abzeichen, lustige Vergleiche, Monats- und Jahresrückblick, CSV-Export | Claude | Opus | 17.10.2026 |
| E4 | Studio-Bilder | Logo/Bild pro Studio hochladen | Claude | Opus | 17.10.2026 |
| E5 | App-Symbol | Sachliches BENA-Symbol mit Hantel | Claude | Opus | 17.10.2026 |
| E6 | Online gestellt | GitHub-Repo und GitHub Pages | Maurice + Claude | Opus | 17.10.2026 |
| E7 | Datensicherung | Sicherung inkl. Fotos herunterladen und einspielen, dauerhafter Speicher | Claude | Opus | 17.10.2026 |
| E8 | Professionelle Icons | Linien-Icons statt Emojis, Energie-Check als Skala 1–5 | Claude | Opus | 18.10.2026 |
| E9 | Geräte-Diagramm | Umschalter Gewicht · Volumen · Wiederholungen mit beschrifteter Skala | Claude | Opus | 18.10.2026 |
| E10 | Etappe 4: Standort | Standort pro Studio speichern, automatisches Öffnen im Umkreis von ca. 150 m | Claude | Opus | 18.10.2026 |
| E11 | Sauna | Bio-Sauna, Dampfbad, Hot-Sauna im Win4; Gänge mit Minuten; eigene Statistik, Abzeichen, Rückblick; zählt nicht als Training | Claude | Opus | 18.10.2026 |
| E12 | Etappe 3 vorbereitet | Supabase-Schema, Login, Konto-Modus, automatischer Abgleich, Datenübernahme; mit simuliertem Server getestet (dabei einen Offline-Fehler gefunden und behoben); noch ausgeschaltet | Claude | Opus | 18.10.2026 |
| E13 | Tests | `tests.html`: 44 automatische Tests (Rechenlogik, Standort, Sauna, Abgleich mit zwei Geräten) | Claude | Opus | 18.10.2026 |

## Rückfragen

- Soll die App einen anderen Namen bekommen (z. B. „BENA Fitness“ statt „Fitness-Tagebuch“)?
- Sollen Saunagänge auch auf dem Startbildschirm (Monatskarte) erscheinen?
