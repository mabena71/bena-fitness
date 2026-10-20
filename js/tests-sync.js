// Tests für den Abgleich (sync.js) gegen einen simulierten Supabase-Server mit zwei Geräten.
import * as db from './db.js';
import * as sync from './sync.js';

function mockServer(uid) {
  const tables = {};
  const files = {};
  let clock = Date.parse('2030-01-01T00:00:00Z');
  const tick = () => new Date(clock += 1000).toISOString();
  const table = t => (tables[t] ||= new Map());
  return {
    tables, files,
    auth: { getSession: async () => ({ data: { session: { user: { id: uid, email: 'test@example.com' } } } }), signOut: async () => ({}) },
    from(t) {
      return {
        upsert: async rows => {
          for (const r of rows) {
            if (r.user_id !== uid) return { error: { message: 'RLS: fremde Zeile' } };
            table(t).set(r.id, { ...table(t).get(r.id), ...r, synced_at: tick() });
          }
          return { error: null };
        },
        select() {
          const q = { col: null, val: null, n: 1000 };
          const api = {
            gt(col, val) { q.col = col; q.val = val; return api; },
            order() { return api; },
            limit(n) { q.n = n; return api; },
            then(res) {
              const data = [...table(t).values()].filter(r => r[q.col] > q.val).sort((a, b) => (a.synced_at < b.synced_at ? -1 : 1)).slice(0, q.n).map(r => ({ ...r }));
              return Promise.resolve({ data, error: null }).then(res);
            },
          };
          return api;
        },
      };
    },
    storage: {
      from: () => ({
        upload: async (path, blob) => { files[path] = blob; return { error: null }; },
        download: async path => (files[path] ? { data: files[path], error: null } : { data: null, error: { message: 'nicht gefunden' } }),
      }),
    },
  };
}

const results = [];
const ok = (cond, name, extra = '') => results.push([name, !!cond, cond ? '' : extra]);
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function runSyncTests() {
  const uid = '00000000-0000-4000-8000-000000000001';
  const server = mockServer(uid);
  sync.__setClient(server);
  const A = 'fitness-test-A', B = 'fitness-test-B';
  await db.deleteDatabase(A).catch(() => {});
  await db.deleteDatabase(B).catch(() => {});

  // Gerät A: Daten anlegen und hochladen
  await db.open(A, uid);
  const gym = await db.put('gyms', { name: 'Testclub', sort: 0, lat: null, lng: null });
  const ex = await db.put('exercises', { gym_id: gym.id, name: 'Beinpresse', kind: 'machine', muscle_group: 'legs', settings: [{ label: 'Sitz', value: '5' }], photo_path: `local/${'x'}.jpg`, archived: false, localOnly: 'nicht hochladen' });
  await db.put('exercises', { id: ex.id, photo_path: `local/${ex.id}.jpg` });
  await db.putPhoto(ex.id, new Blob(['bild'], { type: 'image/jpeg' }));
  const s1 = await db.put('sets', { exercise_id: ex.id, performed_at: new Date().toISOString(), weight_kg: 80, reps: 10, feel: 2, is_warmup: false, note: '' });
  ok((await db.pendingCount()) === 4, 'A: 4 Einträge in der Warteschlange (Studio, Gerät, Satz, Foto)', `ist ${await db.pendingCount()}`);
  let r = await sync.sync();
  ok(!r.error, 'A: Abgleich ohne Fehler', r.error);
  ok((await db.pendingCount()) === 0, 'A: Warteschlange danach leer');
  ok(server.tables.sets.get(s1.id)?.weight_kg === 80, 'Server: Satz angekommen');
  ok(!('localOnly' in server.tables.exercises.get(ex.id)), 'Server: nur bekannte Spalten hochgeladen');
  ok(server.tables.exercises.get(ex.id).photo_path === `${uid}/${ex.id}.jpg`, 'Server: Foto-Pfad auf Konto umgeschrieben', server.tables.exercises.get(ex.id).photo_path);
  ok(!!server.files[`${uid}/${ex.id}.jpg`], 'Server: Foto hochgeladen');

  // Gerät B: alles holen
  await db.open(B, uid);
  r = await sync.sync();
  ok(!r.error && db.all('sets').length === 1 && db.all('gyms').length === 1, 'B: Daten vom Server übernommen', JSON.stringify(r));
  ok(db.get('exercises', ex.id)?.settings?.[0]?.value === '5', 'B: Geräte-Einstellungen übernommen');
  ok(!!(await db.getPhotoBlob(ex.id)), 'B: Foto heruntergeladen');
  ok((await db.pendingCount()) === 0, 'B: vom Server Geholtes landet nicht in der Warteschlange');

  // B ändert, A holt
  await wait(5);
  await db.put('sets', { id: s1.id, weight_kg: 82.5 });
  await sync.sync();
  await db.open(A, uid);
  await sync.sync();
  ok(db.get('sets', s1.id)?.weight_kg === 82.5, 'A: Änderung von B angekommen', db.get('sets', s1.id)?.weight_kg);

  // Konflikt: A ändert zuerst, B später -> B gewinnt überall
  await db.put('sets', { id: s1.id, note: 'von A' });
  await wait(10);
  await db.open(B, uid);
  await db.put('sets', { id: s1.id, note: 'von B' });
  await db.open(A, uid); await sync.sync();
  await db.open(B, uid); await sync.sync();
  const onB = db.get('sets', s1.id)?.note;
  await db.open(A, uid); await sync.sync();
  const onA = db.get('sets', s1.id)?.note;
  ok(onA === 'von B' && onB === 'von B', 'Konflikt: jüngere Änderung gewinnt auf beiden Geräten', `A=${onA}, B=${onB}`);

  // Löschen
  await db.remove('sets', s1.id);
  await sync.sync();
  await db.open(B, uid); await sync.sync();
  ok(db.all('sets').length === 0, 'Löschen kommt auf dem anderen Gerät an');

  // Offline
  const realOnline = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  await db.put('sets', { exercise_id: ex.id, performed_at: new Date().toISOString(), weight_kg: 70, reps: 12, is_warmup: false });
  r = await sync.sync();
  ok(r.offline && (await db.pendingCount()) === 1, 'Offline: Satz wartet in der Warteschlange');
  delete navigator.onLine;
  if (realOnline) Object.defineProperty(Navigator.prototype, 'onLine', realOnline);
  r = await sync.sync();
  ok(!r.error && !r.offline && (await db.pendingCount()) === 0, 'Wieder online: Warteschlange hochgeladen', `${JSON.stringify(r)} online=${navigator.onLine} pending=${await db.pendingCount()}`);

  // Übernahme der Gerätedaten ("Nur dieses Gerät") ins Konto
  const { createBackup, restoreBackup } = await import('./backup.js');
  const L = 'fitness-test-local', C = 'fitness-test-cloud';
  await db.deleteDatabase(L).catch(() => {});
  await db.deleteDatabase(C).catch(() => {});
  await db.open(L, 'local');
  const lg = await db.put('gyms', { name: 'Testgym' });
  const le = await db.put('exercises', { gym_id: lg.id, name: 'Latzug', kind: 'machine', photo_path: null });
  await db.put('exercises', { id: le.id, photo_path: `local/${le.id}.jpg` });
  await db.putPhoto(le.id, new Blob(['x'], { type: 'image/jpeg' }));
  await db.put('sets', { exercise_id: le.id, performed_at: new Date().toISOString(), weight_kg: 40, reps: 12, is_warmup: false });
  const backup = await createBackup();
  await db.open(C, uid);
  const res = await restoreBackup(backup, { userId: uid });
  ok(res.sets === 1 && res.photos === 1, 'Übernahme: Sätze und Fotos übernommen', JSON.stringify(res));
  ok(db.all('sets').every(s => s.user_id === uid) && db.get('exercises', le.id).photo_path === `${uid}/${le.id}.jpg`, 'Übernahme: Besitzer und Foto-Pfad aufs Konto umgeschrieben');
  r = await sync.sync();
  ok(!r.error && server.tables.sets && [...server.tables.sets.values()].some(s => s.weight_kg === 40), 'Übernahme: Daten danach hochgeladen', r.error);
  await db.deleteDatabase(L).catch(() => {});
  await db.deleteDatabase(C).catch(() => {});

  await db.deleteDatabase(A).catch(() => {});
  await db.deleteDatabase(B).catch(() => {});
  sync.__setClient(null);
  return results;
}
