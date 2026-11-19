import { dayKey, uid, type AppData } from './storage';
import type { Outfit } from './types';

const sameItems = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Logs an outfit as worn on a date. A day can have several outfits; logging the exact same one twice does nothing. */
export function logWear(d: AppData, itemIds: string[], date = dayKey(), occasion = '', outfitId: string | null = null): AppData {
  if (d.wears.some((w) => w.date === date && sameItems(w.itemIds, itemIds))) return d;
  // stable sort keeps same-day outfits in the order they were logged
  return { ...d, wears: [...d.wears, { id: uid(), date, itemIds, occasion, outfitId }].sort((a, b) => a.date.localeCompare(b.date)) };
}

export function removeWear(d: AppData, wearId: string): AppData {
  return { ...d, wears: d.wears.filter((w) => w.id !== wearId) };
}

/** Adds one piece to a logged outfit (or starts a new one if there is none that day). */
export function addToLatestWear(d: AppData, itemId: string, date = dayKey()): AppData {
  const latest = d.wears.filter((w) => w.date === date).at(-1);
  if (!latest) return logWear(d, [itemId], date);
  if (latest.itemIds.includes(itemId)) return d;
  return { ...d, wears: d.wears.map((w) => (w.id === latest.id ? { ...w, itemIds: [...w.itemIds, itemId] } : w)) };
}

export const wearsOn = (d: AppData, date: string) => d.wears.filter((w) => w.date === date);

export function saveOutfit(d: AppData, o: Omit<Outfit, 'id' | 'createdAt' | 'favorite'> & { id?: string }): AppData {
  if (o.id && d.outfits.some((x) => x.id === o.id)) {
    return { ...d, outfits: d.outfits.map((x) => (x.id === o.id ? { ...x, ...o, id: x.id } : x)) };
  }
  return { ...d, outfits: [{ favorite: false, createdAt: Date.now(), ...o, id: o.id ?? uid() }, ...d.outfits] };
}

export function giveFeedback(d: AppData, itemIds: string[], liked: boolean): AppData {
  return { ...d, feedback: [...d.feedback, { itemIds, liked, at: Date.now() }].slice(-60) };
}

export function setPlan(d: AppData, date: string, itemIds: string[], title: string, note = ''): AppData {
  const rest = d.plans.filter((p) => p.date !== date);
  return { ...d, plans: itemIds.length ? [...rest, { date, itemIds, title, note }] : rest };
}
