// Gerätefoto als Bleistiftzeichnung (schwarz-weiss), direkt im Browser.
// Verfahren: Graustufen → invertieren → stark weichzeichnen → "Farbig abwedeln",
// danach Striche verstärken und schwache Linien (Hintergrund) ausblenden.

const supportsFilter = () => {
  try { return 'filter' in document.createElement('canvas').getContext('2d'); } catch { return false; }
};

async function bitmap(blob) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { /* Fallback */ }
  }
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();
  return img;
}

/** Wandelt ein Bild in eine Zeichnung um. Ohne Canvas-Filter (alte Browser) kommt das Original zurück. */
export async function toSketch(blob, max = 1280) {
  if (!supportsFilter()) return blob;
  const src = await bitmap(blob);
  const scale = Math.min(1, max / Math.max(src.width, src.height));
  const w = Math.round(src.width * scale), h = Math.round(src.height * scale);
  const layer = (filter) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.filter = filter;
    g.drawImage(src, 0, 0, w, h);
    return g.getImageData(0, 0, w, h);
  };
  const base = layer('grayscale(1) blur(1.6px)');
  const blur = layer(`grayscale(1) blur(1.6px) invert(1) blur(${Math.max(6, w * 0.012).toFixed(1)}px)`);
  const out = new ImageData(w, h);
  const a = base.data, b = blur.data, o = out.data;
  for (let i = 0; i < a.length; i += 4) {
    let v = Math.min(255, (a[i] * 255) / Math.max(1, 255 - b[i]));
    v = 255 * Math.pow(v / 255, 2.6);          // Striche kräftiger
    v = v > 228 ? 255 : v;                       // schwache Linien weg
    o[i] = o[i + 1] = o[i + 2] = v;
    o[i + 3] = 255;
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').putImageData(out, 0, 0);
  if (src.close) src.close();
  return new Promise(res => c.toBlob(r => res(r || blob), 'image/jpeg', 0.9));
}

/**
 * Farbstift: Strichstärke aus der Bleistiftzeichnung, Farben aus dem Foto (etwas kräftiger).
 * Läuft sofort, ohne Download.
 */
export async function toColorSketch(blob) {
  const sketchBlob = await toSketch(blob);
  const [sk, orig] = await Promise.all([bitmap(sketchBlob), bitmap(blob)]);
  const w = sk.width, h = sk.height;
  const read = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h); return g.getImageData(0, 0, w, h); };
  const S = read(sk), O = read(orig).data, d = S.data;
  for (let i = 0; i < d.length; i += 4) {
    const ink = (255 - d[i]) / 255;                                   // 0 = Papier, 1 = Strich
    const l = 0.3 * O[i] + 0.59 * O[i + 1] + 0.11 * O[i + 2];
    const a = Math.min(1, ink * 1.1 + 0.5);                           // Farbfläche plus Striche
    for (let k = 0; k < 3; k++) {
      const sat = Math.max(0, Math.min(255, l + (O[i + k] - l) * 1.5));
      d[i + k] = 255 - (255 - sat * (1 - ink * 0.5)) * a;
    }
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(S, 0, 0);
  return new Promise(res => c.toBlob(r => res(r || sketchBlob), 'image/jpeg', 0.9));
}

/**
 * «Gerät hervorgehoben»: das Gerät bleibt als farbiges Foto, die Umgebung wird zur Bleistiftzeichnung.
 * Das Freistellen läuft im Browser (beim ersten Mal ca. 40 MB Download, danach aus dem Cache).
 */
export async function toFocus(blob, onStatus = () => {}, timeoutMs = 180000) {
  const sketchBlob = await toSketch(blob);
  onStatus('Werkzeug wird geladen …');
  const { removeBackground } = await import('https://esm.sh/@imgly/background-removal@1.4.5');
  let downloading = false;
  const t0 = Date.now();
  // Laufende Anzeige, damit man sieht, dass gerechnet wird (auf dem Handy bis etwa eine Minute)
  const tick = setInterval(() => { if (!downloading) onStatus(`Gerät wird erkannt … ${Math.round((Date.now() - t0) / 1000)} s (auf dem Handy bis etwa 2 Min.)`); }, 1000);
  const opts = () => ({
    model: 'small',
    output: { format: 'image/png', type: 'mask' },
    progress: (key, cur, total) => {
      if (/fetch/.test(key) && total) { downloading = cur < total; onStatus(`Einmaliger Download ${Math.round(cur / total * 100)} % …`); }
    },
  });
  let maskBlob;
  try {
    maskBlob = await Promise.race([removeBackground(blob, opts()), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))]);
  } finally { clearInterval(tick); }
  const [sk, orig, mk] = await Promise.all([bitmap(sketchBlob), bitmap(blob), bitmap(maskBlob)]);
  const w = sk.width, h = sk.height;
  const read = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h); return g.getImageData(0, 0, w, h); };
  const S = read(sk), O = read(orig).data, M = read(mk).data, d = S.data;
  for (let i = 0; i < d.length; i += 4) {
    const raw = (M[i + 3] < 255 ? M[i + 3] : M[i]) / 255;
    const m = raw > 0.6 ? 1 : raw > 0.35 ? (raw - 0.35) / 0.25 : 0;
    for (let k = 0; k < 3; k++) d[i + k] = O[i + k] * m + d[i + k] * (1 - m);
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(S, 0, 0);
  return new Promise(res => c.toBlob(r => res(r || sketchBlob), 'image/jpeg', 0.9));
}

/** Ist das Bild schwarz-weiss (also schon eine Bleistiftzeichnung ohne Farbe)? */
export async function isGrayscale(blob) {
  const img = await bitmap(blob);
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data;
  let diff = 0;
  for (let i = 0; i < d.length; i += 4) diff += Math.abs(d[i] - d[i + 1]) + Math.abs(d[i + 1] - d[i + 2]);
  return diff / (64 * 64) < 3;
}

/** Darstellung der Gerätefotos: 'color' (Farbstift) | 'focus' (Gerät hervorgehoben, Standard). */
export const PHOTO_STYLES = { color: 'Farbstift', focus: 'Gerät hervorgehoben' };
const PREF = 'fitness.photoStyle';
export function photoStyle() {
  try { const v = localStorage.getItem(PREF); if (PHOTO_STYLES[v]) return v; } catch { /* egal */ }
  return 'focus';
}
export function setPhotoStyle(v) { try { localStorage.setItem(PREF, v); } catch { /* egal */ } }
/** Bild in der gewählten Darstellung. */
export function renderStyle(blob, style, onStatus) {
  return style === 'focus' ? toFocus(blob, onStatus) : toColorSketch(blob);
}
