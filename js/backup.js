// Datensicherung: alle Daten inkl. Fotos als eine JSON-Datei exportieren und wieder einspielen.
import * as db from './db.js';

const FORMAT = 'bena-fitness-backup';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function createBackup() {
  const tables = {};
  for (const t of db.TABLES) tables[t] = db.rawAll(t);
  const photos = {};
  for (const p of await db.allPhotos()) photos[p.key] = await blobToDataUrl(p.blob);
  return JSON.stringify({ format: FORMAT, version: 1, exported_at: new Date().toISOString(), tables, photos });
}

/** Spielt eine Sicherung ein. Vorhandene Einträge mit gleicher ID werden überschrieben. */
export async function restoreBackup(text, { userId = null } = {}) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Die Datei ist keine gültige Sicherung.'); }
  if (data.format !== FORMAT) throw new Error('Die Datei ist keine Sicherung dieser App.');
  const counts = {};
  for (const t of db.TABLES) {
    let rows = data.tables?.[t] || [];
    if (userId) {
      // Beim Übernehmen in ein Konto: Besitzer und Foto-Pfade auf das Konto umschreiben
      rows = rows.map(r => ({ ...r, user_id: userId, ...(t === 'profiles' ? { id: userId } : {}), ...(r.photo_path ? { photo_path: r.photo_path.replace(/^[^/]+\//, `${userId}/`) } : {}) }));
    }
    if (rows.length) await db.bulkPut(t, rows);
    counts[t] = rows.filter(r => !r.deleted_at).length;
  }
  let photos = 0;
  for (const [key, url] of Object.entries(data.photos || {})) {
    const blob = await (await fetch(url)).blob();
    await db.putPhoto(key, blob);
    photos++;
  }
  return { ...counts, photos };
}
