import { useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { planWeek, suggestOutfits, friendlyError } from '../lib/ai';
import { localOutfits } from '../lib/local';
import { addDays, dayKey, parseDay } from '../lib/storage';
import { logWear, setPlan } from '../lib/actions';
import { OCCASIONS } from '../lib/types';
import { Chip, Empty, ErrorNote, ItemPhoto, OutfitBoard, Sheet, Spinner } from '../components/ui';

type View = 'saved' | 'planner' | 'history';

export default function Outfits() {
  const [view, setView] = useState<View>('saved');
  const { open } = useNav();
  return (
    <div className="stack">
      <header className="top row between">
        <h1>Outfits</h1>
        <button className="btn primary" onClick={() => open({ kind: 'outfit' })}>+ New</button>
      </header>
      <div className="segmented" role="tablist">
        {(['saved', 'planner', 'history'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {v === 'saved' ? 'Saved' : v === 'planner' ? 'Planner' : 'Worn'}
          </button>
        ))}
      </div>
      {view === 'saved' && <Saved />}
      {view === 'planner' && <Planner />}
      {view === 'history' && <History />}
    </div>
  );
}

function Saved() {
  const { data, update } = useStore();
  const { open } = useNav();
  const [occ, setOcc] = useState('all');
  const occs = Array.from(new Set(data.outfits.map((o) => o.occasion).filter(Boolean)));
  const list = data.outfits.filter((o) => occ === 'all' || (occ === 'fav' ? o.favorite : o.occasion === occ));
  if (!data.outfits.length)
    return (
      <Empty icon="🪄" title="No saved outfits yet">
        <p className="muted">Save looks your stylist suggests, or build your own from your closet.</p>
        <button className="btn primary" onClick={() => open({ kind: 'outfit' })}>Build an outfit</button>
      </Empty>
    );
  return (
    <>
      <div className="chips scroll">
        <Chip on={occ === 'all'} onClick={() => setOcc('all')}>All</Chip>
        <Chip on={occ === 'fav'} onClick={() => setOcc('fav')}>♥ Favourites</Chip>
        {occs.map((o) => <Chip key={o} on={occ === o} onClick={() => setOcc(o)}>{o}</Chip>)}
      </div>
      {list.map((o) => (
        <article key={o.id} className="card">
          <div className="row between">
            <div>
              <h3>{o.name}</h3>
              <span className="muted small">{o.occasion}{o.source === 'ai' ? ' · by your stylist' : ''}</span>
            </div>
            <button className="icon-btn" aria-label="Favourite" onClick={() => update((d) => ({ ...d, outfits: d.outfits.map((x) => (x.id === o.id ? { ...x, favorite: !x.favorite } : x)) }))}>
              {o.favorite ? '♥' : '♡'}
            </button>
          </div>
          <OutfitBoard itemIds={o.itemIds} onItem={() => open({ kind: 'outfit', id: o.id })} />
          <button className="btn small" onClick={() => open({ kind: 'outfit', id: o.id })}>Open</button>
        </article>
      ))}
    </>
  );
}

function Planner() {
  const { data } = useStore();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [day, setDay] = useState<string | null>(null);
  const [weekOpen, setWeekOpen] = useState(false);
  const today = dayKey();
  const first = (month.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysIn }, (_, i) => dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1)))];

  return (
    <>
      <button className="btn primary" onClick={() => setWeekOpen(true)}>✦ Plan my week</button>
      <div className="row between">
        <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <h3>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <button className="icon-btn" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="cal">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="cal-head">{d}</div>)}
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const wear = data.wears.find((w) => w.date === c);
          const plan = data.plans.find((p) => p.date === c);
          const ids = wear?.itemIds ?? plan?.itemIds ?? [];
          const pieces = ids.map((x) => data.items.find((it) => it.id === x)).filter((it) => !!it);
          const lead = pieces.find((it) => it.category !== 'shoes' && it.category !== 'bag') ?? pieces[0];
          return (
            <button key={i} className={'cal-day' + (c === today ? ' today' : '') + (wear ? ' worn' : plan ? ' planned' : '')} onClick={() => setDay(c)}>
              <span className="cal-num">{+c.slice(8)}</span>
              {lead && <ItemPhoto item={lead} size="sm" />}
            </button>
          );
        })}
      </div>
      <p className="muted small center">Filled days are worn; outlined days are planned. Tap a day to plan or log.</p>
      {day && <DaySheet date={day} onClose={() => setDay(null)} />}
      {weekOpen && <WeekSheet onClose={() => setWeekOpen(false)} />}
    </>
  );
}

function DaySheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { data, update, ai, toast } = useStore();
  const { open } = useNav();
  const [occ, setOcc] = useState('Everyday');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const wear = data.wears.find((w) => w.date === date);
  const plan = data.plans.find((p) => p.date === date);
  const past = date < dayKey();
  const label = parseDay(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  const styleDay = async () => {
    setErr('');
    setBusy(true);
    try {
      const s = ai.apiKey
        ? (await suggestOutfits(ai, { items: data.items, wears: data.wears, feedback: data.feedback, profile: data.profile, occasion: occ, date, count: 1 })).outfits[0]
        : localOutfits(data.items, data.wears, occ, 1)[0];
      if (!s) throw new Error('Add more clothes to your closet first.');
      update((d) => setPlan(d, date, s.itemIds, s.title, s.why));
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={label} onClose={onClose}>
      <div className="stack">
        {wear && (
          <div className="card">
            <h3>Worn</h3>
            <OutfitBoard itemIds={wear.itemIds} onItem={(id) => open({ kind: 'item', id })} />
            <button className="btn small" onClick={() => update((d) => ({ ...d, wears: d.wears.filter((w) => w.date !== date) }))}>Remove log</button>
          </div>
        )}
        {plan && (
          <div className="card">
            <h3>Planned: {plan.title}</h3>
            <OutfitBoard itemIds={plan.itemIds} onItem={(id) => open({ kind: 'item', id })} />
            {plan.note && <p className="muted small">{plan.note}</p>}
            <div className="row wrap">
              {!wear && <button className="btn small primary" onClick={() => { update((d) => logWear(d, plan.itemIds, date)); toast('Logged'); }}>Mark as worn</button>}
              <button className="btn small" onClick={() => open({ kind: 'outfit', itemIds: plan.itemIds, name: plan.title })}>Edit</button>
              <button className="btn small" onClick={() => update((d) => setPlan(d, date, [], ''))}>Clear plan</button>
            </div>
          </div>
        )}
        {!past && (
          <div className="stack-sm">
            <h3>{plan ? 'Replan this day' : 'Plan this day'}</h3>
            <select value={occ} onChange={(e) => setOcc(e.target.value)} aria-label="Occasion">
              {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <button className="btn primary" disabled={busy} onClick={styleDay}>✦ Let my stylist pick</button>
            {busy && <Spinner label="Picking…" />}
            <ErrorNote msg={err} />
          </div>
        )}
        {data.outfits.length > 0 && (
          <div className="stack-sm">
            <h3>{past ? 'Log a saved outfit' : 'Or choose a saved outfit'}</h3>
            {data.outfits.slice(0, 12).map((o) => (
              <button
                key={o.id}
                className="list-btn"
                onClick={() => {
                  update((d) => (past ? logWear(d, o.itemIds, date, o.occasion, o.id) : setPlan(d, date, o.itemIds, o.name)));
                  toast(past ? 'Logged' : 'Planned');
                }}
              >
                {o.name} <span className="muted small">· {o.occasion}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function WeekSheet({ onClose }: { onClose: () => void }) {
  const { data, update, ai, toast } = useStore();
  const today = dayKey();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [occs, setOccs] = useState<string[]>(() => dates.map((d) => ([0, 6].includes(parseDay(d).getDay()) ? 'Everyday' : data.profile.lifestyle.toLowerCase().includes('office') ? 'Work' : 'Everyday')));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setErr('');
    setBusy(true);
    try {
      const days = dates.map((date, i) => ({ date, occasion: occs[i] }));
      if (ai.apiKey) {
        const plan = await planWeek(ai, { items: data.items, wears: data.wears, feedback: data.feedback, profile: data.profile, days });
        update((d) => plan.reduce((acc, p) => (p.item_ids.length ? setPlan(acc, p.date, p.item_ids, p.title, p.note) : acc), d));
      } else {
        update((d) => days.reduce((acc, day) => {
          const s = localOutfits(acc.items, acc.wears, day.occasion, 1)[0];
          return s ? setPlan(acc, day.date, s.itemIds, `${day.occasion} look`) : acc;
        }, d));
      }
      toast('Your week is planned');
      onClose();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Plan my week" onClose={onClose}>
      <div className="stack">
        <p className="muted">Set what each day looks like. Your stylist plans around it and avoids repeats.</p>
        {dates.map((d, i) => {
          return (
            <div key={d} className="row between">
              <span>
                <strong>{parseDay(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</strong>
              </span>
              <select className="inline" value={occs[i]} onChange={(e) => setOccs(occs.map((o, j) => (j === i ? e.target.value : o)))} aria-label={`Occasion for ${d}`}>
                {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          );
        })}
        <button className="btn primary big" disabled={busy} onClick={run}>✦ Plan it</button>
        {busy && <Spinner label="Planning seven days of outfits…" />}
        <ErrorNote msg={err} />
      </div>
    </Sheet>
  );
}

function History() {
  const { data } = useStore();
  const { open } = useNav();
  const list = [...data.wears].reverse();
  if (!list.length)
    return (
      <Empty icon="📅" title="Nothing logged yet">
        <p className="muted">Tap “Wear this today” on any outfit and it shows up here — and in your stats.</p>
      </Empty>
    );
  return (
    <>
      {list.slice(0, 60).map((w) => (
        <article key={w.id} className="card">
          <div className="row between">
            <h3>{parseDay(w.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</h3>
            {w.occasion && <span className="pill">{w.occasion}</span>}
          </div>
          <OutfitBoard itemIds={w.itemIds} onItem={(id) => open({ kind: 'item', id })} />
        </article>
      ))}
    </>
  );
}
