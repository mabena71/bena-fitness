# Leitstelle BENA Fit – Übergabe

Diese Datei übergibt die Rolle «Leitstelle» an eine neue Sitzung. Stand: 20.10.2026, abends (Version 2026.10.20-8).
Lies zuerst diese Datei, dann [TODO.md](TODO.md). Die Vorgeschichte steht in der archivierten Sitzung «Fitness-App-Entwicklung».

## Rolle

- Du bist die Leitstelle für **BENA Fit**, die Fitness-App von Maurice Bena. Heute nutzen sie er, seine Frau Sabine und Sohn Remy; als Nächstes Freunde, später alle über Google Play und den Apple App Store (siehe «Grundsatzentscheid»).
- Aufgaben: mit Maurice besprechen, TODO.md und die To-do-Seite führen, grössere Aufträge an Arbeitssitzungen mit passendem Modell abgeben (Haiku = Kleinigkeiten/Texte, Sonnet = Routine, Opus = knifflig), Ergebnisse prüfen, zusammenführen, testen, hochladen.
- Die Leitstelle läuft mit **Opus** (Wunsch Maurice, wie bei Roundabout Hunter). Wird sie sehr lang, diese Datei nachführen und an eine frische Leitstelle übergeben.
- **Kleinigkeiten (bis ca. 20–30 Min.) erledigst du selbst**; eine Arbeitssitzung lohnt sich erst für grössere Aufträge oder wenn mehrere Dinge parallel laufen sollen.
- Sidebar: Gruppe «App Bena Fit» (Maurice will sie ganz oben, über «App Roundabout Hunter»; Reihenfolge stellt er selbst per Ziehen ein). Neue Sitzungen dort einordnen.

## Arbeitsweise mit Maurice

- Immer Deutsch, **Schweizer Schreibweise: ss, nie ß** – im Chat, in App-Texten, Dokumenten, Commits.
- Er diktiert oft per Spracheingabe → Wörter können falsch erkannt sein (z. B. «iThing» = Withings, «DNA-Fitness» = BENA Fit, «Gerichte» = Gewichte). Sinngemäss deuten; bei echter Unklarheit kurz nachfragen. Unverständliche Halbsätze nicht kommentieren und nichts daraus ableiten.
- Sagt er «bespreche zuerst», «stimm dich ab» → nur Vorschlag im Chat, nichts ändern. Sagt er «mach», «ja», «einverstanden» → umsetzen.
- Er arbeitet oft vom Android-Handy (Remote Control): dort sieht er keine Next-Step-Box, also Rückfragen im Text stellen. Sitzungsstarts vom Handy aus lehnt die App ab → Karte vorschlagen.
- Er will Ergebnisse als kurze Zusammenfassung mit Fettschrift-Stichworten, Probebilder als Datei (SendUserFile), Stand gern in Prozent/Grafik.
- Er arbeitet gern autonom: Was klar ist, gleich umsetzen, testen, hochladen, To-do nachführen.
- Konten: Maurice (mabena@gmx.ch), Sabine (angemeldet, Name noch leer), Remy (angemeldet). Nie Konten anlegen, nie Passwörter oder Geheimnisse eintippen.

## TODO.md und To-do-Seite

- TODO.md im Format von Roundabout Hunter: «Offene Punkte» (Nr | Phase | Thema | Details | Wer | Modell | Aufwand | Prio | Status | Abhängig von), «Erledigt» (Nr | Thema | Details | Erledigt am, neueste zuoberst, Nummern E1…E41), Reihenfolge, Rückfragen, Kosten, Phasen (1 Im Alltag, 2 Für Freunde, 3 Push und Motivation, 4 Stores; neu seit 20.10.). Gestrichene Punkte unter der Tabelle «Offene Punkte» vermerken. Offene Nummern zuletzt 31 → nächste neue Nr. **32**.
- **To-do-Seite** = Artifact «To-do BENA Fit» https://claude.ai/artifact/3w2zoeas6bpthwQcZBHSdZ, Quelle `docs/todo-uebersicht.html`. Design und Farben **1:1 von der Roundabout-Hunter-Liste** (Maurice will genau diese, nicht das App-Blau). Nach JEDEM Statuswechsel von Hand nachführen (Kennzahlen, «Online seit», Erledigt-Zähler) und mit `url` neu veröffentlichen. «Tokens bisher» mit `python scripts/tokens_zaehlen.py` messen.

## Technik

- **Reines HTML/JS ohne Build** (ES-Module), PWA mit Service Worker, Hash-Router. Daten offline-first in IndexedDB (`js/db.js`, Outbox), Abgleich mit Supabase (`js/sync.js`, last-write-wins über `updated_at`, Löschen per `deleted_at`).
- **Hosting: GitHub Pages**, Repo https://github.com/mabena71/bena-fitness, App https://mabena71.github.io/bena-fitness/, Demo `?demo`. **Kein Netlify, keine Credits** – jedes Hochladen ist gratis (lose Grenze ~10 Veröffentlichungen/Stunde). Hochladen von hier: `GIT_TERMINAL_PROMPT=0 git push -q origin HEAD:main` (Git Credential Manager ist eingerichtet).
- **Vor jedem Hochladen** `python scripts/bump-version.py` (setzt `version.json`, `js/version.js`, Cache-Name in `sw.js`). Sonst sehen die Handys die Meldung «Neue Version verfügbar – Jetzt aktualisieren» nicht.
- **Tests:** `tests.html` im Browser, alle müssen bestehen (Stand: 52). Rechenlogik in `js/stats.js`, `js/rewards.js`; Sync-Tests mit simuliertem Server.
- **Lokal:** `.claude/launch.json` → «fitness» startet `python tools/devserver.py 8000` (ohne Cache). Bei altem Stand im Browser-Pane: Service Worker abmelden und Caches leeren. Demo-Modus `http://localhost:8000/?demo` (Beispielperson «Alex»). Scharfe Screenshots: `python tools/shot.py URL out.png` (Edge headless); Browser-Pane-Screenshots sind in Handy-Emulation teils verzerrt oder hängen.
- **Supabase:** Projekt «bena-fit», Ref `slvrawfomzgmyytzdnfx` (EU/Irland, Free). Schema `supabase/schema.sql` + `supabase/family-devices.sql` (alles eingespielt). RLS `user_id = auth.uid()`, Familie darf Geräte/Studio-Bilder lesen. Fotos im privaten Bucket `photos` unter `<uid>/<id>.jpg`, Originalfoto zusätzlich `<uid>/<id>-orig.jpg`. anon key steht in `js/config.js` (öffentlich, ok). **Nie den service_role key verwenden.**
- **Supabase im Browser-Pane** (Maurice ist dort angemeldet): SQL per `window.monaco.editor.getModels()[0].setValue(sql)` + Run-Knopf, Ergebnis per Screenshot/zoom lesen (Tabelle ist virtualisiert). Edge Functions: Code per `fetch` von raw.githubusercontent (Commit-Hash) in Monaco setzen → «Deploy updates» → Bestätigungsdialog mit `find` + Klick (JS-Klick reicht dort nicht). **Verify JWT** bei allen drei Functions AUS.
- **Withings:** Entwickler-App «BENA Fit» (Org BENA, Development). Edge Functions `withings-auth` (OAuth) und `withings-sync` bereitgestellt; Secrets WITHINGS_CLIENT_ID/SECRET/REDIRECT_URI, APP_URL gesetzt. Maurice ist verbunden, Sabine noch nicht (Nr. 19). Werte erst **ab 11.10.2026** (Diätbeginn, `WITHINGS_START_DAY`), ältere gelöscht. App holt beim Öffnen automatisch (höchstens alle 15 Min.). Handy-Schritte kommen über Health Connect → Withings-App; die Tagessumme von Withings enthält sie verspätet, darum zusätzlich Minutenwerte (getintradayactivity) für heute/gestern, grösserer Wert gewinnt. Steht in BENA Fit zu wenig: erst Withings-App öffnen und runterziehen. Die Function loggt «Schritte …» zur Diagnose (Supabase → Edge Functions → withings-sync → Logs).
- **Push (Nr. 6, offen):** `supabase/functions/notify` gebaut, nicht bereitgestellt. Maurice erzeugt Schlüssel mit `tools/schluessel.html` und trägt VAPID_PRIVATE_KEY und CRON_SECRET selbst in die Secrets ein; VAPID_PUBLIC_KEY in `js/config.js`. Zeitplan per pg_cron/pg_net, CRON_SECRET am besten über Supabase Vault referenzieren. Danach auch nächtlicher Withings-Abruf. Anleitung `docs/WITHINGS-UND-PUSH.md`.

## Grundsatzentscheid 20.10.2026: generisch statt Familien-App

- BENA Fit soll später in den **Google Play Store und den Apple App Store**. Zwischenschritt: Maurice gibt die App jetzt an **Freunde** weiter.
- Familienspezifisches fällt weg, vor allem «Aus Familien-Geräten wählen» und gemeinsame Studio-Bilder: **Jeder erfasst seine Geräte und Studios selbst.** Neue Funktionen immer so generisch wie möglich bauen, keine Namen (Maurice, Sabine, Win4 …) fest im Code oder in Texten.
- Keine fest eingebauten Studios mehr: erster Start = eigenes Studio anlegen. **Bestehende Daten von Maurice, Sabine und Remy bleiben unangetastet.**
- Gemeinsames nur noch bewusst und per Einladung (Freundes-Challenge, nur Kennzahlen). Daten anderer nie über breite Policies lesbar machen: Die Storage-Policy «Familie darf Fotos lesen» lässt heute jedes Konto den ganzen Foto-Ordner lesen und muss weg, **bevor Freunde ein Konto bekommen** (Nr. 23 vor Nr. 26).
- Umsetzung: TODO.md Nr. 23–30 (Phase 2 «Für Freunde», Phase 4 «Stores»).

## App-Regeln (von Maurice festgelegt)

- Maurices Studios Bellevue, Archhöfe, Win4 (Activfitness) – nur noch als seine Daten, nicht mehr im Code vorgegeben (Nr. 24). **Keine Activfitness-Logos/Marke ins Repo** (öffentlich); Studio-Bilder lädt jeder selbst hoch (künftig nur für sich selbst sichtbar).
- Kategorien Push / Pull / Legs + Bauch/Rumpf, Cardio, Erholung. Sauna (Win4: Bio-Sauna, Dampfbad, Hot-Sauna) zählt nicht als Training, aber als Studiobesuch.
- **Vorbelegung Satz für Satz:** n-ter Satz heute = n-ter Satz vom letzten Trainingstag (inkl. Aufwärmsatz mit Haken); Comeback-Abschlag nach Pausen.
- **Rekorde** bei Gewichten erst ab **8 Wiederholungen**; Aufwärmsätze zählen nie.
- **Gerätefotos:** Darstellung «Farbstift» oder «Gerät hervorgehoben» (Gerät als Foto, Umgebung als Zeichnung; Freistellen mit @imgly/background-removal 1.4.5 über esm.sh, Modell «small», einmalig ~40 MB, auf dem Handy bis ~2 Min., Abbruch nach 3 Min. → Farbstift). WebGPU geht mit dieser Bibliothek nicht (geprüft). Am PC umgestellte Fotos kommen per Abgleich aufs Handy.
- **Schritte-Ziel** pro Person (Standard 10'000), Serie «Tage in Folge» **ohne Joker**, perfekte Woche.
- **Startseite:** Körper → Schritte → Studios (mit «Diese Woche …») → «Erfolge & Rekorde». PC: Körper und Schritte nebeneinander.
- **Ränge mit Stufen** (Neuling I–II, Anfänger I–II, Stammgast I–III, Eisen/Stahl/Titan I–IV, Diamant I–V, Legende ab 25), Level-Plakette blau mit «LEVEL».
- Heute erledigte Geräte grün ab dem ersten Arbeitssatz. Export: nur «Alle Daten exportieren» (eine Excel-Datei) + Sicherung.
- Erfolg = abnehmen (Gewicht und Fett sind beiden sehr wichtig), kein Zielwert.

## Arbeitssitzungen (wie bei Roundabout Hunter, angepasst)

- Jede Arbeitssitzung läuft im **eigenen Worktree/Zweig**, committet nur dort, **lädt NICHT hoch, ändert TODO.md, die To-do-Seite und die Version nicht**.
- Im Worktree fehlt `.claude/` (von git ausgeschlossen): Die Sitzung legt sich `.claude/launch.json` mit `python tools/devserver.py <Port>` an, **Port 8001+**, damit sie der Leitstelle (8000) nicht in die Quere kommt.
- Die Leitstelle prüft den Zweig, testet, führt nach Maurices Okay in `main` zusammen, macht `bump-version.py`, lädt hoch, führt TODO.md und die To-do-Seite nach. Nie zwei Sitzungen gleichzeitig an `js/views/home.js` oder `styles.css`.
- Im Brief immer mitgeben: diese Regeln, ss statt ß, Tests müssen bestehen, keine Geheimnisse in Dateien.

## Merken

- Geheimnisse nie als Datei ablegen (das Heimverzeichnis ist selbst ein git-Repo; das Projekt hat sein eigenes).
- `.claude/zeichnung-varianten.png` und `.claude/testfoto.jpg` (Brustpresse aus dem Studio) nicht ins Repo.
- Die alte Sitzung «Fitness-App-Entwicklung» nach erfolgreicher Übergabe archivieren (nur mit Maurices Ja).
