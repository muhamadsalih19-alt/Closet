import { del, get, set, keys, delMany } from 'idb-keyval';
import type { ChatMsg, Feedback, Item, Outfit, Plan, Settings, StyleProfile, WearLog } from './types';

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'claude-opus-5-5',
};

export const DEFAULT_PROFILE: StyleProfile = {
  name: '',
  wardrobe: 'mixed',
  styles: [],
  colorsLove: '',
  colorsAvoid: '',
  fitNotes: '',
  lifestyle: '',
  onboarded: false,
};

export interface AppData {
  settings: Settings;
  profile: StyleProfile;
  items: Item[];
  outfits: Outfit[];
  wears: WearLog[];
  plans: Plan[];
  feedback: Feedback[];
  chat: ChatMsg[];
}

const KEY = 'drape-data-v1';
const IMG = 'drape-img:';

export const EMPTY: AppData = {
  settings: DEFAULT_SETTINGS,
  profile: DEFAULT_PROFILE,
  items: [],
  outfits: [],
  wears: [],
  plans: [],
  feedback: [],
  chat: [],
};

export async function loadData(): Promise<AppData> {
  try {
    const saved = (await get(KEY)) as Partial<AppData> | undefined;
    if (!saved) return EMPTY;
    return {
      ...EMPTY,
      ...saved,
      settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
      profile: { ...DEFAULT_PROFILE, ...(saved.profile ?? {}) },
    };
  } catch {
    return EMPTY;
  }
}

export async function saveData(data: AppData) {
  try {
    await set(KEY, data);
  } catch (e) {
    console.warn('save failed', e);
  }
}

export async function loadImages(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  try {
    const all = (await keys()).filter((k): k is string => typeof k === 'string' && k.startsWith(IMG));
    await Promise.all(
      all.map(async (k) => {
        const v = (await get(k)) as string | undefined;
        if (v) out[k.slice(IMG.length)] = v;
      }),
    );
  } catch (e) {
    console.warn('images failed to load', e);
  }
  return out;
}

export const saveImage = (id: string, dataUrl: string) => set(IMG + id, dataUrl);
export const deleteImage = (id: string) => del(IMG + id);

export async function clearAll() {
  const all = (await keys()).filter((k) => typeof k === 'string' && (k === KEY || k.startsWith(IMG)));
  await delMany(all);
}

/** Backup includes photos but never the API key. */
export function exportBackup(data: AppData, images: Record<string, string>): string {
  return JSON.stringify({ app: 'drape', version: 1, exported: new Date().toISOString(), data: { ...data, settings: { ...data.settings, apiKey: '' } }, images });
}

export function parseBackup(text: string, current: AppData): { data: AppData; images: Record<string, string> } {
  const b = JSON.parse(text);
  if (b?.app !== 'drape' || !b.data || !Array.isArray(b.data.items)) throw new Error('This file is not a Drape backup.');
  const d = b.data as AppData;
  return {
    data: {
      ...EMPTY,
      ...d,
      settings: { ...DEFAULT_SETTINGS, ...d.settings, apiKey: current.settings.apiKey },
      profile: { ...DEFAULT_PROFILE, ...d.profile },
    },
    images: b.images ?? {},
  };
}

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
