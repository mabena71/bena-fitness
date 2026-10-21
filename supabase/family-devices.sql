-- =====================================================================================
-- Aufräumen: Familien-Funktionen entfernen (Grundsatzentscheid 20.10.2026: generische App).
-- Früher konnten Geräte und Studio-Bilder zwischen Konten geteilt werden. Das entfällt:
-- Jedes Konto sieht nur noch seine eigenen Daten und Fotos. Die Policies «eigene Fotos …»
-- (Ordner <uid>/…) in schema.sql bleiben bestehen. Dieses Skript ist mehrfach ausführbar.
-- Wichtig: Vor der ersten Anmeldung eines Freundes ausführen.
-- =====================================================================================
drop function if exists public.family_exercises(text);
drop function if exists public.family_gym_photos();
drop policy if exists "Familie darf Fotos lesen" on storage.objects;
