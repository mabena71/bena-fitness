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

const PREF = 'fitness.sketchPhotos';
export function sketchPreferred() { try { return localStorage.getItem(PREF) !== '0'; } catch { return true; } }
export function setSketchPreferred(on) { try { localStorage.setItem(PREF, on ? '1' : '0'); } catch { /* egal */ } }
