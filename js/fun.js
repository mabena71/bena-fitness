// Lustige Vergleichsgrößen für bewegte Kilos, verlorenes Gewicht, Distanzen und Schritte.
import { n0, n1 } from './ui.js';

const HEAVY = [
  { kg: 0.25, one: 'ein Päckchen Butter', many: 'Päckchen Butter' },
  { kg: 1, one: 'eine Ananas', many: 'Ananas' },
  { kg: 4, one: 'eine Hauskatze', many: 'Hauskatzen' },
  { kg: 7, one: 'eine Bowlingkugel', many: 'Bowlingkugeln' },
  { kg: 20, one: 'ein Viertel Emmentaler-Laib', many: 'Viertel Emmentaler-Laibe' },
  { kg: 30, one: 'ein Bernhardiner', many: 'Bernhardiner' },
  { kg: 70, one: 'eine Waschmaschine', many: 'Waschmaschinen' },
  { kg: 100, one: 'ein Kühlschrank mit Inhalt', many: 'volle Kühlschränke' },
  { kg: 200, one: 'ein Motorrad', many: 'Motorräder' },
  { kg: 450, one: 'ein Eisbär', many: 'Eisbären' },
  { kg: 500, one: 'ein Konzertflügel', many: 'Konzertflügel' },
  { kg: 700, one: 'eine Kuh', many: 'Kühe' },
  { kg: 1500, one: 'ein Auto', many: 'Autos' },
  { kg: 6000, one: 'ein Elefant', many: 'Elefanten' },
  { kg: 12000, one: 'ein Linienbus', many: 'Linienbusse' },
  { kg: 40000, one: 'ein Tram', many: 'Trams' },
  { kg: 41000, one: 'eine Boeing 737', many: 'Boeing 737' },
  { kg: 150000, one: 'ein Blauwal', many: 'Blauwale' },
];

const LOSS = [
  { kg: 0.25, one: 'ein Päckchen Butter', many: 'Päckchen Butter' },
  { kg: 0.5, one: 'ein Pfünderli Brot', many: 'Pfünderli Brot' },
  { kg: 1, one: 'eine Ananas', many: 'Ananas' },
  { kg: 1.5, one: 'eine Flasche Mineralwasser', many: 'Flaschen Mineralwasser' },
  { kg: 3, one: 'eine Wassermelone', many: 'Wassermelonen' },
  { kg: 4, one: 'eine Hauskatze', many: 'Hauskatzen' },
  { kg: 7, one: 'eine Bowlingkugel', many: 'Bowlingkugeln' },
  { kg: 12, one: 'ein Autoreifen', many: 'Autoreifen' },
  { kg: 20, one: 'ein Koffer voller Ferienkleider', many: 'Ferienkoffer' },
];

const DIST = [
  { km: 0.4, one: 'eine Runde auf der Leichtathletikbahn', many: 'Bahnrunden' },
  { km: 1.6, one: 'die Bahnhofstrasse hin und zurück', many: 'Mal die Bahnhofstrasse hin und zurück' },
  { km: 8.8, one: 'einmal auf den Üetliberg und zurück', many: 'Mal auf den Üetliberg und zurück' },
  { km: 42.2, one: 'ein Marathon', many: 'Marathons' },
  { km: 120, one: 'die Strecke Zürich–Bern', many: 'Mal Zürich–Bern' },
  { km: 348, one: 'die Schweiz von Genf bis St. Margrethen', many: 'Mal quer durch die Schweiz' },
];

function pick(list, value, unit, target = 4) {
  let bestItem = null, bestScore = Infinity;
  for (const it of list) {
    const n = value / it[unit];
    if (n < 0.95) continue;
    // ideal: zwischen 1 und 30 Stück, runde Zahl
    const score = n <= 30 ? Math.abs(Math.log(n / target)) : 10 + n;
    if (score < bestScore) { bestScore = score; bestItem = it; }
  }
  if (!bestItem) bestItem = list[0];
  const n = value / bestItem[unit];
  const r = n < 1.5 ? 1 : n < 10 ? Math.round(n * 2) / 2 : Math.round(n);
  return r === 1 ? bestItem.one : `${r < 10 ? n1(r) : n0(r)} ${bestItem.many}`;
}

/** "so viel wie 25 Autos" */
export function heavy(kg) { return kg > 0 ? `so schwer wie ${pick(HEAVY, kg, 'kg')}` : ''; }
/** "das ist eine Bowlingkugel" */
export function loss(kg) { return kg > 0 ? pick(LOSS, kg, 'kg', 1) : ''; }
export function distance(km) { return km > 0 ? pick(DIST, km, 'km', 1.5) : ''; }
export function steps(n) { return n > 0 ? distance(n * 0.00075) : ''; }
