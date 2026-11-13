import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { suggestOutfits, friendlyError } from '../lib/ai';
import { localOutfits } from '../lib/local';
import { dayKey } from '../lib/storage';
import { logWear } from '../lib/actions';
import { OCCASIONS, type Suggestion } from '../lib/types';
import { Chip, Empty, ErrorNote, OutfitBoard, Spinner } from '../components/ui';
import SuggestionCard from '../components/SuggestionCard';

const CACHE = 'drape-today';

function readCache(): { date: string; occasion: string; list: Suggestion[] } | null {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE) ?? 'null');
    return v?.date === dayKey() ? v : null;
  } catch {
    return null;
  }
}

export default function Today() {
  const { data, update, ai, toast } = useStore();
  const { open } = useNav();
  const today = dayKey();
  const cached = useMemo(readCache, []);
  const [occasion, setOccasion] = useState(cached?.occasion ?? 'Everyday');
  const [extra, setExtra] = useState('');
  const [list, setList] = useState<Suggestion[]>(cached?.list ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [missing, setMissing] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(CACHE, JSON.stringify({ date: today, occasion, list }));
    } catch {
      /* storage unavailable */
    }
  }, [list, occasion, today]);

  const owned = data.items.filter((i) => i.status === 'owned');
  const plan = data.plans.find((p) => p.date === today);
  const worn = data.wears.find((w) => w.date === today);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const styleMe = async (more = false) => {
    setErr('');
    setMissing('');
    setBusy(true);
    try {
      if (!ai.apiKey) {
        const res = localOutfits(data.items, data.wears, occasion, 3);
        if (!res.length) setErr('Add a few tops, bottoms and shoes to your closet first.');
        setList(more ? [...list, ...res] : res);
      } else {
        const res = await suggestOutfits(ai, {
          items: data.items,
          wears: data.wears,
          feedback: data.feedback,
          profile: data.profile,
          occasion,
          date: today,
          extra,
          avoid: more ? list.map((l) => l.itemIds) : undefined,
        });
        setMissing(res.missing);
        setList(more ? [...list, ...res.outfits] : res.outfits);
      }
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <header className="top">
        <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>{hello}{data.profile.name ? `, ${data.profile.name}` : ''}</h1>
      </header>


      {worn && (
        <section className="card">
          <div className="row between"><h3>Today’s outfit</h3><span className="pill good">Logged</span></div>
          <OutfitBoard itemIds={worn.itemIds} onItem={(id) => open({ kind: 'item', id })} />
        </section>
      )}

      {plan && !worn && (
        <section className="card">
          <div className="row between"><h3>Planned for today</h3><span className="pill">{plan.title}</span></div>
          <OutfitBoard itemIds={plan.itemIds} onItem={(id) => open({ kind: 'item', id })} />
          {plan.note && <p className="muted small">{plan.note}</p>}
          <button className="btn primary" onClick={() => { update((d) => logWear(d, plan.itemIds)); toast('Logged as today’s outfit'); }}>Wear this today</button>
        </section>
      )}

      {owned.length < 3 ? (
        <Empty icon="🧺" title="Let’s fill your closet">
          <p className="muted">Snap a few tops, bottoms and shoes. The AI tags each piece for you, then your stylist can get to work.</p>
          <button className="btn primary" onClick={() => open({ kind: 'add' })}>Add clothes</button>
        </Empty>
      ) : (
        <section className="stack-sm">
          <h2>What’s the plan today?</h2>
          <div className="chips scroll">
            {OCCASIONS.map((o) => <Chip key={o} on={occasion === o} onClick={() => setOccasion(o)}>{o}</Chip>)}
          </div>
          {ai.apiKey && (
            <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Anything else? e.g. “lots of walking”, “wear my new boots”" aria-label="Extra request" />
          )}
          <button className="btn primary big" disabled={busy} onClick={() => styleMe(false)}>
            {list.length ? '↻ New picks' : '✦ Style me'}
          </button>
          {!ai.apiKey && <p className="muted small center">Using the simple offline picker. Add a Claude API key in Me → Settings for real styling.</p>}
        </section>
      )}

      {busy && <Spinner label="Your stylist is pulling looks…" />}
      <ErrorNote msg={err} />
      {missing && <div className="note">{missing}</div>}

      {list.map((s, i) => <SuggestionCard key={i + s.itemIds.join()} s={s} occasion={occasion} />)}
      {list.length > 0 && !busy && <button className="btn" onClick={() => styleMe(true)}>Show me more</button>}
    </div>
  );
}
