import { useState } from 'react';
import { currentPosition, searchPlaces } from '../lib/weather';
import type { Place } from '../lib/types';
import { ErrorNote } from './ui';

export default function LocationPicker({ value, onChange }: { value: Place | null; onChange: (p: Place | null) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack-sm">
      {value && (
        <div className="row between">
          <span>📍 {value.name}</span>
          <button className="link" onClick={() => onChange(null)}>Change</button>
        </div>
      )}
      {!value && (
        <>
          <button className="btn" disabled={busy} onClick={() => run(async () => onChange(await currentPosition()))}>📍 Use my location</button>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) run(async () => setResults(await searchPlaces(q.trim())));
            }}
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or search for your city" aria-label="City" />
            <button className="btn" disabled={busy || !q.trim()}>Search</button>
          </form>
          {results.map((r) => (
            <button key={`${r.lat},${r.lon}`} className="list-btn" onClick={() => { onChange(r); setResults([]); setQ(''); }}>
              {r.name}
            </button>
          ))}
        </>
      )}
      <ErrorNote msg={err} />
    </div>
  );
}
