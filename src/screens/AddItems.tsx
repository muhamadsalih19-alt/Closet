import { useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { tagItem, friendlyError } from '../lib/ai';
import { fileToDataUrl } from '../lib/images';
import { uid } from '../lib/storage';
import type { Item, ItemStatus } from '../lib/types';
import { PhotoButton, Sheet, Spinner } from '../components/ui';
import ItemForm from '../components/ItemForm';

interface Draft {
  item: Item;
  photo: string | null;
  state: 'reading' | 'tagging' | 'ready' | 'error';
  error: string;
}

export function blankItem(status: ItemStatus): Item {
  return {
    id: uid(), name: '', category: 'top', subcategory: '', colors: [], pattern: 'solid', material: '', seasons: [], formality: 2,
    styleTags: [], brand: '', price: null, notes: '', favorite: false, inLaundry: false, status, hasPhoto: false, createdAt: Date.now(),
  };
}

export default function AddItems({ status }: { status: ItemStatus }) {
  const { update, setImage, ai, toast } = useStore();
  const { close } = useNav();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const patch = (id: string, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.item.id === id ? { ...d, ...p } : d)));
  const patchItem = (id: string, p: Partial<Item>) => setDrafts((ds) => ds.map((d) => (d.item.id === id ? { ...d, item: { ...d.item, ...p } } : d)));

  const addFiles = async (files: File[]) => {
    const fresh: Draft[] = files.map(() => ({ item: { ...blankItem(status), name: 'New piece' }, photo: null, state: 'reading', error: '' }));
    setDrafts((ds) => [...ds, ...fresh]);
    // Two at a time keeps the phone responsive and stays well inside rate limits.
    let next = 0;
    const worker = async () => {
      while (next < files.length) {
        const n = next++;
        const id = fresh[n].item.id;
        try {
          const photo = await fileToDataUrl(files[n]);
          patch(id, { photo, state: ai.apiKey ? 'tagging' : 'ready' });
          if (ai.apiKey) {
            const t = await tagItem(ai, photo);
            patchItem(id, {
              name: t.name, category: t.category, subcategory: t.subcategory, colors: t.colors, pattern: t.pattern, material: t.material,
              seasons: t.seasons, formality: Math.min(5, Math.max(1, t.formality)), styleTags: t.style_tags, brand: t.brand,
            });
            patch(id, { state: 'ready', error: t.is_clothing ? '' : 'This doesn’t look like clothing — check the details.' });
          }
        } catch (e) {
          patch(id, { state: 'error', error: friendlyError(e) + ' You can fill in the details yourself.' });
        }
      }
    };
    await Promise.all([worker(), worker()]);
  };

  const busy = drafts.some((d) => d.state === 'reading' || d.state === 'tagging');

  const saveAll = async () => {
    for (const d of drafts) if (d.photo) await setImage(d.item.id, d.photo);
    const items = drafts.map((d) => ({ ...d.item, hasPhoto: !!d.photo, name: d.item.name.trim() || 'Untitled piece' }));
    update((data) => ({ ...data, items: [...items, ...data.items] }));
    toast(`${items.length} ${items.length === 1 ? 'piece' : 'pieces'} added`);
    close();
  };

  return (
    <Sheet title={status === 'wishlist' ? 'Add to wishlist' : 'Add clothes'} onClose={close}>
      <div className="stack">
        {!drafts.length && (
          <p className="muted">
            Best results: one piece per photo, laid flat or on a hanger, plain background, good light.
            {ai.apiKey ? ' Your stylist will name and tag each piece.' : ' Add a Claude API key in Settings and pieces get tagged automatically.'}
          </p>
        )}
        <div className="row wrap">
          <PhotoButton className="btn primary grow" label="📷 Take photo" camera onFiles={addFiles} />
          <PhotoButton className="btn grow" label="🖼️ Choose photos" multiple onFiles={addFiles} />
        </div>
        {status === 'wishlist' && (
          <button className="btn" onClick={() => setDrafts((ds) => [...ds, { item: { ...blankItem('wishlist'), name: '' }, photo: null, state: 'ready', error: '' }])}>
            + Add without a photo
          </button>
        )}

        {drafts.map((d) => (
          <div key={d.item.id} className="card draft">
            <div className="row">
              <div className="photo sm">{d.photo ? <img src={d.photo} alt="" /> : <span>📷</span>}</div>
              <div className="grow">
                {d.state === 'reading' && <Spinner label="Reading photo…" />}
                {d.state === 'tagging' && <Spinner label="Tagging…" />}
                {(d.state === 'ready' || d.state === 'error') && (
                  <>
                    <strong>{d.item.name || 'New piece'}</strong>
                    <div className="muted small">{[d.item.subcategory || d.item.category, d.item.colors.join(', ')].filter(Boolean).join(' · ')}</div>
                  </>
                )}
              </div>
              <button className="link small" onClick={() => setOpenId(openId === d.item.id ? null : d.item.id)}>{openId === d.item.id ? 'Done' : 'Edit'}</button>
              <button className="icon-btn" aria-label="Remove" onClick={() => setDrafts((ds) => ds.filter((x) => x.item.id !== d.item.id))}>✕</button>
            </div>
            {d.error && <div className="note bad small">{d.error}</div>}
            {openId === d.item.id && <ItemForm item={d.item} onChange={(p) => patchItem(d.item.id, p)} />}
          </div>
        ))}

        {drafts.length > 0 && (
          <button className="btn primary big" disabled={busy} onClick={saveAll}>
            {busy ? 'Still tagging…' : `Save ${drafts.length} ${drafts.length === 1 ? 'piece' : 'pieces'}`}
          </button>
        )}
      </div>
    </Sheet>
  );
}
