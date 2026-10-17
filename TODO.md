# To-do Fitness-App

Aufwand in Minuten = Schätzung. Modell = Empfehlung für den jeweiligen Auftrag.

## Offen

| Nr | Thema | Details | Wer | Modell | Aufwand (Min.) | Prio | Status | Abhängig von |
|---|---|---|---|---|---|---|---|---|
| 1 | Demo testen | `http://localhost:8000` am PC öffnen, Demo durchklicken, Feedback zu Bedienung und Texten | Maurice | — | 30 | hoch | offen | — |
| 2 | Studio-Logos bereitlegen | Active-Fit-Logos bzw. Fotos der drei Studios aufs Handy/den PC speichern, um sie in der App hochzuladen | Maurice | — | 10 | mittel | offen | — |
| 3 | Supabase-Konto | Konto und Projekt anlegen (kostenlos), Region Zürich/Frankfurt. Ich führe Schritt für Schritt | Maurice | — | 20 | hoch | offen | 1 |
| 4 | GitHub-Konto und Repo | Konto anlegen bzw. nutzen und ein leeres Repo `fitness` erstellen, für die Adresse der App | Maurice | — | 15 | hoch | offen | — |
| 5 | Etappe 3: Cloud | `supabase/schema.sql` (Tabellen, RLS, Foto-Bucket), Login, Sync und Offline-Warteschlange, Übernahme der lokalen Daten | Claude | Opus | 120 | hoch | offen | 3 |
| 6 | Benutzer anlegen | Im Supabase-Dashboard Benutzer für Maurice und Sabine anlegen, URL und anon key durchgeben | Maurice | — | 10 | hoch | offen | 5 |
| 7 | Online stellen | Push auf GitHub und Pages einschalten (das erste Hochladen bestätigt Maurice) | Claude | Sonnet | 20 | hoch | offen | 4, 5 |
| 8 | Test auf den Handys | App auf beiden Android-Handys öffnen, auf den Startbildschirm legen, offline im Studio testen | Maurice + Sabine | — | 30 | hoch | offen | 7 |
| 9 | Etappe 4: Standort | „Standort dieses Studios speichern“ und automatisches Öffnen im Umkreis von ca. 150 m | Claude | Sonnet | 30 | mittel | offen | 7 |
| 10 | Standort vor Ort | In jedem Studio einmal „Standort speichern“ tippen und testen | Maurice | — | 10 | mittel | offen | 9 |
| 11 | Withings-Entwicklerkonto | App bei Withings registrieren (Freigabe dauert eventuell einige Tage) | Maurice | — | 20 | mittel | offen | 7 |
| 12 | Etappe 5: Withings | OAuth, Edge Function, nächtlicher Import von Gewicht/Fett/Muskeln (beide) und Schritten (Sabine, ggf. Maurice) | Claude | Opus | 120 | mittel | offen | 11 |
| 13 | Etappe 6: Paar-Challenge | Einladungscode, Wochenduell nur mit Kennzahlen (`challenge_week()`), Kronen-Bilanz | Claude | Opus | 60 | niedrig | offen | 6 |
| 14 | Etappe 6: Push | Wochen-Push am Sonntag, Erinnerungen (5 Tage kein Training, 7 Tage nicht gewogen) | Claude | Opus | 60 | niedrig | offen | 7 |
| 15 | Später/optional | Pausen-Timer, Steigerungs-Vorschlag, Ziele, Trainingspläne, Sprach-Eingabe | — | Sonnet | — | niedrig | Idee | — |

## Erledigt

| Nr | Thema | Details | Wer | Modell | Datum |
|---|---|---|---|---|---|
| E1 | Planung | Funktionsumfang, Etappen, Datenmodell (siehe Plan) | Maurice + Claude | Opus | 17.10.2026 |
| E2 | Etappe 1: Kern | Studios, Übungen aller Arten, Gerätefotos, Einstellungen, Laufweg (optional), Sätze mit Gefühl/Aufwärmen, Geister-Training, Comeback-Hilfe, Energie-Check, Verlauf und Diagramm | Claude | Opus | 17.10.2026 |
| E3 | Etappe 2: Auswertung | Rekorde, Statistik, Körper mit 7-Tage-Schnitt, Rekorden und Belohnungen, Schritte, Level, Abzeichen, lustige Vergleiche, Monats- und Jahresrückblick, CSV-Export | Claude | Opus | 17.10.2026 |
| E4 | Studio-Bilder | Logo/Bild pro Studio hochladen (Liste und Studio-Ansicht) | Claude | Opus | 17.10.2026 |
| E5 | App-Symbol | Sachliches BENA-Symbol mit Hantel (Variante D) | Claude | Opus | 17.10.2026 |
| E6 | Tests | `tests.html` mit 23 Tests der Rechenlogik, Test im Browser (Handy- und PC-Ansicht) | Claude | Opus | 17.10.2026 |

## Rückfragen

- Soll die App einen anderen Namen bekommen (z. B. „BENA Fitness“ statt „Fitness-Tagebuch“)?
- Möchtest du die App schon vor Etappe 3 auf dem Handy ausprobieren? Das geht im
  gleichen WLAN über die IP des PCs, ohne Offline-Betrieb (dafür ist HTTPS nötig). Dazu
  müsste der Server für das Heimnetz freigegeben werden.
