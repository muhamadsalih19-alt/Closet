import { useMemo, useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { wearStats } from '../lib/ai';
import { fileToDataUrl } from '../lib/images';
import { dayKey, parseDay } from '../lib/storage';
import { logWear } from '../lib/actions';
import type { Item } from '../lib/types';
import { ItemPhoto, PhotoButton, Sheet, shopUrl } from '../components/ui';
import ItemForm from '../components/ItemForm';

export default function ItemDetail({ id }: { id: string }) {
  const { data, update, setImage, toast } = useStore();
  const { close, open } = useNav();
  const item = data.items.find((i) => i.id === id);
  const [editing, setEditing] = useState(false);
  const stats = useMemo(() => wearStats(data.wears)[id], [data.wears, id]);
  const inOutfits = data.outfits.filter((o) => o.itemIds.includes(id));

  if (!item) return null;
  const set = (p: Partial<Item>) => update((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }));
  const cpw = item.price != null && stats?.count ? item.price / stats.count : null;

  const wearToday = () => {
    const today = dayKey();
    const existing = data.wears.find((w) => w.date === today);
    const ids = Array.from(new Set([...(existing?.itemIds ?? []), id]));
    update((d) => logWear(d, ids, today, existing?.occasion ?? '', existing?.outfitId ?? null));
    toast('Added to today’s outfit');
  };

  return (
    <Sheet title={item.name || 'Piece'} onClose={close}>
      <div className="stack">
        <div className="detail-photo">
          <ItemPhoto item={item} size="lg" />
        </div>
        <div className="row wrap center">
          <button className={'btn small' + (item.favorite ? ' on' : '')} onClick={() => set({ favorite: !item.favorite })}>{item.favorite ? '♥ Favourite' : '♡ Favourite'}</button>
          {item.status === 'owned' && (
            <button className={'btn small' + (item.inLaundry ? ' on' : '')} onClick={() => set({ inLaundry: !item.inLaundry })}>{item.inLaundry ? '🧺 In laundry' : '🧺 Laundry'}</button>
          )}
          <PhotoButton className="btn small" label="Change photo" onFiles={async ([f]) => { await setImage(id, await fileToDataUrl(f)); set({ hasPhoto: true }); }} />
        </div>

        {item.status === 'owned' && (
          <div className="stats">
            <div><strong>{stats?.count ?? 0}</strong><span>times worn</span></div>
            <div><strong>{stats?.last ? parseDay(stats.last).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}</strong><span>last worn</span></div>
            <div><strong>{cpw != null ? cpw.toFixed(2) : item.price != null ? item.price.toFixed(0) : '—'}</strong><span>{cpw != null ? 'cost per wear' : 'price'}</span></div>
          </div>
        )}

        {item.status === 'owned' && (
          <div className="row wrap">
            <button className="btn primary grow" onClick={() => open({ kind: 'styleItem', id })}>✦ Style this piece</button>
            <button className="btn grow" onClick={wearToday}>Wore it today</button>
          </div>
        )}
        {item.status === 'wishlist' && (
          <div className="row wrap">
            <a className="btn grow" href={shopUrl([item.brand, item.name].filter(Boolean).join(' '))} target="_blank" rel="noreferrer">Shop for it ↗</a>
            <button className="btn primary grow" onClick={() => { set({ status: 'owned', createdAt: Date.now() }); toast('Moved to your closet'); }}>I bought it</button>
          </div>
        )}

        {editing ? (
          <>
            <ItemForm item={item} onChange={set} />
            <button className="btn" onClick={() => setEditing(false)}>Done</button>
          </>
        ) : (
          <div className="card">
            <dl className="facts">
              <dt>Type</dt><dd>{[item.subcategory, item.category].filter(Boolean).join(' · ')}</dd>
              {item.colors.length > 0 && (<><dt>Colours</dt><dd>{item.colors.join(', ')}</dd></>)}
              {item.pattern && (<><dt>Pattern</dt><dd>{item.pattern}</dd></>)}
              {item.material && (<><dt>Material</dt><dd>{item.material}</dd></>)}
              {item.brand && (<><dt>Brand</dt><dd>{item.brand}</dd></>)}
              <dt>Seasons</dt><dd>{item.seasons.length ? item.seasons.join(', ') : 'All year'}</dd>
              <dt>Formality</dt><dd>{item.formality} / 5</dd>
              {item.styleTags.length > 0 && (<><dt>Style</dt><dd>{item.styleTags.join(', ')}</dd></>)}
              {item.notes && (<><dt>Notes</dt><dd>{item.notes}</dd></>)}
            </dl>
            <button className="btn small" onClick={() => setEditing(true)}>Edit details</button>
          </div>
        )}

        {inOutfits.length > 0 && <p className="muted small">In {inOutfits.length} saved {inOutfits.length === 1 ? 'outfit' : 'outfits'}.</p>}

        <div className="row wrap">
          {item.status !== 'archived' ? (
            <button className="btn small" onClick={() => { set({ status: 'archived', inLaundry: false }); toast('Archived — find it under Closet → Archived'); close(); }}>Archive (donated / sold)</button>
          ) : (
            <button className="btn small" onClick={() => { set({ status: 'owned' }); toast('Back in your closet'); }}>Restore to closet</button>
          )}
          <button
            className="btn small danger"
            onClick={async () => {
              if (!confirm(`Delete “${item.name}” for good?`)) return;
              await setImage(id, null);
              update((d) => ({
                ...d,
                items: d.items.filter((i) => i.id !== id),
                outfits: d.outfits.map((o) => ({ ...o, itemIds: o.itemIds.filter((x) => x !== id) })).filter((o) => o.itemIds.length),
              }));
              close();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </Sheet>
  );
}
