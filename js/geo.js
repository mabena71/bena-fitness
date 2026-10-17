// Standort: Studio-Koordinaten speichern und das nächste Studio erkennen.

export const NEAR_M = 150;

/** Entfernung in Metern (Haversine). */
export function distanceM(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nächstes Studio innerhalb des Radius (plus etwas Toleranz für ungenaues GPS) oder null. */
export function nearestGym(gyms, pos, maxM = NEAR_M) {
  let best = null;
  for (const g of gyms) {
    if (g.lat == null || g.lng == null) continue;
    const d = distanceM(pos, g);
    if (!best || d < best.dist) best = { gym: g, dist: d };
  }
  const tolerance = Math.min(pos.acc || 0, 100);
  return best && best.dist <= maxM + tolerance ? best : null;
}

export async function permissionState() {
  if (!('geolocation' in navigator)) return 'unsupported';
  try {
    const p = await navigator.permissions.query({ name: 'geolocation' });
    return p.state; // granted | prompt | denied
  } catch { return 'prompt'; }
}

export function currentPosition({ timeout = 10000, maximumAge = 60000, highAccuracy = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('Dieses Gerät kennt keinen Standort.')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      e => reject(new Error(e.code === 1 ? 'Standort-Zugriff wurde nicht erlaubt.' : 'Standort konnte nicht bestimmt werden.')),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge },
    );
  });
}
