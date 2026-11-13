import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { chat, glowUp, outfitFinder, packTrip, friendlyError, type FinderResult, type GlowResult, type PackResult } from '../lib/ai';
import { fileToDataUrl } from '../lib/images';
import { fetchWeather, searchPlaces, weatherBrief } from '../lib/weather';
import { saveOutfit } from '../lib/actions';
import { uid } from '../lib/storage';
import { OCCASIONS, type ChatMsg } from '../lib/types';
import { ErrorNote, ItemPhoto, OutfitBoard, PhotoButton, Sheet, Spinner, shopUrl } from '../components/ui';

type Tool = 'glow' | 'finder' | 'pack' | null;

export default function Stylist() {
  const [tool, setTool] = useState<Tool>(null);
  const { ai } = useStore();
  const { go } = useNav();
  return (
    <div className="stack">
      <header className="top">
        <h1>Stylist</h1>
      </header>
      {!ai.apiKey && (
        <button className="card hint" onClick={() => go('me')}>
          The stylist needs a Claude API key. Add one in Me → Settings — it takes a minute and there’s no subscription.
        </button>
      )}
      <div className="tools">
        <button className="tool" onClick={() => setTool('glow')}>
          <span className="tool-icon" aria-hidden>✨</span>
          <span className="tool-text"><strong>Glow Up</strong><span className="muted small">Rate my outfit and make it better</span></span>
        </button>
        <button className="tool" onClick={() => setTool('finder')}>
          <span className="tool-icon" aria-hidden>🔍</span>
          <span className="tool-text"><strong>Outfit Finder</strong><span className="muted small">Recreate a look from any photo</span></span>
        </button>
        <button className="tool" onClick={() => setTool('pack')}>
          <span className="tool-icon" aria-hidden>🧳</span>
          <span className="tool-text"><strong>Pack for a trip</strong><span className="muted small">A capsule and a day-by-day plan</span></span>
        </button>
      </div>
      <Chat />
      {tool === 'glow' && <GlowUp onClose={() => setTool(null)} />}
      {tool === 'finder' && <Finder onClose={() => setTool(null)} />}
      {tool === 'pack' && <Pack onClose={() => setTool(null)} />}
    </div>
  );
}

const STARTERS = [
  'What should I wear to a dinner party on Saturday?',
  'What goes with my favourite jeans?',
  'Which pieces should I buy next to get more outfits?',
  'Give me three looks using things I haven’t worn lately',
];

function Chat() {
  const { data, update, weather, ai } = useStore();
  const { open } = useNav();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const msgs = data.chat;

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs.length, busy]);

  const send = async (t: string) => {
    if ((!t.trim() && !photo) || busy) return;
    setErr('');
    const mine: ChatMsg = { role: 'user', text: t.trim(), ...(photo ? { image: photo } : {}) };
    const history = [...msgs, mine];
    update((d) => ({ ...d, chat: [...d.chat, mine].slice(-40) }));
    setText('');
    setPhoto(null);
    setBusy(true);
    try {
      const r = await chat(ai, history, data.items, data.wears, data.profile, weatherBrief(weather?.days[0], weather?.now));
      update((d) => ({ ...d, chat: [...d.chat, { role: 'assistant' as const, text: r.reply, itemIds: r.itemIds, outfits: r.outfits }].slice(-40) }));
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="chat">
      <div className="row between">
        <h2>Ask your stylist</h2>
        {msgs.length > 0 && <button className="link small" onClick={() => update((d) => ({ ...d, chat: [] }))}>Clear</button>}
      </div>
      {!msgs.length && (
        <div className="stack-sm">
          {STARTERS.map((s) => <button key={s} className="list-btn" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
      {msgs.map((m, i) => (
        <div key={i} className={'bubble ' + m.role}>
          {m.image && <img className="bubble-img" src={m.image} alt="Your photo" />}
          {m.text && <p>{m.text}</p>}
          {m.itemIds && m.itemIds.length > 0 && (
            <div className="mini-row">
              {m.itemIds.map((id) => {
                const it = data.items.find((x) => x.id === id);
                return it ? <button key={id} onClick={() => open({ kind: 'item', id })} aria-label={it.name}><ItemPhoto item={it} size="sm" /></button> : null;
              })}
            </div>
          )}
          {m.outfits?.map((o, j) => (
            <div key={j} className="bubble-outfit">
              <strong>{o.title}</strong>
              <OutfitBoard itemIds={o.itemIds} onItem={(id) => open({ kind: 'item', id })} />
              <button className="btn small" onClick={() => open({ kind: 'outfit', itemIds: o.itemIds, name: o.title })}>Save / tweak</button>
            </div>
          ))}
        </div>
      ))}
      {busy && <Spinner label="Thinking…" />}
      <ErrorNote msg={err} />
      <div ref={end} />
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        {photo && (
          <div className="composer-photo">
            <img src={photo} alt="Attached" />
            <button type="button" className="icon-btn" aria-label="Remove photo" onClick={() => setPhoto(null)}>✕</button>
          </div>
        )}
        <div className="row">
          <PhotoButton className="icon-btn round" label="📎" onFiles={async ([f]) => setPhoto(await fileToDataUrl(f, 1200))} />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask anything about style…" aria-label="Message" />
          <button className="btn primary" disabled={busy || (!text.trim() && !photo)}>Send</button>
        </div>
      </form>
    </section>
  );
}

function useTask<T>() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<T | null>(null);
  const run = async (fn: () => Promise<T>) => {
    setErr('');
    setBusy(true);
    setResult(null);
    try {
      setResult(await fn());
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, err, result, run };
}

function GlowUp({ onClose }: { onClose: () => void }) {
  const { data, ai } = useStore();
  const { open } = useNav();
  const [photo, setPhoto] = useState<string | null>(null);
  const [occ, setOcc] = useState('Everyday');
  const t = useTask<GlowResult>();
  return (
    <Sheet title="Glow Up" onClose={onClose}>
      <div className="stack">
        <p className="muted">Take a mirror selfie or upload a photo of your outfit. You’ll get an honest score, what’s working, and how to level it up with pieces you own.</p>
        {photo ? <img className="preview" src={photo} alt="Your outfit" /> : null}
        <div className="row wrap">
          <PhotoButton className="btn grow" camera label="📷 Take photo" onFiles={async ([f]) => setPhoto(await fileToDataUrl(f, 1200))} />
          <PhotoButton className="btn grow" label="🖼️ Upload" onFiles={async ([f]) => setPhoto(await fileToDataUrl(f, 1200))} />
        </div>
        <select value={occ} onChange={(e) => setOcc(e.target.value)} aria-label="Occasion">
          {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
        <button className="btn primary big" disabled={!photo || t.busy} onClick={() => photo && t.run(() => glowUp(ai, photo, occ, data.items, data.wears, data.profile))}>✨ Glow me up</button>
        {t.busy && <Spinner label="Taking a good look…" />}
        <ErrorNote msg={t.err} />
        {t.result && (
          <div className="stack">
            <div className="score">
              <span className="score-num">{t.result.score}</span>
              <span className="muted">/10</span>
            </div>
            <p className="lead center">{t.result.verdict}</p>
            <ListCard title="What’s working" items={t.result.working} />
            <ListCard title="Level it up" items={t.result.improve} />
            {t.result.swaps.length > 0 && (
              <div className="card stack-sm">
                <h3>Try from your closet</h3>
                {t.result.swaps.map((s) => {
                  const it = data.items.find((i) => i.id === s.item_id);
                  return it ? (
                    <button key={s.item_id} className="row list-btn" onClick={() => open({ kind: 'item', id: it.id })}>
                      <ItemPhoto item={it} size="sm" />
                      <span><strong>{it.name}</strong><br /><span className="muted small">{s.why}</span></span>
                    </button>
                  ) : null;
                })}
              </div>
            )}
            <ListCard title="Finishing touches" items={t.result.finishing_touches} />
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Finder({ onClose }: { onClose: () => void }) {
  const { data, update, ai, toast } = useStore();
  const { open } = useNav();
  const [photo, setPhoto] = useState<string | null>(null);
  const t = useTask<FinderResult>();
  return (
    <Sheet title="Outfit Finder" onClose={onClose}>
      <div className="stack">
        <p className="muted">Upload any look — a screenshot from social media, a street-style photo, a celebrity outfit. You’ll see each piece, what you already own that matches, and where to shop the rest.</p>
        {photo && <img className="preview" src={photo} alt="Inspiration" />}
        <PhotoButton className="btn" label="🖼️ Choose a photo" onFiles={async ([f]) => setPhoto(await fileToDataUrl(f, 1200))} />
        <button className="btn primary big" disabled={!photo || t.busy} onClick={() => photo && t.run(() => outfitFinder(ai, photo, data.items, data.wears, data.profile))}>🔍 Find this look</button>
        {t.busy && <Spinner label="Breaking down the look…" />}
        <ErrorNote msg={t.err} />
        {t.result && (
          <div className="stack">
            <p className="lead">{t.result.summary}</p>
            {t.result.pieces.map((p, i) => (
              <div key={i} className="card stack-sm">
                <h3>{p.description}</h3>
                {p.closet_matches.length > 0 ? (
                  <div className="mini-row">
                    <span className="muted small">You own:</span>
                    {p.closet_matches.map((id) => {
                      const it = data.items.find((x) => x.id === id);
                      return it ? <button key={id} onClick={() => open({ kind: 'item', id })} aria-label={it.name}><ItemPhoto item={it} size="sm" /></button> : null;
                    })}
                  </div>
                ) : (
                  <span className="muted small">Nothing similar in your closet yet.</span>
                )}
                <div className="row wrap">
                  <a className="btn small" href={shopUrl(p.search_query)} target="_blank" rel="noreferrer">Shop similar ↗</a>
                  <button
                    className="btn small"
                    onClick={() => {
                      update((d) => ({
                        ...d,
                        items: [{
                          id: uid(), name: p.description, category: p.category, subcategory: '', colors: [], pattern: '', material: '', seasons: [], formality: 2,
                          styleTags: [], brand: '', price: null, notes: `Search: ${p.search_query}`, favorite: false, inLaundry: false, status: 'wishlist', hasPhoto: false, createdAt: Date.now(),
                        }, ...d.items],
                      }));
                      toast('Added to your wishlist');
                    }}
                  >
                    + Wishlist
                  </button>
                </div>
              </div>
            ))}
            <div className="card">
              <h3>How to recreate it</h3>
              <p>{t.result.how_to_recreate}</p>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Pack({ onClose }: { onClose: () => void }) {
  const { data, update, ai, toast } = useStore();
  const { open } = useNav();
  const [dest, setDest] = useState('');
  const [nights, setNights] = useState(4);
  const [plans, setPlans] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const t = useTask<PackResult>();

  const go = () =>
    t.run(async () => {
      let wx = '';
      try {
        const [place] = await searchPlaces(dest);
        if (place) {
          const w = await fetchWeather(place);
          wx = w.days.slice(0, Math.min(7, nights + 1)).map((d) => `${d.date}: ${weatherBrief(d)}`).join('\n');
        }
      } catch {
        /* forecast is a bonus */
      }
      return packTrip(ai, `${nights} nights in ${dest}. Plans: ${plans || 'not specified'}`, wx, data.items, data.wears, data.profile);
    });

  return (
    <Sheet title="Pack for a trip" onClose={onClose}>
      <div className="stack">
        <label className="field"><span>Where to?</span><input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="e.g. Lisbon" /></label>
        <label className="field"><span>Nights: {nights}</span><input type="range" min={1} max={21} value={nights} onChange={(e) => setNights(+e.target.value)} /></label>
        <label className="field"><span>What are you doing?</span><input value={plans} onChange={(e) => setPlans(e.target.value)} placeholder="e.g. sightseeing, one fancy dinner, beach day" /></label>
        <button className="btn primary big" disabled={!dest.trim() || t.busy} onClick={go}>🧳 Pack my bag</button>
        {t.busy && <Spinner label="Checking the forecast and packing…" />}
        <ErrorNote msg={t.err} />
        {t.result && (
          <div className="stack">
            <div className="card stack-sm">
              <h3>Packing list ({t.result.item_ids.length} pieces)</h3>
              {t.result.item_ids.map((id) => {
                const it = data.items.find((x) => x.id === id);
                if (!it) return null;
                return (
                  <label key={id} className="row check">
                    <input type="checkbox" checked={!!checked[id]} onChange={(e) => setChecked({ ...checked, [id]: e.target.checked })} />
                    <ItemPhoto item={it} size="sm" />
                    <span className={checked[id] ? 'done' : ''}>{it.name}</span>
                  </label>
                );
              })}
              {t.result.extras.map((x) => (
                <label key={x} className="row check">
                  <input type="checkbox" checked={!!checked[x]} onChange={(e) => setChecked({ ...checked, [x]: e.target.checked })} />
                  <span className={checked[x] ? 'done' : ''}>{x}</span>
                </label>
              ))}
            </div>
            {t.result.outfits.map((o, i) => (
              <div key={i} className="card">
                <h3>{o.day}: {o.title}</h3>
                <OutfitBoard itemIds={o.item_ids} onItem={(id) => open({ kind: 'item', id })} />
              </div>
            ))}
            {t.result.tips && <div className="note">{t.result.tips}</div>}
            <button
              className="btn"
              onClick={() => {
                const r = t.result!;
                update((d) => r.outfits.reduce((acc, o) => saveOutfit(acc, { name: `${dest}: ${o.title}`, itemIds: o.item_ids, occasion: 'Travel', note: o.day, source: 'ai' }), d));
                toast('Trip outfits saved');
              }}
            >
              Save these outfits
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="card">
      <h3>{title}</h3>
      <ul className="clean">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
