// Laundry cycle: pieces that need washing after one wear wait for the next laundry day.
import { addDays, parseDay } from './storage';
import type { Category, Item, Settings, WearLog } from './types';

/** Worn once, then into the wash. Everything else (jeans, jackets, shoes...) can be re-worn first. */
export const WASH_EACH_WEAR: Category[] = ['top', 'dress', 'activewear', 'swimwear', 'sleepwear'];

const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86400000);

export interface LaundryCycle {
  every: number;
  /** First day of the current cycle (the last laundry day). */
  start: string;
  /** Next laundry day. */
  next: string;
  daysLeft: number;
}

export function laundryCycle(s: Settings, date: string): LaundryCycle | null {
  const every = s.laundryEvery ?? 0;
  if (!every || !s.lastLaundry) return null;
  const first = s.lastLaundry > date ? date : s.lastLaundry;
  const start = addDays(first, Math.floor(daysBetween(first, date) / every) * every);
  const next = addDays(start, every);
  return { every, start, next, daysLeft: daysBetween(date, next) };
}

/** Pieces worn since the last laundry day (before `date`) that need washing before they're worn again. */
export function hamperIds(items: Item[], wears: WearLog[], s: Settings, date: string): Set<string> {
  const c = laundryCycle(s, date);
  const out = new Set<string>();
  if (!c) return out;
  const washEach = new Set(items.filter((i) => WASH_EACH_WEAR.includes(i.category)).map((i) => i.id));
  for (const w of wears) if (w.date >= c.start && w.date < date) for (const id of w.itemIds) if (washEach.has(id)) out.add(id);
  return out;
}

/** Re-wearable pieces already worn this cycle, so the stylist can avoid repeating them too much. */
export function rewornThisCycle(items: Item[], wears: WearLog[], s: Settings, date: string): string[] {
  const c = laundryCycle(s, date);
  if (!c) return [];
  const rewear = new Set(items.filter((i) => !WASH_EACH_WEAR.includes(i.category)).map((i) => i.id));
  const seen = new Set<string>();
  for (const w of wears) if (w.date >= c.start && w.date < date) for (const id of w.itemIds) if (rewear.has(id)) seen.add(id);
  return [...seen];
}

/** Items with the hamper marked as in the laundry, so every picker skips them. */
export function withHamper(items: Item[], hamper: Set<string>): Item[] {
  return hamper.size ? items.map((i) => (hamper.has(i.id) ? { ...i, inLaundry: true } : i)) : items;
}

const fmt = (d: string) => parseDay(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

/** What the stylist is told about laundry for one day. */
export function laundryForAi(items: Item[], wears: WearLog[], s: Settings, date: string): string | undefined {
  const c = laundryCycle(s, date);
  if (!c) return undefined;
  const reworn = rewornThisCycle(items, wears, s, date)
    .map((id) => items.find((i) => i.id === id)?.name)
    .filter(Boolean);
  return [
    `They do laundry every ${c.every} day${c.every === 1 ? '' : 's'}. Last laundry day was ${fmt(c.start)}; the next is ${fmt(c.next)} (in ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'}).`,
    'Tops, dresses and sportswear are worn once, then wait for laundry day (those are marked IN LAUNDRY). Jeans, trousers, jackets and shoes can be re-worn, but spread them out so outfits do not feel repeated within one cycle.',
    reworn.length ? `Already worn this cycle (re-wearable, but go easy): ${reworn.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** For week planning: the laundry days that fall inside the plan. */
export function laundryDaysBetween(s: Settings, from: string, days: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    const c = laundryCycle(s, d);
    if (c && c.start === d && d !== s.lastLaundry) out.push(d);
  }
  return out;
}
