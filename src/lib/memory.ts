import { uid, type AppData } from './storage';

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Adds notes to the stylist's memory, skipping blanks and near-duplicates. */
export function remember(d: AppData, texts: string[]): AppData {
  const memory = [...(d.profile.memory ?? [])];
  const seen = new Set(memory.map((m) => norm(m.text)));
  for (const raw of texts) {
    const text = raw.trim().slice(0, 300);
    if (!text || seen.has(norm(text))) continue;
    seen.add(norm(text));
    memory.push({ id: uid(), text, at: Date.now() });
  }
  return { ...d, profile: { ...d.profile, memory: memory.slice(-100) } };
}

export function forget(d: AppData, id: string): AppData {
  return { ...d, profile: { ...d.profile, memory: (d.profile.memory ?? []).filter((m) => m.id !== id) } };
}
