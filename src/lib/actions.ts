import { dayKey, uid, type AppData } from './storage';
import type { Outfit } from './types';

export function logWear(d: AppData, itemIds: string[], date = dayKey(), occasion = '', outfitId: string | null = null): AppData {
  const rest = d.wears.filter((w) => w.date !== date);
  return { ...d, wears: [...rest, { id: uid(), date, itemIds, occasion, outfitId }].sort((a, b) => a.date.localeCompare(b.date)) };
}

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
