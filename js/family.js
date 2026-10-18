// Familien-Studiobilder: Hat man beim Studio kein eigenes Bild, wird das Bild eines
// gleichnamigen Studios eines anderen Familienmitglieds angezeigt (nur im Konto-Modus).
import * as db from './db.js';
import { getMode } from './app.js';

let listPromise = null;
const keyFor = name => `famgym-${name.trim().toLowerCase()}`;

function familyList() {
  if (!listPromise) {
    listPromise = (async () => {
      try {
        const sync = await import('./sync.js');
        return await sync.rpc('family_gym_photos');
      } catch { return []; }
    })();
  }
  return listPromise;
}

/** Objekt-URL des Familien-Studiobilds oder null. Lädt es einmal herunter und merkt es sich offline. */
export async function familyGymPhotoUrl(gymName) {
  if (getMode() !== 'cloud' || !gymName) return null;
  const key = keyFor(gymName);
  const cached = await db.photoUrl(key);
  // im Hintergrund aktualisieren, damit ein neues Logo ankommt
  const refresh = (async () => {
    const hit = (await familyList()).find(r => r.gym_name.trim().toLowerCase() === gymName.trim().toLowerCase());
    if (!hit) return null;
    const known = await db.getMeta(key, null);
    if (known === hit.photo_path && cached) return null;
    const sync = await import('./sync.js');
    const c = await sync.getClient();
    const { data } = await c.storage.from('photos').download(hit.photo_path);
    if (!data) return null;
    await db.savePhotoFromRemote(key, data);
    await db.setMeta(key, hit.photo_path);
    return db.photoUrl(key);
  })().catch(() => null);
  return cached || refresh;
}
