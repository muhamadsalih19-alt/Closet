import { useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { logWear, saveOutfit, setPlan } from '../lib/actions';
import { dayKey, uid } from '../lib/storage';
import { CATEGORIES, CATEGORY_LABEL, OCCASIONS } from '../lib/types';
import { Chip, ItemTile, OutfitBoard, Sheet, useShareOutfit } from '../components/ui';

export default function OutfitEditor({ id, itemIds, name, occasion }: { id?: string; itemIds?: string[]; name?: string; occasion?: string }) {
  const { data, update, toast } = useStore();
  const { close } = useNav();
  const share = useShareOutfit();
  const existing = id ? data.outfits.find((o) => o.id === id) : undefined;
  const [sel, setSel] = useState<string[]>(existing?.itemIds ?? itemIds ?? []);
  const [title, setTitle] = useState(existing?.name ?? name ?? '');
  const [occ, setOcc] = useState(existing?.occasion ?? occasion ?? 'Everyday');
  const [cat, setCat] = useState<string>('top');
  const [planDate, setPlanDate] = useState('');
  const owned = data.items.filter((i) => i.status === 'owned');
  const toggle = (iid: string) => setSel((s) => (s.includes(iid) ? s.filter((x) => x !== iid) : [...s, iid]));

  const save = () => {
    const oid = existing?.id ?? uid();
    update((d) => saveOutfit(d, { id: oid, name: title.trim() || 'My outfit', itemIds: sel, occasion: occ, note: existing?.note ?? '', source: existing?.source ?? 'manual' }));
    toast('Outfit saved');
    close();
  };

  return (
    <Sheet title={existing ? 'Edit outfit' : 'New outfit'} onClose={close}>
      <div className="stack">
        <OutfitBoard itemIds={sel} onItem={toggle} />
        {sel.length === 0 && <p className="muted center small">Tap pieces below to build the look.</p>}
        <label className="field">
          <span>Name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday office fit" />
        </label>
        <label className="field">
          <span>Occasion</span>
          <select value={occ} onChange={(e) => setOcc(e.target.value)}>
            {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>

        <div className="chips scroll">
          {CATEGORIES.filter((c) => owned.some((i) => i.category === c)).map((c) => (
            <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</Chip>
          ))}
        </div>
        <div className="grid small">
          {owned.filter((i) => i.category === cat).map((i) => <ItemTile key={i.id} item={i} selected={sel.includes(i.id)} onClick={() => toggle(i.id)} />)}
        </div>

        <button className="btn primary big" disabled={!sel.length} onClick={save}>Save outfit</button>
        <div className="row wrap">
          <button className="btn grow" disabled={!sel.length} onClick={() => { update((d) => logWear(d, sel, dayKey(), occ, existing?.id ?? null)); toast('Logged as today’s outfit'); }}>Wear today</button>
          <button className="btn grow" disabled={!sel.length} onClick={() => share(title || 'My outfit', sel)}>Share</button>
        </div>
        <div className="row">
          <input type="date" value={planDate} min={dayKey()} onChange={(e) => setPlanDate(e.target.value)} aria-label="Plan for date" />
          <button className="btn" disabled={!sel.length || !planDate} onClick={() => { update((d) => setPlan(d, planDate, sel, title || 'Planned outfit')); toast('Added to your planner'); }}>Plan it</button>
        </div>
        {existing && (
          <button className="btn small danger" onClick={() => { if (confirm('Delete this outfit?')) { update((d) => ({ ...d, outfits: d.outfits.filter((o) => o.id !== existing.id) })); close(); } }}>
            Delete outfit
          </button>
        )}
      </div>
    </Sheet>
  );
}
