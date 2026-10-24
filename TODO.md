# TODO – BENA Fit

Leitstelle und Arbeitsweise: [LEITSTELLE.md](LEITSTELLE.md) · App: https://mabena71.github.io/bena-fitness/ · Demo: https://mabena71.github.io/bena-fitness/?demo · Repo: https://github.com/mabena71/bena-fitness
Aufwand = Schätzung in Minuten · Modell = empfohlenes Claude-Modell (Opus = knifflig, Sonnet = Routine, Haiku = Kleinigkeiten, – = Aufgabe von Maurice, Sabine oder Remy)
Übersicht als Seite: Artifact «To-do BENA Fit» https://claude.ai/artifact/3w2zoeas6bpthwQcZBHSdZ, Quelle `docs/todo-uebersicht.html` (gleiches Design wie Roundabout Hunter; von Hand nachführen und gleiche Datei neu veröffentlichen, nach jedem Statuswechsel). Tokens messen: `python scripts/tokens_zaehlen.py`.

## Grundsatzentscheid 20.10.2026

BENA Fit soll später in den Google Play Store und den Apple App Store, ist also **keine reine Familien-App**. Als Zwischenschritt gibt Maurice die App jetzt an Freunde weiter. Familienspezifisches fällt weg (vor allem «Aus Familien-Geräten wählen»): Jeder erfasst seine Geräte und Studios selbst, alles so generisch wie möglich. Bestehende Daten von Maurice, Sabine und Remy bleiben unangetastet.

## Offene Punkte

| Nr | Phase | Thema | Details | Wer | Modell | Aufwand | Prio | Status | Abhängig von |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | Studio-Test | Geräte mit Foto anlegen, Sätze erfassen, Flugmodus, Sauna, Standort speichern; Feedback mit Screenshots. Erster Teil erledigt (Standort gespeichert, Sauna erfasst) | Maurice | – | 60 | hoch | in Arbeit | – |
| 2 | 1 | Feedback einarbeiten | Anpassungen nach dem Studio-Test | Claude | Sonnet | 60 | hoch | laufend | 1 |
| 3 | 1 | Sabine und Remy anmelden | Sabine ist angemeldet (Name fehlt noch), Remy hat sich angemeldet; Claude prüft danach in der Datenbank | Sabine, Remy | – | 10 | hoch | in Arbeit | – |
| 19 | 1 | Withings für Sabine | Sabine verbindet unter Mehr → Withings ihr eigenes Konto (Uhr und Waage); Werte ab 11.10.2026 | Sabine | – | 5 | hoch | offen | 3 |
| 26 | 2 | Anmeldung für Freunde: Durchtest | Alles eingerichtet (Einladungscode, Registrierung mit E-Mail-Bestätigung, deutsche Mails über Brevo von info@benaapps.ch, Passwort vergessen, Konto löschen). Maurice testet einmal mit einer Zweitadresse: Code unter Mehr erstellen → Link im privaten Fenster → registrieren → Mail bestätigen; danach «Passwort vergessen» und mit dem Testkonto «Konto löschen» | Maurice | – | 15 | hoch | offen | – |
| 28 | 2 | Withings auf Production | Entwickler-App «BENA Fit» von Development auf Production stellen; Bedingungen für neue Konten (Withings+, Nutzerzahl) prüfen | Maurice + Claude | Sonnet | 20 | mittel | offen | – |
| 6 | 3 | Push einschalten | Erledigt: Function `notify` bereitgestellt, pg_cron/pg_net an, Secrets VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT und CRON_SECRET gespeichert, öffentlicher Schlüssel in `js/config.js` (Version 2026.10.22-2), Zeitplan-SQL `supabase/push-zeitplan.sql` bereit. Offen: Maurice legt das CRON_SECRET im Tresor ab (`select vault.create_secret('…', 'cron_secret')`), dann spielt die Leitstelle den Zeitplan ein, Maurice schaltet unter Mehr Benachrichtigungen ein, Test-Push | Maurice + Claude | Opus | 15 | mittel | wartet auf Tresor | – |
| 29 | 3 | Freundes-Challenge | Paar-Challenge verallgemeinern: mehrere Personen per Einladungscode, sichtbar nur Kennzahlen (keine Sätze, Fotos oder Körperwerte im Detail) | Claude | Opus | 60 | mittel | offen | 26 |
| 7 | 3 | Challenge testen | Code erzeugen, beitreten, Wochenwertung prüfen (mit Sabine und einem Freund) | Maurice + Sabine | – | 10 | niedrig | offen | 29 |
| 8 | 3 | Erholungs-Karte | Körper-Grafik: welche Muskeln Pause brauchen (rot/grün), Vorschlag «Heute ideal: …» (Empfehlung) | Claude | Opus | 60 | mittel | Idee | – |
| 9 | 3 | Maximalkraft-Schätzung | Geschätztes 1-Wiederholungs-Maximum pro Gerät (Epley) als Diagramm-Option und Rekord (Empfehlung) | Claude | Sonnet | 30 | mittel | Idee | – |
| 10 | 3 | Rekord als Bild teilen | Rekord/Monatsrückblick als Bild, Teilen per WhatsApp (Web Share API) (Empfehlung) | Claude | Sonnet | 40 | mittel | Idee | – |
| 11 | 3 | Kalorien-Schätzung | Ungefährer Verbrauch pro Training, Cardio, Sauna (MET-Werte) | Claude | Sonnet | 30 | niedrig | Idee | – |
| 12 | 3 | Gewichts-Prognose | «Bei diesem Tempo erreichst du X kg etwa im …» | Claude | Sonnet | 20 | niedrig | Idee | – |
| 13 | 3 | Freundes-Feed | Umgedeutet (vorher Familien-Feed): freiwillig Rekorde/Abzeichen der Challenge-Freunde, «Daumen hoch» | Claude | Opus | 90 | niedrig | Idee | 29 |
| 17 | 4 | Sprachauswahl D/E/F/I | App auf Deutsch, Englisch, Französisch und Italienisch; Wahl pro Person unter Mehr → Profil; alle Texte in Sprachdateien auslagern, Datums- und Zahlenformate pro Sprache (Wunsch Maurice 19.10.; wegen Stores höher priorisiert 20.10.) | Claude | Sonnet | 120 | mittel | Idee | 25 |
| 30 | 4 | Store-Paket | App für Google Play und Apple App Store verpacken (z. B. Capacitor wie Roundabout Hunter Nr. 43/44), Store-Einträge, Bilder, Konten bei Google (25 USD einmalig) und Apple (99 USD/Jahr) | Claude + Maurice | Opus | 240 | niedrig | Idee | 26, 27 |
| 16 | 4 | Weitere Ideen | Pausen-Timer, Steigerungs-Vorschlag, Ziele, Trainingspläne, Sprach-Eingabe, Fortschrittsfotos, PIN, «bester Schritte-Tag» anzeigen | – | Sonnet | – | niedrig | Idee | – |

**Gestrichen am 20.10.2026** (Grundsatzentscheid, familienspezifisch): Nr. 4 Familien-Geräte testen, Nr. 14 Ins-Studio-Meldung an die Familie, Nr. 15 Gerät defekt melden (nur mit gemeinsamen Geräten sinnvoll). Nr. 13 umgedeutet zum Freundes-Feed.

## Erledigt

| Nr | Thema | Details | Erledigt am |
|---|---|---|---|
| E50 | Name BenaFit | App heisst jetzt «BenaFit» (Entscheid Maurice 22.10.): Titel, Handy-Symbol (Manifest), Texte, Datenschutz, Absender der Mails; Logo mit «BENA FIT» bleibt. Version 2026.10.22-1 | 22.10.2026 |
| E49 | Anmeldung für Freunde eingerichtet | Registrierung nur mit Einladungscode (Trigger `invites_redeem`, Probelauf ohne Code abgelehnt), Mehr → Freunde einladen, Passwort vergessen/ändern, Konto löschen (Function `delete-account`); Supabase: Site-/Redirect-URLs, Brevo-SMTP (info@benaapps.ch, Name BenaFit, Schlüssel «Supabase BenaFit» bis 22.10.2027), Mails «E-Mail bestätigen» und «Neues Passwort» auf Deutsch, Registrierung mit E-Mail-Bestätigung EIN (Nr. 26, Arbeitssitzung Opus) | 22.10.2026 |
| E48 | Datenschutz und Impressum | Öffentliche Seite `datenschutz.html` (revDSG/DSGVO, Gesundheitsdaten, Fremddienste, Rechte), Angaben wie Roundabout Hunter: Maurice Bena (Privatperson), 8405 Winterthur, info@benaapps.ch; verlinkt im Login, Willkommen und unter Mehr (Nr. 27). Version 2026.10.21-4 | 21.10.2026 |
| E47 | Tagesspruch | Statt «Hallo …» oben jeden Tag ein anderer motivierender Spruch (200 eigene Sprüche, höchstens 2 Zeilen, für alle gleich pro Tag, `js/sprueche.js`) (Idee Maurice 21.10.). Version 2026.10.21-3 | 21.10.2026 |
| E46 | Schritte-Ziel auf der Startseite | Knopf «Ziel» neben «Eintragen» in der Schritte-Karte mit Schnellwahl 6'000–15'000 und eigenem Wert; Feld unter Mehr → Profil entfällt (Nr. 31, Wunsch Maurice 21.10.). Version 2026.10.21-2 | 21.10.2026 |
| E45 | App generisch gemacht | Familien-Funktionen entfernt («Aus Familien-Geräten wählen», gemeinsame Studio-Bilder; in Supabase Policy «Familie darf Fotos lesen» und RPCs `family_exercises`, `family_gym_photos` gelöscht), keine fest eingebauten Studios mehr: neue Nutzer legen beim Erststart ihr Studio an (optional mit Saunen), Demo mit City Gym, Seeblick, Parkclub, neutrale Texte (Nr. 23–25, Arbeitssitzung Sonnet). Version 2026.10.21-2 | 21.10.2026 |
| E44 | «Seit Beginn» richtig | Körper-Kachel und Abzeichen −1 … −10 kg rechnen jetzt erste gegen letzte Messung (Maurice: 93.4 → 88.5 = −4.9 kg statt −1.3 kg mit Wochenschnitten); Withings-Hinweis auf der Körper-Seite aktualisiert. Version 2026.10.21-1 | 21.10.2026 |
| E43 | Startseite: Standort-Knopf und Erdkugel | Knopf «Studio per Standort finden» steht jetzt unter der Studio-Liste; «Überall» zeigt eine farbige Erdkugel statt der Linien-Weltkugel (Wahl Maurice 20.10., Variante G). Version 2026.10.20-10 | 20.10.2026 |
| E42 | Neue Version am Handy angesehen | Version 2026.10.20-8 läuft; Startseite, Erfolge, «Fotografieren» und Farbstift gut. Wünsche: Knopf «Studio per Standort finden» weiter nach unten und anderes Symbol für «Überall» (siehe E43) (Nr. 20) | 20.10.2026 |
| E41 | Daten exportieren: alles oder nichts | Statt drei CSV-Knöpfen (Trainings, Körper, Schritte) ein Knopf «Alle Daten exportieren»: eine Excel-Datei mit je einem Blatt (SheetJS 0.18.5 von cdnjs, wird erst beim Export geladen). Export und Datensicherung in einer Karte «Daten» zusammengelegt (Wunsch Maurice 20.10.) | 20.10.2026 |
| E40 | Standort-Karte im Studio verständlicher | «Studio per Standort erkennen / Hier speichern» → «Automatisch öffnen: Bist du gerade in diesem Studio? Dann speichere hier den Standort …» mit Knopf «Standort speichern»; gespeichert: «Öffnest du die App hier, springt sie direkt zu «Win4»» (Frage Maurice 20.10.) | 20.10.2026 |
| E39 | Startseite neu geordnet | Körper → Schritte → Studios (darüber «Diese Woche: 2 Trainings · 1 Sauna · 4.3 t», Tipp öffnet Statistik) → «Erfolge & Rekorde» in einer Karte (Level, 3 letzte Rekorde, neueste Abzeichen, Fast geschafft); Karte «Aktivität» entfällt (Variante a). PC: Körper und Schritte nebeneinander, Studios und Erfolge über die ganze Breite (Entscheid Maurice 20.10.) | 20.10.2026 |
| E38 | Bildeffekte A und B | Auswahl im Geräte-Formular nur noch «Farbstift» (Variante A, ganzes Bild als Farbzeichnung, sofort, ohne Download) und «Gerät hervorgehoben» (Variante B); Rückfall bei zu langem Freistellen ist jetzt Farbstift (Entscheid Maurice 20.10.) | 20.10.2026 |
| E37 | Freistellen auf dem Handy | Laufende Anzeige «Gerät wird erkannt … 23 s», Abbruch nach 3 Minuten mit Bleistift-Zeichnung als Rückfall, Speichern wartet auf das fertige Bild (auf dem Handy blieb das Bild grau mit «…»). Grafikchip (WebGPU) geprüft: mit der Bibliothek in aktuellem Chrome nicht nutzbar | 20.10.2026 |
| E36 | Heute erledigte Geräte grün | In der Studio-Ansicht grüner Rahmen, grüner Name und Stempel «✓ heute 3 Sätze» ab dem ersten Arbeitssatz (Aufwärmen allein zählt nicht; Entscheid Maurice 20.10.; Nr. 22) | 20.10.2026 |
| E35 | Gerät hervorgehoben | Neue Darstellung der Gerätefotos (Variante B, Wahl Maurice 20.10.): Gerät farbig als Foto, Umgebung als Bleistiftzeichnung; Freistellen im Browser (einmalig ca. 40 MB Download, Modell «small»). Wahl Foto · Bleistift · Gerät hervorgehoben im Geräte-Formular, Standard «Gerät hervorgehoben». Originalfoto wird ab jetzt mitgespeichert (`<id>-orig`), damit die Darstellung jederzeit wechselbar ist; bestehende Fotos umstellbar, sofern noch farbig gespeichert | 20.10.2026 |
| E34 | Vorbelegung Satz für Satz | Der n-te Satz heute bekommt die Werte des n-ten Satzes vom letzten Trainingstag (inkl. Aufwärmsatz mit Haken); mehr Sätze als letztes Mal → letzter Arbeitssatz von heute; Comeback-Abschlag gilt für alle Sätze (Wunsch Maurice 20.10.) | 20.10.2026 |
| E33 | Rekorde ab 8 Wiederholungen | Bei Geräten und freien Gewichten zählt ein Satz erst ab 8 Wiederholungen als Rekord bzw. Bestwert (Eigengewicht ohne Zusatzgewicht, Cardio und Sauna wie bisher). Bisherige Rekorde werden neu berechnet (Wunsch Maurice 20.10.) | 20.10.2026 |
| E32 | Vorbelegung: erster Satz vom letzten Mal | Neuer Tag: Gewicht und Wiederholungen des ersten Satzes vom letzten Trainingstag, auch wenn es ein Aufwärmsatz war (Haken «Aufwärmsatz» dann gesetzt); am gleichen Tag weiter mit dem letzten Arbeitssatz von heute; Comeback-Abschlag bleibt (Nr. 21, Wunsch Maurice 20.10.) | 20.10.2026 |
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

## Reihenfolge (Vorschlag 20.10.2026, nach Grundsatzentscheid)

1. Am Handy und im Studio weiter (Nr. 20, 1), Feedback laufend (Nr. 2)
2. Generisch machen in einer Arbeitssitzung: Familien-Funktionen entfernen (Nr. 23), eigenes Studio (Nr. 24), allgemeine Texte (Nr. 25)
3. Für Freunde öffnen: Datenschutz (Nr. 27), Anmeldung (Nr. 26), parallel Withings auf Production (Nr. 28)
4. Push (Nr. 6) und Freundes-Challenge (Nr. 29), dann testen (Nr. 7)
5. Motivation (Nr. 8–12), Sprachen (Nr. 17), Store-Paket (Nr. 30)

## Rückfragen

- App-Name «BENA Fit» auch für die Stores?
- PIN für die App gewünscht? («Passwort ändern» gibt es seit 22.10. unter Mehr → Konto)

## Kosten (ohne Claude)

| Dienst | Wofür | Plan | Bisher bezahlt | Laufend | Beleg |
|---|---|---|---|---|---|
| GitHub | Code und Hosting (GitHub Pages) | Free | CHF 0 | 0 | – |
| Supabase | Datenbank, Login, Fotos, Edge Functions (Irland) | Free | CHF 0 | 0 (Pro 25 USD/Monat, falls nötig) | – |
| Withings | Schnittstelle für Gewicht, Fett, Schritte | Public API, gratis | CHF 0 | 0 | – |
| Brevo | Mails für Bestätigung und Passwort (gleiches Konto wie Roundabout Hunter) | Free (300 Mails/Tag) | CHF 0 | 0 | – |
| Schriften und Bibliotheken | IBM Plex Sans (Google Fonts), Chart.js, supabase-js | frei | CHF 0 | 0 | – |
| Google Play | Store-Konto (geplant, Nr. 30) | einmalig | CHF 0 | 25 USD einmalig | – |
| Apple Developer | Store-Konto (geplant, Nr. 30) | jährlich | CHF 0 | 99 USD/Jahr | – |
| **Total** | | | **CHF 0** | **CHF 0** | |

## Phasen

| Phase | Name | Inhalt |
|---|---|---|
| 1 | Im Alltag | Am Handy und im Studio testen, Feedback einarbeiten, Sabine und Remy, Withings |
| 2 | Für Freunde | Familienspezifisches entfernen, eigenes Studio, Anmeldung, Datenschutz, Withings Production |
| 3 | Push und Motivation | Benachrichtigungen, Freundes-Challenge, Erholung, Maximalkraft, Teilen, Kalorien, Prognose |
| 4 | Stores | Sprachen, Store-Paket, weitere Ideen |
