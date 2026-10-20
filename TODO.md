# TODO – BENA Fit

App: https://mabena71.github.io/bena-fitness/ · Demo: https://mabena71.github.io/bena-fitness/?demo · Repo: https://github.com/mabena71/bena-fitness
Aufwand = Schätzung in Minuten · Modell = empfohlenes Claude-Modell (Opus = knifflig, Sonnet = Routine, Haiku = Kleinigkeiten, – = Aufgabe von Maurice, Sabine oder Remy)
Übersicht als Seite: Artifact «To-do BENA Fit» https://claude.ai/artifact/3w2zoeas6bpthwQcZBHSdZ, Quelle `docs/todo-uebersicht.html` (gleiches Design wie Roundabout Hunter; von Hand nachführen und gleiche Datei neu veröffentlichen, nach jedem Statuswechsel). Tokens messen: `python scripts/tokens_zaehlen.py`.

## Offene Punkte

| Nr | Phase | Thema | Details | Wer | Modell | Aufwand | Prio | Status | Abhängig von |
|---|---|---|---|---|---|---|---|---|---|
| 20 | 1 | Neue Version am Handy ansehen | Startseite (Schritte-Karte, Aktivität, Erfolge, Level-Plakette), Erfolge (Abzeichen X von Y, Rang-Stufen), Knopf «Fotografieren» beim Gerätefoto | Maurice | – | 10 | hoch | offen | – |
| 1 | 1 | Studio-Test | Geräte mit Foto anlegen, Sätze erfassen, Flugmodus, Sauna, Standort speichern; Feedback mit Screenshots. Erster Teil erledigt (Standort gespeichert, Sauna erfasst) | Maurice | – | 60 | hoch | in Arbeit | – |
| 2 | 1 | Feedback einarbeiten | Anpassungen nach dem Studio-Test | Claude | Sonnet | 60 | hoch | laufend | 1 |
| 3 | 1 | Sabine und Remy anmelden | Sabine ist angemeldet (Name fehlt noch), Remy hat sich angemeldet; Claude prüft danach in der Datenbank | Sabine, Remy | – | 10 | hoch | in Arbeit | – |
| 19 | 1 | Withings für Sabine | Sabine verbindet unter Mehr → Withings ihr eigenes Konto (Uhr und Waage); Werte ab 11.10.2026 | Sabine | – | 5 | hoch | offen | 3 |
| 18 | 1 | Zeichnung: nur das Gerät | Hintergrund weiss statt Studio (Test mit Hintergrund-Entfernung im Browser gemacht: ca. 40–80 MB einmaliger Download, 20–60 s pro Foto). Entscheid Maurice offen | Maurice + Claude | Sonnet | 45 | mittel | Entscheid offen | – |
| 4 | 2 | Familien-Geräte testen | Remy/Sabine: «Aus Familien-Geräten wählen» im Win4; Studio-Logos erscheinen | Sabine, Remy | – | 10 | mittel | offen | 3 |
| 6 | 2 | Push einschalten | Schlüssel-Seite, VAPID-Secrets, Edge Function `notify`, Zeitplan (pg_cron, CRON_SECRET über Vault), VAPID_PUBLIC_KEY in `js/config.js`, Test; dann auch nächtlicher Withings-Abruf | Claude + Maurice | Opus | 45 | mittel | offen | – |
| 7 | 2 | Challenge testen | Code erzeugen, beitreten, Wochenwertung prüfen | Maurice + Sabine | – | 10 | niedrig | offen | 3 |
| 8 | 3 | Erholungs-Karte | Körper-Grafik: welche Muskeln Pause brauchen (rot/grün), Vorschlag «Heute ideal: …» (Empfehlung) | Claude | Opus | 60 | mittel | Idee | – |
| 9 | 3 | Maximalkraft-Schätzung | Geschätztes 1-Wiederholungs-Maximum pro Gerät (Epley) als Diagramm-Option und Rekord (Empfehlung) | Claude | Sonnet | 30 | mittel | Idee | – |
| 10 | 3 | Rekord als Bild teilen | Rekord/Monatsrückblick als Bild, Teilen per WhatsApp (Web Share API) (Empfehlung) | Claude | Sonnet | 40 | mittel | Idee | – |
| 11 | 3 | Kalorien-Schätzung | Ungefährer Verbrauch pro Training, Cardio, Sauna (MET-Werte) | Claude | Sonnet | 30 | niedrig | Idee | – |
| 12 | 3 | Gewichts-Prognose | «Bei diesem Tempo erreichst du X kg etwa im …» | Claude | Sonnet | 20 | niedrig | Idee | – |
| 13 | 2 | Familien-Feed | Freiwillig: Rekorde/Abzeichen der anderen, «Daumen hoch» | Claude | Opus | 90 | niedrig | Idee | 3 |
| 14 | 2 | Ins-Studio-Meldung | «Ich gehe jetzt ins Win4» als Benachrichtigung an die Familie | Claude | Opus | 45 | niedrig | Idee | 6 |
| 15 | 2 | Gerät defekt melden | Gerät als defekt/gesperrt markieren, Familie sieht es im gleichen Studio | Claude | Sonnet | 30 | niedrig | Idee | – |
| 17 | 4 | Sprachauswahl D/E/F/I | App auf Deutsch, Englisch, Französisch und Italienisch; Wahl pro Person unter Mehr → Profil; alle Texte in Sprachdateien auslagern, Datums- und Zahlenformate pro Sprache (Wunsch Maurice 19.10., Prio niedrig bestätigt) | Claude | Sonnet | 120 | niedrig | Idee | – |
| 16 | 4 | Weitere Ideen | Pausen-Timer, Steigerungs-Vorschlag, Ziele, Trainingspläne, Sprach-Eingabe, Familien-Challenge für 3, Fortschrittsfotos, PIN, «Passwort ändern», «bester Schritte-Tag» anzeigen | – | Sonnet | – | niedrig | Idee | – |

## Erledigt

| Nr | Thema | Details | Erledigt am |
|---|---|---|---|
| E31 | Level-Plakette | Blau mit Beschriftung «LEVEL», daneben nur der Rang (z. B. «Anfänger I») – Startseite und Erfolge. Version 2026.10.19-6 | 19.10.2026 |
| E30 | Erfolge-Seite | Abzeichen als «X von Y» mit Balken, aufklappbar «Erreicht» und «Noch offen» (mit Fortschritt, z. B. 8/10); Rang mit «Stufe 1 von 2» und Übersicht aller Ränge. Version 2026.10.19-5 | 19.10.2026 |
| E29 | Startseite neu geordnet | Karten Körper → Schritte → Aktivität (Woche gross, Monat klein, letztes Training) → Erfolge (Level, 3 neueste Abzeichen, «Fast geschafft»); Ränge mit Stufen (Neuling I–II … Legende). Version 2026.10.19-4 | 19.10.2026 |
| E28 | Schritte-Ziel | Karte mit Ring, Serie «Tage in Folge» (ohne Joker), Wochenpunkte; Ziel pro Person änderbar (Standard 10'000); Abzeichen für Serien 3–100 Tage, Zieltage 10–365, perfekte Woche; +20 Punkte pro Zieltag. Version 2026.10.19-3 | 19.10.2026 |
| E27 | Knopf «Fotografieren» | Gerätefoto: «Fotografieren» öffnet direkt die Kamera, «Aus Galerie» wählt ein Bild | 19.10.2026 |
| E26 | Kalender auf schmalen Handys | Leere Felder ohne Innenabstand, Seite lässt sich nicht mehr seitlich verschieben | 19.10.2026 |
| E25 | Veraltete Texte | «Mit Konto (bald)» ersetzt, Hinweis wenn ein Gerät nicht angemeldet ist | 19.10.2026 |
| E24 | Withings | Entwicklerkonto und App «BENA Fit», Edge Functions `withings-auth` und `withings-sync` bereitgestellt, Verbindung für Maurice; Werte ab 11.10.2026 (Diätbeginn, auch für Sabine); Abruf beim Öffnen (höchstens alle 15 Min.); Handy-Schritte über Minutenwerte; Sommer-/Winterzeit | 18.10.2026 |
| E23 | Sauna auf der Startseite | Saunagänge zählen als Studiobesuch («zuletzt heute (2 Saunagänge)»); ss statt ß in allen Texten | 18.10.2026 |
| E22 | Kategorien Push / Pull / Legs | Dazu Bauch/Rumpf, Cardio, Erholung; alte Muskelgruppen automatisch umgestellt | 18.10.2026 |
| E21 | Update-Hinweis | «Neue Version verfügbar – Jetzt aktualisieren»; `scripts/bump-version.py` vor jedem Hochladen | 18.10.2026 |
| E20 | Gerätefotos als Zeichnung | Bleistiftzeichnung schwarz-weiss, bisherige Fotos umwandelbar | 18.10.2026 |
| E19 | Demo aufgefrischt | Name Alex, neutrale Studio-Abzeichen, automatische Neuerzeugung; Direktlink `?demo` | 18.10.2026 |
| E18 | Familien-Geräte und Studio-Bilder | Geräte anderer übernehmen (Name, Art, Kategorie, Foto, ohne Einstellungen); Studio-Logos für die ganze Familie; Activfitness-Logos von Maurice hochgeladen (nicht im Repo) | 18.10.2026 |
| E17 | Etappe 3 eingeschaltet | Supabase-Projekt «bena-fit», Schema, Registrierung aus, Login und Abgleich laufen; Konten für Maurice, Sabine, Remy | 18.10.2026 |
| E16 | Design | Name BENA Fit, Farbwelt «Modern» (Nachtblau + Blau), IBM Plex Sans, Symbol mit Hantel, Logo in der Kopfzeile | 18.10.2026 |
| E15 | Etappen 5 und 6 gebaut | Withings-Import, Paar-Challenge, Push (Push noch nicht eingeschaltet) | 17.10.2026 |
| E14 | Sauna | Bio-Sauna, Dampfbad, Hot-Sauna im Win4; eigene Statistik; zählt nicht als Training | 17.10.2026 |
| E13 | Tests | `tests.html`: automatische Tests (Stand 19.10.: 50) inkl. Abgleich mit simuliertem Server | 17.10.2026 |
| E6 | Etappe 4: Standort | Standort pro Studio, automatisches Öffnen im Umkreis von ca. 150 m (+ GPS-Toleranz) | 17.10.2026 |
| E5 | Datensicherung | Sicherung inkl. Fotos herunterladen und einspielen, dauerhafter Speicher | 17.10.2026 |
| E4 | Online gestellt | GitHub-Repo und GitHub Pages | 17.10.2026 |
| E3 | Etappe 2: Auswertung | Rekorde, Statistik, Körper mit 7-Tage-Schnitt, Schritte, Level, Abzeichen, lustige Vergleiche, Monats- und Jahresrückblick, CSV-Export | 17.10.2026 |
| E2 | Etappe 1: Kern | Studios, Übungen aller Arten, Gerätefotos, Einstellungen, Laufweg, Sätze mit Gefühl/Aufwärmen, Geister-Training, Comeback-Hilfe, Energie-Check, Verlauf und Diagramm | 17.10.2026 |
| E1 | Planung | Funktionsumfang, Etappen, Datenmodell | 17.10.2026 |

## Reihenfolge (Vorschlag 20.10.2026)

1. Neue Version am Handy ansehen (Nr. 20), Studio-Test weiterführen (Nr. 1), Feedback einarbeiten (Nr. 2)
2. Familie dazuholen: Sabine und Remy (Nr. 3), Withings für Sabine (Nr. 19), Familien-Geräte (Nr. 4)
3. Push einschalten (Nr. 6), danach Challenge testen (Nr. 7)
4. Motivation ausbauen: Erholungs-Karte (Nr. 8), Maximalkraft (Nr. 9), Rekord teilen (Nr. 10)

## Rückfragen

- Zeichnung nur mit dem Gerät (Nr. 18): einbauen, trotz Download und Wartezeit?
- Familien-Challenge für drei Personen (mit Remy)?
- PIN für die App und «Passwort ändern» in der App gewünscht?

## Kosten (ohne Claude)

| Dienst | Wofür | Plan | Bisher bezahlt | Laufend | Beleg |
|---|---|---|---|---|---|
| GitHub | Code und Hosting (GitHub Pages) | Free | CHF 0 | 0 | – |
| Supabase | Datenbank, Login, Fotos, Edge Functions (Irland) | Free | CHF 0 | 0 (Pro 25 USD/Monat, falls nötig) | – |
| Withings | Schnittstelle für Gewicht, Fett, Schritte | Public API, gratis | CHF 0 | 0 | – |
| Schriften und Bibliotheken | IBM Plex Sans (Google Fonts), Chart.js, supabase-js | frei | CHF 0 | 0 | – |
| **Total** | | | **CHF 0** | **CHF 0** | |

## Phasen

| Phase | Name | Inhalt |
|---|---|---|
| 1 | Im Alltag | Am Handy und im Studio testen, Feedback einarbeiten, Familie anmelden, Withings |
| 2 | Familie und Push | Benachrichtigungen, Paar-Challenge, Familien-Geräte, Familien-Feed |
| 3 | Mehr Motivation | Erholung, Maximalkraft, Teilen, Kalorien, Prognose |
| 4 | Ausbau | Sprachen, weitere Ideen |
