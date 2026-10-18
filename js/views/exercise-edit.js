import * as db from '../db.js';
import { setTop, esc, KINDS, MUSCLES, categoryOf, toast, confirmDialog, parseNum, modal } from '../ui.js';
import { resizeImage } from '../photo.js';
import { toSketch, sketchPreferred, setSketchPreferred } from '../sketch.js';
import { icon } from '../icons.js';
import { getMode } from '../app.js';

const DEFAULT_MUSCLE = { machine: 'legs', free: 'pull', bodyweight: 'push', cardio: 'cardio', sauna: 'recovery' };

export default {
  async render(el, [param], ctx) {
    const isNew = !!ctx.isNew;
    const ex = isNew ? null : db.get('exercises', param);
    if (!isNew && !ex) { location.hash = '#/'; return; }
    const gymParam = isNew ? (param === 'anywhere' ? null : param) : (ex.gym_id || null);
    const back = isNew ? `#/gym/${param}` : `#/ex/${ex.id}`;
    setTop({ title: isNew ? 'Neue Übung' : 'Übung bearbeiten', back });

    const st = {
      name: ex?.name || '',
      kind: ex?.kind || (gymParam ? 'machine' : 'bodyweight'),
      muscle_group: ex ? categoryOf(ex.muscle_group, ex.name) : null,
      gym_id: gymParam,
      notes: ex?.notes || '',
      settings: (ex?.settings || []).map(s => ({ ...s })),
      step: ex?.step ?? null,
      photo: null,
    };
    if (!st.muscle_group) st.muscle_group = DEFAULT_MUSCLE[st.kind];
    const gyms = db.all('gyms').sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const existingPhoto = ex?.photo_path ? await db.photoUrl(ex.id) : null;

    const family = isNew && gymParam && getMode() === 'cloud';
    el.innerHTML = `
      ${family ? `<button class="btn block" style="margin-bottom:12px" data-family>${icon('user', 18)} Aus Familien-Geräten wählen</button>` : ''}
      <div class="card">
        <label class="field"><span>Name</span><input class="input" data-k="name" value="${esc(st.name)}" placeholder="z. B. Beinpresse" ${isNew ? 'autofocus' : ''}></label>
        <div class="field"><span>Art</span><div class="seg" data-kind>
          ${Object.entries(KINDS).map(([k, v]) => `<button type="button" data-v="${k}" class="${st.kind === k ? 'on' : ''}">${icon(v.icon, 22)}<br><small>${v.label}</small></button>`).join('')}
        </div></div>
        <label class="field"><span>Kategorie</span><select class="input" data-k="muscle_group">
          ${Object.entries(MUSCLES).map(([k, v]) => `<option value="${k}" ${st.muscle_group === k ? 'selected' : ''}>${v.label} – ${v.hint}</option>`).join('')}
        </select></label>
        <label class="field"><span>Studio</span><select class="input" data-k="gym_id">
          ${gyms.map(g => `<option value="${g.id}" ${st.gym_id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}
          <option value="" ${!st.gym_id ? 'selected' : ''}>Überall (ohne Studio)</option>
        </select></label>
      </div>

      <div class="card">
        <div class="card-title"><h3>Foto des Geräts</h3></div>
        <div class="row" style="align-items:flex-start">
          <div class="hero"><div class="ph" data-preview>${existingPhoto ? `<img src="${existingPhoto}" alt="">` : icon(KINDS[st.kind].icon, 36)}</div></div>
          <div class="grow">
            <label class="btn block" style="cursor:pointer">${icon('camera', 18)} Foto aufnehmen / wählen<input type="file" accept="image/*" data-photo hidden></label>
            <label class="toggle"><input type="checkbox" data-sketch ${sketchPreferred() ? 'checked' : ''}> Als Zeichnung darstellen</label>
            ${existingPhoto ? '<button type="button" class="btn sm block" data-sketch-existing style="margin-top:6px">Bisheriges Foto in Zeichnung umwandeln</button>' : ''}
            <p class="muted small">Zeichnungen wirken einheitlich und sachlich. Das Foto wird verkleinert gespeichert.</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>Einstellungen am Gerät</h3><button class="btn sm" data-add-setting>+ Feld</button></div>
        <p class="muted small" style="margin-top:-4px">z. B. Sitzhöhe 5, Lehne 3, Polster M – wird beim Gerät gross angezeigt.</p>
        <div data-settings></div>
      </div>

      <div class="card">
        <label class="field" data-step-field><span>Gewichtsschritt für +/– (kg)</span><input class="input" inputmode="decimal" data-k="step" value="${st.step ?? ''}" placeholder="${st.kind === 'free' ? '1' : '2,5'}"></label>
        <label class="field"><span>Notiz</span><textarea class="input" data-k="notes" placeholder="z. B. steht hinten links, Griff breit">${esc(st.notes)}</textarea></label>
      </div>

      <button class="btn primary big block" style="margin-top:14px" data-save>Speichern</button>
      ${!isNew ? '<button class="btn block danger" style="margin-top:10px" data-del>Übung löschen</button>' : ''}
    `;

    const $ = s => el.querySelector(s);
    const drawSettings = () => {
      $('[data-settings]').innerHTML = st.settings.map((s, i) => `
        <div class="kv-row"><input class="input" data-sl="${i}" value="${esc(s.label)}" placeholder="Bezeichnung">
        <input class="input" data-sv="${i}" value="${esc(s.value)}" placeholder="Wert"><button class="icon-btn" data-sx="${i}" aria-label="entfernen">${icon('x', 18)}</button></div>`).join('') ||
        '<p class="muted small">Noch keine Einstellungen.</p>';
      el.querySelectorAll('[data-sl]').forEach(i => i.oninput = () => { st.settings[+i.dataset.sl].label = i.value; });
      el.querySelectorAll('[data-sv]').forEach(i => i.oninput = () => { st.settings[+i.dataset.sv].value = i.value; });
      el.querySelectorAll('[data-sx]').forEach(b => b.onclick = () => { st.settings.splice(+b.dataset.sx, 1); drawSettings(); });
    };
    drawSettings();
    const stepVisible = () => { $('[data-step-field]').hidden = st.kind === 'cardio' || st.kind === 'sauna'; };
    stepVisible();

    $('[data-add-setting]').onclick = () => {
      const suggestions = ['Sitz', 'Lehne', 'Polster', 'Griff', 'Startposition'];
      const used = new Set(st.settings.map(s => s.label));
      st.settings.push({ label: suggestions.find(s => !used.has(s)) || '', value: '' });
      drawSettings();
      el.querySelector(`[data-sv="${st.settings.length - 1}"]`).focus();
    };
    el.querySelectorAll('[data-kind] button').forEach(b => b.onclick = () => {
      const prevDefault = DEFAULT_MUSCLE[st.kind];
      st.kind = b.dataset.v;
      el.querySelectorAll('[data-kind] button').forEach(x => x.classList.toggle('on', x === b));
      if (st.muscle_group === prevDefault) { st.muscle_group = DEFAULT_MUSCLE[st.kind]; $('[data-k="muscle_group"]').value = st.muscle_group; }
      stepVisible();
    });
    // Original merken, damit "Als Zeichnung" jederzeit umgeschaltet werden kann
    let original = null;
    const showPhoto = async () => {
      if (!original) return;
      const sketch = $('[data-sketch]').checked;
      $('[data-preview]').innerHTML = '<span class="muted small">…</span>';
      st.photo = sketch ? await toSketch(original) : original;
      $('[data-preview]').innerHTML = `<img src="${URL.createObjectURL(st.photo)}" alt="">`;
    };
    $('[data-photo]').onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        original = await resizeImage(file);
        await showPhoto();
      } catch (err) {
        console.error(err);
        toast('Foto konnte nicht gelesen werden');
      }
    };
    $('[data-sketch]').onchange = () => { setSketchPreferred($('[data-sketch]').checked); showPhoto(); };
    const convert = $('[data-sketch-existing]');
    if (convert) convert.onclick = async () => {
      const blob = await db.getPhotoBlob(ex.id);
      if (!blob) return;
      original = blob;
      $('[data-sketch]').checked = true;
      await showPhoto();
      toast('Vorschau umgewandelt – mit „Speichern“ übernehmen');
    };

    $('[data-save]').onclick = async () => {
      const name = $('[data-k="name"]').value.trim();
      if (!name) { toast('Bitte einen Namen eingeben'); $('[data-k="name"]').focus(); return; }
      const row = {
        ...(ex ? { id: ex.id } : {}),
        name,
        kind: st.kind,
        muscle_group: $('[data-k="muscle_group"]').value,
        gym_id: $('[data-k="gym_id"]').value || null,
        notes: $('[data-k="notes"]').value.trim(),
        settings: st.settings.filter(s => s.label.trim() || s.value.trim()).map(s => ({ label: s.label.trim(), value: s.value.trim() })),
        step: parseNum($('[data-k="step"]').value),
        archived: false,
      };
      if (isNew) { row.photo_path = null; row.sort_order = null; }
      const saved = await db.put('exercises', row);
      if (st.photo) {
        await db.putPhoto(saved.id, st.photo);
        await db.put('exercises', { id: saved.id, photo_path: `${db.currentUser()}/${saved.id}.jpg` });
      }
      toast(isNew ? 'Übung angelegt' : 'Gespeichert');
      location.hash = `#/ex/${saved.id}`;
    };

    const fam = $('[data-family]');
    if (fam) fam.onclick = async () => {
      const picked = await pickFamilyDevice(db.get('gyms', gymParam)?.name || '');
      if (!picked) return;
      $('[data-k="name"]').value = picked.name;
      st.kind = picked.kind || 'machine';
      el.querySelectorAll('[data-kind] button').forEach(x => x.classList.toggle('on', x.dataset.v === st.kind));
      st.muscle_group = picked.muscle_group ? categoryOf(picked.muscle_group, picked.name) : DEFAULT_MUSCLE[st.kind];
      $('[data-k="muscle_group"]').value = st.muscle_group;
      stepVisible();
      if (picked.blob) {
        original = picked.blob;
        await showPhoto();
      }
      toast(`„${esc(picked.name)}“ übernommen – Einstellungen trägst du selbst ein`, '', 3500);
    };

    const del = $('[data-del]');
    if (del) del.onclick = async () => {
      if (!(await confirmDialog(`„${ex.name}“ löschen? Die Sätze dieser Übung verschwinden aus den Auswertungen.`))) return;
      await db.put('exercises', { id: ex.id, archived: true, deleted_at: new Date().toISOString() });
      toast('Übung gelöscht');
      location.hash = `#/gym/${ex.gym_id || 'anywhere'}`;
    };
  },
};

/** Liste der Geräte, die andere Familienmitglieder im gleichen Studio angelegt haben. */
async function pickFamilyDevice(gymName) {
  const sync = await import('../sync.js');
  let list;
  try { list = await sync.rpc('family_exercises', { p_gym_name: gymName }); }
  catch (e) { toast(esc(`Nicht erreichbar: ${e.message}`), '', 3500); return null; }
  const own = new Set(db.all('exercises').map(e => e.name.trim().toLowerCase()));
  return modal((m, close) => {
    m.innerHTML = `<h2>Familien-Geräte im ${esc(gymName)}</h2>
      ${list.length ? `<p class="muted small">Übernommen werden Name, Art, Kategorie und Foto – nicht die Einstellungen.</p>
      <ul class="list" data-list>${list.map((d, i) => `<li data-i="${i}" style="cursor:pointer">
        <div class="gym-ico" data-thumb="${i}" style="width:56px;height:56px">${icon(KINDS[d.kind]?.icon || 'machine', 24)}</div>
        <div class="grow"><b>${esc(d.name)}</b><div class="muted small">${esc(MUSCLES[categoryOf(d.muscle_group, d.name)]?.label || '')} · von ${esc(d.owner_name)}${own.has(d.name.trim().toLowerCase()) ? ' · hast du schon' : ''}</div></div>
        <span class="muted">›</span></li>`).join('')}</ul>`
        : '<p class="muted">Noch niemand aus der Familie hat in diesem Studio Geräte angelegt.</p>'}
      <div class="actions"><button class="btn" data-x>Abbrechen</button></div>`;
    m.querySelector('[data-x]').onclick = () => close(null);
    const blobs = {};
    list.forEach(async (d, i) => {
      if (!d.photo_path) return;
      try {
        const c = await sync.getClient();
        const { data } = await c.storage.from('photos').download(d.photo_path);
        if (!data) return;
        blobs[i] = data;
        const t = m.querySelector(`[data-thumb="${i}"]`);
        if (t) t.innerHTML = `<img src="${URL.createObjectURL(data)}" alt="" style="object-fit:cover">`;
      } catch { /* ohne Foto weiter */ }
    });
    m.querySelectorAll('[data-i]').forEach(li => li.onclick = async () => {
      const d = list[+li.dataset.i];
      let blob = blobs[li.dataset.i];
      if (!blob && d.photo_path) {
        try { const c = await sync.getClient(); blob = (await c.storage.from('photos').download(d.photo_path)).data; } catch { /* ohne Foto */ }
      }
      close({ ...d, blob });
    });
  });
}
