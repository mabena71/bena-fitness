# To-do Fitness-App

Aufwand in Minuten = Schätzung. Modell = Empfehlung für den jeweiligen Auftrag.
App: https://mabena71.github.io/bena-fitness/ · Repo: https://github.com/mabena71/bena-fitness

## Offen

| Nr | Thema | Details | Wer | Modell | Aufwand (Min.) | Prio | Status | Abhängig von |
|---|---|---|---|---|---|---|---|---|
| 1 | Studio-Test | App auf dem Handy neu laden, installieren, „Eigenes Tagebuch starten“, Checkliste abarbeiten, Feedback mit Screenshots | Maurice | — | 60 | hoch | offen | — |
| 2 | Studio-Logos und -Standorte | In jedem Studio: Logo/Bild hochladen (⋯) und „Standort hier speichern“ | Maurice | — | 10 | mittel | offen | 1 |
| 3 | Feedback einarbeiten | Anpassungen nach dem Studio-Test | Claude | Sonnet | 60 | hoch | offen | 1 |
| 4 | Supabase einrichten | `docs/SUPABASE-EINRICHTEN.md`: Konto, Projekt, schema.sql, Benutzer Maurice + Sabine (+ Remy), URL + anon key an Claude | Maurice | — | 20 | hoch | offen | — |
| 5 | Etappe 3 einschalten | `js/config.js` füllen, online stellen, gemeinsamer Test Handy ↔ PC, Datenübernahme vom Handy | Claude + Maurice | Opus | 30 | hoch | offen | 4 |
| 6 | Sabine (und Remy) einrichten | App auf dem eigenen Handy öffnen, mit eigenem Konto anmelden | Sabine, Remy | — | 10 | hoch | offen | 5 |
| 7 | Withings-Entwicklerkonto | `docs/WITHINGS-UND-PUSH.md` Teil A (Freigabe eventuell einige Tage) | Maurice | — | 15 | mittel | offen | 4 |
| 8 | Withings und Push einschalten | Secrets, Edge Functions bereitstellen, Zeitplan (Teile B–F), VAPID_PUBLIC_KEY in `js/config.js`, Test auf den Handys | Claude + Maurice | Opus | 45 | mittel | offen | 5, 7 |
| 9 | Paar-Challenge testen | Maurice erzeugt Code, Sabine tritt bei, Wochenwertung prüfen | Maurice + Sabine | — | 10 | niedrig | offen | 6 |
| 10 | Später/optional | Pausen-Timer, Steigerungs-Vorschlag, Ziele, Trainingspläne, Sprach-Eingabe | — | Sonnet | — | niedrig | Idee | — |

## Erledigt

| Nr | Thema | Details | Wer | Modell | Datum |
|---|---|---|---|---|---|
| E1 | Planung | Funktionsumfang, Etappen, Datenmodell | Maurice + Claude | Opus | 17.10.2026 |
| E2 | Etappe 1: Kern | Studios, Übungen aller Arten, Gerätefotos, Einstellungen, Laufweg (optional), Sätze mit Gefühl/Aufwärmen, Geister-Training, Comeback-Hilfe, Energie-Check, Verlauf und Diagramm | Claude | Opus | 17.10.2026 |
| E3 | Etappe 2: Auswertung | Rekorde, Statistik, Körper mit 7-Tage-Schnitt, Rekorden und Belohnungen, Schritte, Level, Abzeichen, lustige Vergleiche, Monats- und Jahresrückblick, CSV-Export | Claude | Opus | 17.10.2026 |
| E4 | Studio-Bilder und App-Symbol | Logo/Bild pro Studio, sachliches BENA-Symbol | Claude | Opus | 17.10.2026 |
| E5 | Online gestellt | GitHub-Repo und GitHub Pages | Maurice + Claude | Opus | 17.10.2026 |
| E6 | Datensicherung | Sicherung inkl. Fotos herunterladen und einspielen, dauerhafter Speicher | Claude | Opus | 17.10.2026 |
| E7 | Icons und Diagramm | Linien-Icons statt Emojis; Umschalter Gewicht · Volumen · Wiederholungen | Claude | Opus | 17.10.2026 |
| E8 | Etappe 4: Standort | Standort pro Studio speichern, automatisches Öffnen im Umkreis von ca. 150 m | Claude | Opus | 17.10.2026 |
| E9 | Sauna | Bio-Sauna, Dampfbad, Hot-Sauna im Win4; eigene Statistik; zählt nicht als Training | Claude | Opus | 17.10.2026 |
| E10 | Etappe 3 gebaut | Supabase-Schema, Login, Konto-Modus, automatischer Abgleich, Datenübernahme; mit simuliertem Server getestet | Claude | Opus | 17.10.2026 |
| E11 | Etappe 6a gebaut | Paar-Challenge: Einladungscode, Wochenduell, Kronen-Bilanz (nur Kennzahlen geteilt) | Claude | Opus | 17.10.2026 |
| E12 | Etappe 6b gebaut | Push-Abo, Service Worker, Edge Function `notify` (Wochenbilanz, Erinnerungen) | Claude | Opus | 17.10.2026 |
| E13 | Etappe 5 gebaut | Edge Functions `withings-auth` und `withings-sync`, Einstellungen „Withings verbinden“ | Claude | Opus | 17.10.2026 |
| E14 | Anleitungen | `docs/SUPABASE-EINRICHTEN.md`, `docs/WITHINGS-UND-PUSH.md`, Schlüssel-Seite `tools/schluessel.html` | Claude | Opus | 17.10.2026 |
| E15 | Tests | `tests.html`: 45 automatische Tests | Claude | Opus | 17.10.2026 |

## Rückfragen

- Soll Remy mitmachen? Falls ja: Paar-Challenge zu einer **Familien-Challenge** für drei erweitern?
- Soll die App einen anderen Namen bekommen (z. B. „BENA Fitness“ statt „Fitness-Tagebuch“)?
