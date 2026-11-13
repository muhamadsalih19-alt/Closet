// A simple outfit picker that works with no API key, so the app is useful from day one.
import { wearStats } from './ai';
import type { DayWeather } from './weather';
import type { Item, Season, Suggestion, WearLog } from './types';

const NEUTRALS = ['black', 'white', 'grey', 'gray', 'cream', 'beige', 'navy', 'denim', 'tan', 'camel', 'brown', 'ivory', 'khaki', 'charcoal', 'olive'];
const isNeutral = (c: string) => NEUTRALS.some((n) => c.toLowerCase().includes(n));

const OCCASION_FORMALITY: Record<string, [number, number]> = {
  Everyday: [1, 3],
  Work: [3, 4],
  'Smart casual': [2, 4],
  'Date night': [3, 4],
  'Going out': [2, 4],
  'Formal event': [4, 5],
  Workout: [1, 1],
  Travel: [1, 3],
  'Lounging at home': [1, 2],
  Interview: [4, 5],
  'Wedding guest': [4, 5],
  Brunch: [2, 3],
};

export function seasonFor(d: DayWeather | undefined): Season | null {
  if (!d) return null;
  const avg = (d.max + d.min) / 2;
  if (avg >= 22) return 'summer';
  if (avg <= 8) return 'winter';
  return new Date().getMonth() >= 6 ? 'autumn' : 'spring';
}

function pick<T>(arr: T[], score: (t: T) => number): T | undefined {
  if (!arr.length) return undefined;
  const scored = arr.map((t) => ({ t, s: score(t) + Math.random() * 2 }));
  scored.sort((a, b) => b.s - a.s);
  return scored[0].t;
}

export function localOutfits(items: Item[], wears: WearLog[], occasion: string, weather: DayWeather | undefined, count = 3, anchorId?: string): Suggestion[] {
  const stats = wearStats(wears);
  const today = new Date().toISOString().slice(0, 10);
  const season = seasonFor(weather);
  const [fmin, fmax] = OCCASION_FORMALITY[occasion] ?? [1, 5];
  const pool = items.filter((i) => i.status === 'owned' && !i.inLaundry);
  const ok = (i: Item) => (season ? !i.seasons.length || i.seasons.includes(season) : true);
  const baseScore = (i: Item) => {
    let s = 0;
    if (i.formality >= fmin && i.formality <= fmax) s += 4;
    else s -= Math.min(Math.abs(i.formality - fmin), Math.abs(i.formality - fmax)) * 2;
    if (ok(i)) s += 2;
    const st = stats[i.id];
    if (!st) s += 1.5;
    else {
      const daysAgo = (Date.parse(today) - Date.parse(st.last)) / 86400000;
      if (daysAgo < 3) s -= 4;
    }
    if (i.favorite) s += 1;
    return s;
  };
  const by = (cat: string) => pool.filter((i) => i.category === cat || (occasion === 'Workout' && cat !== 'shoes' && i.category === 'activewear'));
  const cold = weather ? weather.max < 16 : false;
  const wet = weather ? weather.rainChance >= 50 : false;
  const anchor = anchorId ? pool.find((i) => i.id === anchorId) : undefined;

  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (let n = 0; n < count * 4 && out.length < count; n++) {
    const chosen: Item[] = anchor ? [anchor] : [];
    const has = (cat: string) => chosen.some((c) => c.category === cat);
    const harmony = (i: Item) => {
      const accent = chosen.find((c) => c.colors.length && !c.colors.every(isNeutral));
      if (!accent || i.colors.every(isNeutral)) return 1;
      return i.colors.some((c) => accent.colors.includes(c)) ? 0.5 : -2;
    };
    const score = (i: Item) => baseScore(i) + harmony(i);
    const useDress = !has('top') && !has('bottom') && (has('dress') || (by('dress').length > 0 && Math.random() < 0.35));
    if (useDress && !has('dress')) {
      const d = pick(by('dress'), score);
      if (d) chosen.push(d);
    }
    if (!has('dress')) {
      if (!has('top')) {
        const t = pick(by('top'), score);
        if (t) chosen.push(t);
      }
      if (!has('bottom')) {
        const b = pick(by('bottom'), score);
        if (b) chosen.push(b);
      }
    }
    if (!has('shoes')) {
      const s = pick(by('shoes'), (i) => score(i) + (wet && /boot|waterproof/i.test(i.subcategory + i.name) ? 2 : 0));
      if (s) chosen.push(s);
    }
    if ((cold || wet) && !has('outerwear')) {
      const o = pick(by('outerwear'), score);
      if (o) chosen.push(o);
    }
    if (!has('bag') && Math.random() < 0.5) {
      const b = pick(by('bag'), score);
      if (b) chosen.push(b);
    }
    if (!chosen.length) break;
    const key = chosen.map((c) => c.id).sort().join('+');
    if (seen.has(key)) continue;
    seen.add(key);
    const main = chosen.find((c) => c.category !== 'shoes' && c.category !== 'bag') ?? chosen[0];
    out.push({
      title: `${occasion} look`,
      itemIds: chosen.map((c) => c.id),
      why: `Built around your ${main.name.toLowerCase()}${weather ? `, picked for ${Math.round(weather.max)}° and ${weather.rainChance}% rain` : ''}.`,
      tip: 'Add your API key in Settings for a real stylist’s picks and styling tips.',
    });
  }
  return out;
}
