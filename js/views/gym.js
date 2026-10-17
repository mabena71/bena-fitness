import * as db from '../db.js';
import { gymName } from '../data.js';
import { setTop, esc, ago, setText, MUSCLES, KINDS, modal, confirmDialog, toast } from '../ui.js';
import { working, byTime } from '../stats.js';
import { resizeImage } from '../photo.js';
import { icon } from '../icons.js';
import { currentPosition } from '../geo.js';

let filter = 'all';

/** Schlüssel für das Studio-Bild im Fotospeicher. */
export const gymPhotoKey = id => `gym-${id}`;

/** Übungen eines Studios in Anzeige-Reihenfolge (Laufweg, sonst zuletzt benutzt). */
export function orderedExercises(gymId) {
  const list = db.all('exercises').filter(e => (e.gym_id || null) === gymId && !e.archived);
  const lastUse = new Map();
  for (const s of db.all('sets')) if (!lastUse.has(s.exercise_id) || s.performed_at > lastUse.get(s.exercise_id)) lastUse.set(s.exercise_id, s.performed_at);
  const hasOrder = list.some(e => e.sort_order != null);
  return list.sort((a, b) => {
    if (hasOrder) {
      const x = a.sort_order ?? 1e9, y = b.sort_order ?? 1e9;
      if (x !== y) return x - y;
    }
    const la = lastUse.get(a.id) || '', lb = lastUse.get(b.id) || '';
    if (la !== lb) return la < lb ? 1 : -1;
    return a.name.localeCompare(b.name, 'de');
  });
}

export default {
  async render(el, [gid], ctx) {
    const gymId = gid === 'anywhere' ? null : gid;
    const gym = gymId ? db.get('gyms', gymId) : null;
    if (gymId && !gym) { location.hash = '#/'; return; }
    setTop({
      title: gymName(gymId), back: '#/',
      actions: gym ? `<button class="icon-btn" data-menu aria-label="Studio bearbeiten">${icon('more')}</button>` : '',
    });

    const all = orderedExercises(gymId);
    const hasOrder = all.some(e => e.sort_order != null);
    const usedGroups = [...new Set(all.map(e => e.muscle_group || 'full'))];
    if (filter !== 'all' && !usedGroups.includes(filter)) filter = 'all';

    const lastSet = new Map();
    for (const s of working(db.all('sets')).sort(byTime)) lastSet.set(s.exercise_id, s);

    const banner = gym?.photo_path ? await db.photoUrl(gymPhotoKey(gym.id)) : null;

    let detected = null;
    try { detected = sessionStorage.getItem('geo.detected'); sessionStorage.removeItem('geo.detected'); } catch { /* egal */ }

    el.innerHTML = `
      ${gym && detected === gym.id ? `<div class="notice info row spread">${icon('pin', 16)}<span class="grow">Standort erkannt: Du bist im <b>${esc(gym.name)}</b>.</span><a href="#/" data-other>Anderes Studio</a></div>` : ''}
      ${banner ? `<div class="gym-banner"><img src="${banner}" alt=""></div>` : ''}
      ${all.length > 6 ? '<input class="input search" type="search" placeholder="Übung suchen …" data-search>' : ''}
      ${usedGroups.length > 1 ? `<div class="chips">
        <button class="chip ${filter === 'all' ? 'on' : ''}" data-f="all">Alle</button>
        ${usedGroups.map(g => `<button class="chip ${filter === g ? 'on' : ''}" data-f="${g}">${MUSCLES[g]?.label || g}</button>`).join('')}
      </div>` : ''}
      <div class="tiles" data-tiles></div>
      ${!all.length ? `<div class="empty"><div class="e">${icon('machine', 40)}</div>Noch keine Übungen in ${esc(gymName(gymId))}.<br>Lege das erste Gerät an – am besten gleich mit Foto.</div>` : ''}
      <div class="row" style="margin-top:14px">
        <a class="btn primary grow" href="#/ex/new/${gid}">+ Übung / Gerät</a>
        ${all.length > 1 ? `<button class="btn" data-order>${icon('sort', 18)} ${hasOrder ? 'Reihenfolge' : 'Laufweg festlegen'}</button>` : ''}
      </div>
      ${all.length > 1 && !hasOrder ? '<p class="muted small">Optional: Lege deinen Laufweg fest. Dann zeigt dir die App nach jedem Gerät das nächste an.</p>' : ''}
      ${gym ? `<div class="card" style="margin-top:14px"><div class="row">
        <span style="color:var(--primary)">${icon('pin', 22)}</span>
        <div class="grow">${gym.lat != null ? `<b>Standort gespeichert</b><div class="muted small">Die App öffnet dieses Studio automatisch, wenn du hier bist.</div>`
          : `<b>Studio per Standort erkennen</b><div class="muted small">Tippe hier, wenn du im Studio bist. Danach öffnet sich die App hier automatisch.</div>`}</div>
        <button class="btn sm" data-geo>${gym.lat != null ? 'Neu setzen' : 'Hier speichern'}</button></div></div>` : ''}
    `;

    const tiles = el.querySelector('[data-tiles]');
    let q = '';
    const draw = async () => {
      const list = all.filter(e => (filter === 'all' || (e.muscle_group || 'full') === filter) && (!q || e.name.toLowerCase().includes(q)));
      tiles.innerHTML = list.map((e, i) => {
        const s = lastSet.get(e.id);
        return `<a class="tile" href="#/ex/${e.id}">
          <div class="ph" data-photo="${e.photo_path ? e.id : ''}">${icon(KINDS[e.kind]?.icon || 'machine', 36)}${hasOrder && e.sort_order != null ? `<span class="order">${i + 1}</span>` : ''}</div>
          <div class="body"><div class="name">${esc(e.name)}</div>
          <div class="last">${s ? `${setText(s, e.kind)} · ${ago(s.performed_at)}` : 'noch nie'}</div></div></a>`;
      }).join('');
      for (const ph of tiles.querySelectorAll('[data-photo]')) {
        if (!ph.dataset.photo) continue;
        const u = await db.photoUrl(ph.dataset.photo);
        if (u) { const badge = ph.querySelector('.order'); ph.innerHTML = `<img src="${u}" alt="" loading="lazy">`; if (badge) ph.appendChild(badge); }
      }
    };
    draw();

    const search = el.querySelector('[data-search]');
    if (search) search.oninput = () => { q = search.value.trim().toLowerCase(); draw(); };
    el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; ctx.refresh(); });
    const other = el.querySelector('[data-other]');
    if (other) other.onclick = () => { try { sessionStorage.setItem('geo.autoDone', '1'); } catch { /* egal */ } };
    const geoBtn = el.querySelector('[data-geo]');
    if (geoBtn) geoBtn.onclick = async () => {
      geoBtn.disabled = true; geoBtn.textContent = 'Suche …';
      try {
        const pos = await currentPosition({ maximumAge: 0 });
        await db.put('gyms', { id: gym.id, lat: pos.lat, lng: pos.lng, geo_acc: Math.round(pos.acc) });
        toast(`Standort von ${esc(gym.name)} gespeichert (Genauigkeit ca. ${Math.round(pos.acc)} m)`, '', 3500);
        ctx.refresh();
      } catch (err) { toast(esc(err.message), '', 3500); geoBtn.disabled = false; geoBtn.textContent = 'Hier speichern'; }
    };
    const ob = el.querySelector('[data-order]');
    if (ob) ob.onclick = async () => { if (await orderDialog(all)) ctx.refresh(); };

    const menu = document.querySelector('[data-menu]');
    if (menu) menu.onclick = async () => {
      let photo = null;
      const act = await modal((m, close) => {
        m.innerHTML = `<h2>${esc(gym.name)}</h2>
          <label class="field"><span>Name</span><input class="input" data-name value="${esc(gym.name)}"></label>
          <div class="field"><span>Logo oder Bild des Studios</span>
            <div class="row"><div class="gym-ico" data-prev style="width:64px;height:64px">${banner ? `<img src="${banner}" alt="">` : icon('building', 26)}</div>
            <label class="btn grow" style="cursor:pointer">${icon('image', 18)} Bild wählen<input type="file" accept="image/*" data-file hidden></label></div>
            <p class="muted small">z. B. ein Foto vom Eingang oder das Logo, das du auf deinem Handy gespeichert hast.</p></div>
          ${gym.lat != null ? '<label class="toggle"><input type="checkbox" data-nogeo> Gespeicherten Standort entfernen</label>' : ''}
          <div class="actions"><button class="btn danger" data-del>Studio löschen</button><button class="btn primary" data-ok>Speichern</button></div>`;
        m.querySelector('[data-file]').onchange = async e => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            photo = await resizeImage(f, 1000, 0.85);
            m.querySelector('[data-prev]').innerHTML = `<img src="${URL.createObjectURL(photo)}" alt="">`;
          } catch { toast('Bild konnte nicht gelesen werden'); }
        };
        m.querySelector('[data-ok]').onclick = () => close({ name: m.querySelector('[data-name]').value.trim(), noGeo: !!m.querySelector('[data-nogeo]')?.checked });
        m.querySelector('[data-del]').onclick = () => close({ del: true });
      });
      if (!act) return;
      if (act.del) {
        if (!(await confirmDialog(`„${gym.name}“ mit allen Übungen löschen? Die erfassten Sätze verschwinden aus den Auswertungen.`))) return;
        for (const e of db.all('exercises').filter(x => x.gym_id === gym.id)) await db.put('exercises', { id: e.id, archived: true, deleted_at: new Date().toISOString() });
        await db.remove('gyms', gym.id);
        toast('Studio gelöscht');
        location.hash = '#/';
        return;
      }
      if (photo) {
        await db.putPhoto(gymPhotoKey(gym.id), photo);
        await db.put('gyms', { id: gym.id, photo_path: `${db.currentUser()}/${gymPhotoKey(gym.id)}.jpg` });
      }
      if (act.name) await db.put('gyms', { id: gym.id, name: act.name });
      if (act.noGeo) await db.put('gyms', { id: gym.id, lat: null, lng: null, geo_acc: null });
      ctx.refresh();
    };
  },
};

function orderDialog(list) {
  let items = [...list];
  return modal((m, close) => {
    const draw = () => {
      m.innerHTML = `<h2>Laufweg festlegen</h2>
        <p class="muted small">Sortiere die Geräte so, wie du sie meistens nacheinander machst. Das ist freiwillig – du kannst jederzeit ein anderes Gerät wählen.</p>
        <ul class="list">${items.map((e, i) => `<li><span class="emoji num">${i + 1}</span><div class="grow">${esc(e.name)}</div>
          <button class="icon-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="nach oben">↑</button>
          <button class="icon-btn" data-down="${i}" ${i === items.length - 1 ? 'disabled' : ''} aria-label="nach unten">↓</button></li>`).join('')}</ul>
        <div class="actions"><button class="btn" data-clear>Ohne Reihenfolge</button><button class="btn primary" data-ok>Speichern</button></div>`;
      m.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up; [items[i - 1], items[i]] = [items[i], items[i - 1]]; draw(); });
      m.querySelectorAll('[data-down]').forEach(b => b.onclick = () => { const i = +b.dataset.down; [items[i + 1], items[i]] = [items[i], items[i + 1]]; draw(); });
      m.querySelector('[data-ok]').onclick = async () => { for (let i = 0; i < items.length; i++) await db.put('exercises', { id: items[i].id, sort_order: i + 1 }); close(true); };
      m.querySelector('[data-clear]').onclick = async () => { for (const e of items) await db.put('exercises', { id: e.id, sort_order: null }); close(true); };
    };
    draw();
  });
}
