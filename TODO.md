# To-do BENA Fit

Aufwand in Minuten = Schätzung. Modell = Empfehlung für den jeweiligen Auftrag.
App: https://mabena71.github.io/bena-fitness/ · Demo: https://mabena71.github.io/bena-fitness/?demo · Repo: https://github.com/mabena71/bena-fitness

## Offen

| Nr | Thema | Details | Wer | Modell | Aufwand (Min.) | Prio | Status | Abhängig von |
|---|---|---|---|---|---|---|---|---|
| 1 | Studio-Test | Geräte mit Foto anlegen, Sätze erfassen, Flugmodus, Sauna, Standort speichern; Feedback mit Screenshots | Maurice | — | 60 | hoch | offen | — |
| 2 | Feedback einarbeiten | Anpassungen nach dem Studio-Test | Claude | Sonnet | 60 | hoch | offen | 1 |
| 3 | Sabine und Remy anmelden | App installieren, mit eigenem Konto anmelden; Claude prüft danach in der Datenbank | Sabine, Remy | — | 10 | hoch | offen | — |
| 4 | Familien-Geräte testen | Remy/Sabine: „Aus Familien-Geräten wählen“ im Win4; Studio-Logos erscheinen | Sabine, Remy | — | 10 | mittel | offen | 3 |
| 6 | Push einschalten | Schlüssel-Seite, VAPID-Secrets, Edge Function `notify`, Zeitplan (pg_cron, CRON_SECRET über Vault), VAPID_PUBLIC_KEY in `js/config.js`, Test | Claude + Maurice | Opus | 45 | mittel | offen | — |
| 7 | Challenge testen | Code erzeugen, beitreten, Wochenwertung prüfen | Maurice + Sabine | — | 10 | niedrig | offen | 3 |
| 8 | Erholungs-Karte | Körper-Grafik: welche Muskeln Pause brauchen (rot/grün), Vorschlag „Heute ideal: …“ (Empfehlung) | Claude | Opus | 60 | mittel | Idee | — |
| 9 | Maximalkraft-Schätzung | Geschätztes 1-Wiederholungs-Maximum pro Gerät (Epley) als Diagramm-Option und Rekord (Empfehlung) | Claude | Sonnet | 30 | mittel | Idee | — |
| 10 | Rekord als Bild teilen | Rekord/Monatsrückblick als Bild, Teilen per WhatsApp (Web Share API) (Empfehlung) | Claude | Sonnet | 40 | mittel | Idee | — |
| 11 | Kalorien-Schätzung | Ungefährer Verbrauch pro Training, Cardio, Sauna (MET-Werte) | Claude | Sonnet | 30 | niedrig | Idee | — |
| 12 | Gewichts-Prognose | „Bei diesem Tempo erreichst du X kg etwa im …“ | Claude | Sonnet | 20 | niedrig | Idee | — |
| 13 | Familien-Feed | Freiwillig: Rekorde/Abzeichen der anderen, „Daumen hoch“ | Claude | Opus | 90 | niedrig | Idee | 3 |
| 14 | Ins-Studio-Meldung | „Ich gehe jetzt ins Win4“ als Benachrichtigung an die Familie | Claude | Opus | 45 | niedrig | Idee | 6 |
| 15 | Gerät defekt melden | Gerät als defekt/gesperrt markieren, Familie sieht es im gleichen Studio | Claude | Sonnet | 30 | niedrig | Idee | — |
| 16 | Weitere Ideen | Pausen-Timer, Steigerungs-Vorschlag, Ziele, Trainingspläne, Sprach-Eingabe, Familien-Challenge für 3, Fortschrittsfotos, PIN, „Passwort ändern“ | — | Sonnet | — | niedrig | Idee | — |
| 17 | Sprachauswahl | App auf Deutsch, Englisch, Französisch und Italienisch; Wahl pro Person unter Mehr → Profil; alle Texte in Sprachdateien auslagern, Datums- und Zahlenformate pro Sprache | Claude | Sonnet | 120 | niedrig | Idee | — |

## Erledigt

| Nr | Thema | Details | Wer | Modell | Datum |
|---|---|---|---|---|---|
| E1 | Planung | Funktionsumfang, Etappen, Datenmodell | Maurice + Claude | Opus | 17.10.2026 |
| E2 | Etappe 1: Kern | Studios, Übungen aller Arten, Gerätefotos, Einstellungen, Laufweg, Sätze mit Gefühl/Aufwärmen, Geister-Training, Comeback-Hilfe, Energie-Check, Verlauf und Diagramm | Claude | Opus | 17.10.2026 |
| E3 | Etappe 2: Auswertung | Rekorde, Statistik, Körper mit 7-Tage-Schnitt, Schritte, Level, Abzeichen, lustige Vergleiche, Monats- und Jahresrückblick, CSV-Export | Claude | Opus | 17.10.2026 |
| E4 | Online gestellt | GitHub-Repo und GitHub Pages | Maurice + Claude | Opus | 17.10.2026 |
| E5 | Datensicherung | Sicherung inkl. Fotos herunterladen und einspielen, dauerhafter Speicher | Claude | Opus | 17.10.2026 |
| E6 | Etappe 4: Standort | Standort pro Studio, automatisches Öffnen im Umkreis von ca. 150 m (+ GPS-Toleranz) | Claude | Opus | 17.10.2026 |
| E7 | Sauna | Bio-Sauna, Dampfbad, Hot-Sauna im Win4; eigene Statistik; zählt nicht als Training | Claude | Opus | 17.10.2026 |
| E8 | Etappen 5 und 6 gebaut | Withings-Import, Paar-Challenge, Push (noch nicht eingeschaltet) | Claude | Opus | 17.10.2026 |
| E9 | Design | Name BENA Fit, Farbwelt „Modern“ (Nachtblau + Blau), IBM Plex Sans, Symbol mit Hantel, Logo in der Kopfzeile | Maurice + Claude | Opus | 18.10.2026 |
| E10 | Etappe 3 eingeschaltet | Supabase-Projekt „bena-fit“, Schema, Registrierung aus, Login und Abgleich laufen; Konten für Maurice, Sabine, Remy | Maurice + Claude | Opus | 18.10.2026 |
| E11 | Familien-Geräte | Geräte anderer übernehmen (Name, Art, Muskelgruppe, Foto); Studio-Logos für die ganze Familie | Claude | Opus | 18.10.2026 |
| E12 | Activfitness-Logos | Logo als PNG bereitgestellt (nicht im Repo), von Maurice bei allen Studios hochgeladen | Maurice + Claude | Opus | 18.10.2026 |
| E13 | Tests | `tests.html`: 45 automatische Tests | Claude | Opus | 18.10.2026 |
| E20 | Withings | Entwicklerkonto, Edge Functions, Verbindung für Maurice; Werte ab 11.10.2026; Abruf beim Öffnen (alle 15 Min.); Handy-Schritte über Minutenwerte | Claude + Maurice | Opus | 18.10.2026 |
| E21 | Kleinigkeiten | Sauna zählt als Studiobesuch, Kalender auf schmalen Handys, veraltete „bald“-Texte, Knopf „Fotografieren“ mit Kamera | Claude | Opus | 19.10.2026 |
| E22 | Schritte-Ziel | Karte auf der Startseite (Ring, Serie „Tage in Folge“ ohne Joker, Woche), Ziel pro Person änderbar, Abzeichen für Serien, Zieltage, perfekte Woche, +20 Punkte pro Zieltag | Claude | Opus | 19.10.2026 |

## Rückfragen

- Familien-Challenge für drei Personen (mit Remy)?
- PIN für die App und „Passwort ändern“ in der App gewünscht?
