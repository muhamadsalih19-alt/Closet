import { useState } from 'react';
import { useStore } from '../state';
import { songsForFit, friendlyError, type SongResult } from '../lib/ai';
import { fileToDataUrl } from '../lib/images';
import { dayKey } from '../lib/storage';
import { ErrorNote, OutfitBoard, PhotoButton, Sheet, Spinner } from './ui';

const spotify = (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`;
const youtube = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/** Suggests songs (and captions) for posting an outfit on Instagram. */
export default function SongForFit({ onClose, itemIds }: { onClose: () => void; itemIds?: string[] }) {
  const { data, update, ai, toast } = useStore();
  const todays = data.wears.filter((w) => w.date === dayKey()).at(-1);
  const [photo, setPhoto] = useState<string | null>(null);
  const [useIds, setUseIds] = useState<string[] | null>(itemIds ?? null);
  const [taste, setTaste] = useState(data.profile.musicTaste ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState<SongResult | null>(null);

  const describeOutfit = (ids: string[]) =>
    ids
      .map((id) => data.items.find((i) => i.id === id))
      .filter((i) => !!i)
      .map((i) => `${i.name} (${[i.colors.join(' and '), i.pattern !== 'solid' ? i.pattern : '', i.material].filter(Boolean).join(', ')})`)
      .join('; ');

  const run = async (more = false) => {
    setErr('');
    setBusy(true);
    if (taste !== (data.profile.musicTaste ?? '')) update((d) => ({ ...d, profile: { ...d.profile, musicTaste: taste.trim() } }));
    try {
      const out = await songsForFit(ai, {
        photo: photo ?? undefined,
        outfit: !photo && useIds ? describeOutfit(useIds) : undefined,
        taste,
        profile: data.profile,
        avoid: more && res ? res.songs.map((s) => `${s.title} by ${s.artist}`) : undefined,
      });
      setRes(out);
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const ready = !!photo || !!useIds?.length;

  return (
    <Sheet title="Song for my fit" onClose={onClose}>
      <div className="stack">
        <p className="muted">Posting your outfit? Get songs that match the vibe to add on Instagram, plus caption ideas.</p>

        {photo ? (
          <img className="preview" src={photo} alt="Your outfit" />
        ) : useIds?.length ? (
          <OutfitBoard itemIds={useIds} />
        ) : null}

        <div className="row wrap">
          <PhotoButton className="btn grow" camera label="📷 Take a photo" onFiles={async ([f]) => { setPhoto(await fileToDataUrl(f, 1200)); setUseIds(null); setRes(null); }} />
          <PhotoButton className="btn grow" label="🖼️ Upload" onFiles={async ([f]) => { setPhoto(await fileToDataUrl(f, 1200)); setUseIds(null); setRes(null); }} />
        </div>
        {todays && !photo && !useIds && (
          <button className="btn" onClick={() => setUseIds(todays.itemIds)}>Use today’s outfit</button>
        )}

        <label className="field">
          <span>Music you like (optional, remembered)</span>
          <input value={taste} onChange={(e) => setTaste(e.target.value)} placeholder="e.g. Arabic, hip hop, chill R&B" />
        </label>

        <button className="btn primary big" disabled={!ready || busy} onClick={() => run(false)}>🎵 Find songs</button>
        {busy && <Spinner label="Listening to your outfit…" />}
        <ErrorNote msg={err} />

        {res && (
          <div className="stack">
            <p className="lead center">Vibe: {res.vibe}</p>
            {res.songs.map((s, i) => {
              const q = `${s.title} ${s.artist}`;
              return (
                <div key={i} className="card song">
                  <div>
                    <strong>{s.title}</strong>
                    <div className="muted">{s.artist}</div>
                  </div>
                  <p className="small">{s.why}</p>
                  <p className="small muted">Use: {s.best_part}</p>
                  <div className="row wrap">
                    <a className="btn small" href={spotify(q)} target="_blank" rel="noreferrer">Play on Spotify ↗</a>
                    <a className="btn small" href={youtube(q)} target="_blank" rel="noreferrer">YouTube ↗</a>
                    <button className="btn small" onClick={() => { navigator.clipboard?.writeText(q).then(() => toast('Copied — paste it in Instagram’s music search'), () => toast(q)); }}>Copy name</button>
                  </div>
                </div>
              );
            })}
            <button className="btn" disabled={busy} onClick={() => run(true)}>Different songs</button>
            {res.captions.length > 0 && (
              <div className="card stack-sm">
                <h3>Caption ideas</h3>
                {res.captions.map((c, i) => (
                  <button key={i} className="list-btn" onClick={() => { navigator.clipboard?.writeText(c).then(() => toast('Caption copied'), () => toast(c)); }}>
                    <span className="grow">{c}</span>
                    <span className="muted small">Copy</span>
                  </button>
                ))}
              </div>
            )}
            <p className="muted small center">Tip: in Instagram, tap the music icon when posting and search the song name.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
