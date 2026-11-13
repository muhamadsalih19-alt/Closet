import { useMemo, useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { wearStats } from '../lib/ai';
import { CATEGORIES, CATEGORY_LABEL, type ItemStatus } from '../lib/types';
import { Chip, Empty, ItemTile } from '../components/ui';

type Sort = 'new' | 'most' | 'least' | 'name';

export default function Closet() {
  const { data, update, toast } = useStore();
  const { open } = useNav();
  const [status, setStatus] = useState<ItemStatus>('owned');
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const stats = useMemo(() => wearStats(data.wears), [data.wears]);

  const inStatus = data.items.filter((i) => i.status === status);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, inStatus.filter((i) => i.category === c).length]));
  const needle = q.trim().toLowerCase();
  const shown = inStatus
    .filter((i) => cat === 'all' || (cat === 'fav' ? i.favorite : cat === 'laundry' ? i.inLaundry : i.category === cat))
    .filter((i) => !needle || [i.name, i.subcategory, i.brand, i.material, i.pattern, ...i.colors, ...i.styleTags].join(' ').toLowerCase().includes(needle))
    .sort((a, b) => {
      if (sort === 'most') return (stats[b.id]?.count ?? 0) - (stats[a.id]?.count ?? 0);
      if (sort === 'least') return (stats[a.id]?.count ?? 0) - (stats[b.id]?.count ?? 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return b.createdAt - a.createdAt;
    });
  const laundry = data.items.filter((i) => i.inLaundry).length;

  return (
    <div className="stack">
      <header className="top row between">
        <h1>Closet</h1>
        <button className="btn primary" onClick={() => open({ kind: 'add', status: status === 'wishlist' ? 'wishlist' : 'owned' })}>+ Add</button>
      </header>

      <div className="segmented" role="tablist">
        {(['owned', 'wishlist', 'archived'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={status === s} className={status === s ? 'on' : ''} onClick={() => { setStatus(s); setCat('all'); }}>
            {s === 'owned' ? `Closet (${data.items.filter((i) => i.status === 'owned').length})` : s === 'wishlist' ? 'Wishlist' : 'Archived'}
          </button>
        ))}
      </div>

      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search colour, brand, type…" aria-label="Search closet" />

      <div className="chips scroll">
        <Chip on={cat === 'all'} onClick={() => setCat('all')}>All {inStatus.length}</Chip>
        <Chip on={cat === 'fav'} onClick={() => setCat('fav')}>♥ Favourites</Chip>
        {laundry > 0 && status === 'owned' && <Chip on={cat === 'laundry'} onClick={() => setCat('laundry')}>Laundry {laundry}</Chip>}
        {CATEGORIES.filter((c) => counts[c]).map((c) => (
          <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]} {counts[c]}</Chip>
        ))}
      </div>

      <div className="row between">
        <label className="row small muted">
          Sort
          <select className="inline" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="new">Newest</option>
            <option value="most">Most worn</option>
            <option value="least">Least worn</option>
            <option value="name">Name</option>
          </select>
        </label>
        {laundry > 0 && status === 'owned' && (
          <button className="link small" onClick={() => { update((d) => ({ ...d, items: d.items.map((i) => ({ ...i, inLaundry: false })) })); toast('Laundry done — everything is back'); }}>
            Laundry done
          </button>
        )}
      </div>

      {shown.length ? (
        <div className="grid">
          {shown.map((i) => (
            <ItemTile key={i.id} item={i} onClick={() => open({ kind: 'item', id: i.id })} badge={sort !== 'new' && status === 'owned' ? `${stats[i.id]?.count ?? 0}× worn` : undefined} />
          ))}
        </div>
      ) : (
        <Empty icon={status === 'wishlist' ? '🛍️' : '🧺'} title={inStatus.length ? 'Nothing matches' : status === 'wishlist' ? 'Your wishlist is empty' : status === 'archived' ? 'Nothing archived' : 'Your closet is empty'}>
          {!inStatus.length && status !== 'archived' && (
            <>
              <p className="muted">{status === 'wishlist' ? 'Save pieces you want to buy, with or without a photo.' : 'Take photos of your clothes one at a time on a plain background. You can pick lots at once.'}</p>
              <button className="btn primary" onClick={() => open({ kind: 'add', status })}>Add {status === 'wishlist' ? 'to wishlist' : 'clothes'}</button>
            </>
          )}
        </Empty>
      )}
    </div>
  );
}
