import { useMemo, useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { auditCloset, friendlyError, testKey, wearStats, MODELS, type AuditResult } from '../lib/ai';
import { clearAll, dayKey, addDays, exportBackup, parseBackup } from '../lib/storage';
import { CATEGORIES, CATEGORY_LABEL, type StyleProfile } from '../lib/types';
import { Chip, ErrorNote, ItemPhoto, Spinner, shopUrl } from '../components/ui';
import { STYLE_OPTIONS } from './Welcome';

type View = 'insights' | 'profile' | 'settings';

export default function Me() {
  const { data } = useStore();
  const [view, setView] = useState<View>(data.settings.apiKey ? 'insights' : 'settings');
  return (
    <div className="stack">
      <header className="top"><h1>{data.profile.name || 'Me'}</h1></header>
      <div className="segmented" role="tablist">
        {(['insights', 'profile', 'settings'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {v === 'insights' ? 'Insights' : v === 'profile' ? 'Style profile' : 'Settings'}
          </button>
        ))}
      </div>
      {view === 'insights' && <Insights />}
      {view === 'profile' && <Profile />}
      {view === 'settings' && <SettingsView />}
    </div>
  );
}

const COLOR_HEX: Record<string, string> = {
  black: '#111', white: '#fafafa', grey: '#9a9a9a', gray: '#9a9a9a', navy: '#1f2b4d', blue: '#3b6fd8', 'light blue': '#9cc3ef', denim: '#4a6a95',
  red: '#c8352e', burgundy: '#6d1f2a', pink: '#f0a6c0', purple: '#7b4fa8', lilac: '#c8b3e6', green: '#3d8a4f', olive: '#6b6b2e', sage: '#a3b59a',
  yellow: '#efc94c', mustard: '#c99a2e', orange: '#e57a2e', brown: '#6b4a2e', tan: '#c9a27a', camel: '#c19a6b', beige: '#e2d3b9', cream: '#f4ecd8',
  khaki: '#b8a77a', gold: '#d4af37', silver: '#c0c0c0', teal: '#2e8a87', ivory: '#fffbea', charcoal: '#36454f',
};
const hex = (c: string) => COLOR_HEX[c.toLowerCase()] ?? COLOR_HEX[c.toLowerCase().split(' ').pop() ?? ''] ?? '#ccc';

function Insights() {
  const { data, ai } = useStore();
  const { open } = useNav();
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const owned = data.items.filter((i) => i.status === 'owned');
  const stats = useMemo(() => wearStats(data.wears), [data.wears]);
  const value = owned.reduce((s, i) => s + (i.price ?? 0), 0);
  const monthAgo = addDays(dayKey(), -30);
  const last30 = data.wears.filter((w) => w.date >= monthAgo).length;
  const wornIds = new Set(data.wears.filter((w) => w.date >= addDays(dayKey(), -90)).flatMap((w) => w.itemIds));
  const usage = owned.length ? Math.round((owned.filter((i) => wornIds.has(i.id)).length / owned.length) * 100) : 0;
  const most = [...owned].filter((i) => stats[i.id]).sort((a, b) => stats[b.id].count - stats[a.id].count).slice(0, 5);
  const never = owned.filter((i) => !stats[i.id] && Date.now() - i.createdAt > 14 * 86400000);
  const cpw = owned.filter((i) => i.price != null && stats[i.id]).map((i) => ({ i, v: i.price! / stats[i.id].count })).sort((a, b) => a.v - b.v);
  const colors = Object.entries(owned.flatMap((i) => i.colors.slice(0, 1).map((c) => c.toLowerCase())).reduce<Record<string, number>>((m, c) => ((m[c] = (m[c] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxCat = Math.max(1, ...CATEGORIES.map((c) => owned.filter((i) => i.category === c).length));

  const runAudit = async () => {
    setErr('');
    setBusy(true);
    try {
      setAudit(await auditCloset(ai, data.items, data.wears, data.profile));
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="tiles">
        <div className="tile-stat"><strong>{owned.length}</strong><span>pieces</span></div>
        <div className="tile-stat"><strong>{last30}</strong><span>outfits logged (30 days)</span></div>
        <div className="tile-stat"><strong>{usage}%</strong><span>of closet worn (90 days)</span></div>
        <div className="tile-stat"><strong>{value ? Math.round(value).toLocaleString() : '—'}</strong><span>closet value</span></div>
      </div>

      <section className="card stack-sm">
        <h3>Closet audit</h3>
        <p className="muted small">Your stylist reviews everything: gaps worth filling, pieces to let go, and new ways to wear what you ignore.</p>
        <button className="btn primary" disabled={busy || owned.length < 3} onClick={runAudit}>✦ Audit my closet</button>
        {busy && <Spinner label="Going through every hanger…" />}
        <ErrorNote msg={err} />
        {audit && (
          <div className="stack-sm">
            <p>{audit.overview}</p>
            {audit.gaps.length > 0 && <h4>Worth adding</h4>}
            {audit.gaps.map((g, i) => (
              <div key={i} className="row between list-row">
                <span><strong>{g.piece}</strong><br /><span className="muted small">{g.why}</span></span>
                <a className="btn small" href={shopUrl(g.search_query)} target="_blank" rel="noreferrer">Shop ↗</a>
              </div>
            ))}
            {audit.underused.length > 0 && <h4>Wear these more</h4>}
            {audit.underused.map((u) => <AuditItem key={u.item_id} id={u.item_id} text={u.idea} />)}
            {audit.declutter.length > 0 && <h4>Consider letting go</h4>}
            {audit.declutter.map((u) => <AuditItem key={u.item_id} id={u.item_id} text={u.why} />)}
          </div>
        )}
      </section>

      {most.length > 0 && (
        <section className="card stack-sm">
          <h3>Most worn</h3>
          {most.map((i) => (
            <button key={i.id} className="row list-btn" onClick={() => open({ kind: 'item', id: i.id })}>
              <ItemPhoto item={i} size="sm" /><span className="grow">{i.name}</span><span className="muted">{stats[i.id].count}×</span>
            </button>
          ))}
        </section>
      )}

      {cpw.length > 0 && (
        <section className="card stack-sm">
          <h3>Best value (cost per wear)</h3>
          {cpw.slice(0, 5).map(({ i, v }) => (
            <button key={i.id} className="row list-btn" onClick={() => open({ kind: 'item', id: i.id })}>
              <ItemPhoto item={i} size="sm" /><span className="grow">{i.name}</span><span className="muted">{v.toFixed(2)}</span>
            </button>
          ))}
        </section>
      )}

      {never.length > 0 && (
        <section className="card stack-sm">
          <h3>Never worn ({never.length})</h3>
          <p className="muted small">Tap one and choose “Style this piece” for ideas.</p>
          <div className="mini-row wrap">
            {never.map((i) => <button key={i.id} onClick={() => open({ kind: 'item', id: i.id })} aria-label={i.name}><ItemPhoto item={i} size="sm" /></button>)}
          </div>
        </section>
      )}

      {owned.length > 0 && (
        <section className="card stack-sm">
          <h3>What’s in your closet</h3>
          {CATEGORIES.filter((c) => owned.some((i) => i.category === c)).map((c) => {
            const n = owned.filter((i) => i.category === c).length;
            return (
              <div key={c} className="bar-row">
                <span>{CATEGORY_LABEL[c]}</span>
                <span className="bar"><span style={{ width: `${(n / maxCat) * 100}%` }} /></span>
                <span className="muted">{n}</span>
              </div>
            );
          })}
          {colors.length > 0 && (
            <>
              <h4>Your colours</h4>
              <div className="swatches">
                {colors.map(([c, n]) => (
                  <span key={c} className="swatch"><span style={{ background: hex(c) }} />{c} · {n}</span>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

function AuditItem({ id, text }: { id: string; text: string }) {
  const { data } = useStore();
  const { open } = useNav();
  const it = data.items.find((i) => i.id === id);
  if (!it) return null;
  return (
    <button className="row list-btn" onClick={() => open({ kind: 'item', id })}>
      <ItemPhoto item={it} size="sm" />
      <span><strong>{it.name}</strong><br /><span className="muted small">{text}</span></span>
    </button>
  );
}

function Profile() {
  const { data, update, toast } = useStore();
  const [p, setP] = useState<StyleProfile>(data.profile);
  const field = (k: keyof StyleProfile, label: string, ph: string) => (
    <label className="field">
      <span>{label}</span>
      <input value={p[k] as string} onChange={(e) => setP({ ...p, [k]: e.target.value })} placeholder={ph} />
    </label>
  );
  return (
    <div className="stack">
      {field('name', 'Name', 'Your first name')}
      <div className="field">
        <span>I mostly wear</span>
        <div className="chips">
          {(['womenswear', 'menswear', 'mixed'] as const).map((w) => (
            <Chip key={w} on={p.wardrobe === w} onClick={() => setP({ ...p, wardrobe: w })}>{w === 'mixed' ? 'A mix' : w[0].toUpperCase() + w.slice(1)}</Chip>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Styles I like</span>
        <div className="chips">
          {STYLE_OPTIONS.map((s) => (
            <Chip key={s} on={p.styles.includes(s)} onClick={() => setP({ ...p, styles: p.styles.includes(s) ? p.styles.filter((x) => x !== s) : [...p.styles, s] })}>{s}</Chip>
          ))}
        </div>
      </div>
      {field('colorsLove', 'Colours I love', 'e.g. earth tones, navy')}
      {field('colorsAvoid', 'Colours I avoid', 'e.g. neon')}
      {field('fitNotes', 'Fit preferences', 'e.g. relaxed fits, high-waisted')}
      {field('lifestyle', 'My week', 'e.g. office 3 days, gym, weekend dinners')}
      <p className="muted small">Your stylist also learns from every 👍 and 👎 ({data.feedback.length} so far).</p>
      <button className="btn primary" onClick={() => { update((d) => ({ ...d, profile: { ...p, onboarded: true } })); toast('Style profile saved'); }}>Save</button>
      {data.feedback.length > 0 && <button className="btn small" onClick={() => { update((d) => ({ ...d, feedback: [] })); toast('Taste feedback reset'); }}>Reset taste feedback</button>}
    </div>
  );
}

function SettingsView() {
  const { data, images, update, replaceAll, toast } = useStore();
  const s = data.settings;
  const [key, setKey] = useState(s.apiKey);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const set = (p: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...p } }));

  const saveKey = async () => {
    setErr('');
    setMsg('');
    const k = key.trim();
    set({ apiKey: k });
    if (!k) return setMsg('Key removed. The offline picker is in use.');
    setTesting(true);
    try {
      await testKey({ apiKey: k, model: s.model });
      setMsg('Connected — your stylist is ready.');
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setTesting(false);
    }
  };

  const doExport = () => {
    const blob = new Blob([exportBackup(data, images)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `drape-backup-${dayKey()}.json`;
    a.click();
  };

  const doImport = async (f: File) => {
    try {
      const { data: d, images: imgs } = parseBackup(await f.text(), data);
      if (!confirm('Replace everything in the app with this backup?')) return;
      await replaceAll(d, imgs);
      toast('Backup restored');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not read that file.');
    }
  };

  return (
    <div className="stack">
      <section className="card stack-sm">
        <h3>Claude API key</h3>
        <p className="muted small">
          Powers tagging, outfits, chat and every AI tool. Create one at <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">platform.claude.com</a> and add a little credit — you pay Anthropic per use, no subscription. The key stays on this device and is never in backups.
        </p>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" spellCheck={false} aria-label="Claude API key" type="password" />
        <button className="btn primary" disabled={testing} onClick={saveKey}>{testing ? 'Checking…' : 'Save and test'}</button>
        {msg && <div className="note good">{msg}</div>}
        <ErrorNote msg={err} />
        <label className="field">
          <span>Stylist model</span>
          <select value={s.model} onChange={(e) => set({ model: e.target.value })}>
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </section>


      <section className="card stack-sm">
        <h3>Your data</h3>
        <p className="muted small">Everything lives on this device. Back up to move to a new phone, or just to be safe.</p>
        <div className="row wrap">
          <button className="btn grow" onClick={doExport}>Download backup</button>
          <label className="btn grow">
            Restore backup
            <input type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) doImport(f); }} />
          </label>
        </div>
        <button
          className="btn small danger"
          onClick={async () => {
            if (!confirm('Delete your whole closet, outfits and history from this device? This cannot be undone.')) return;
            await clearAll();
            location.reload();
          }}
        >
          Delete everything
        </button>
      </section>

      <p className="muted small center">Drape · build {__BUILD__} · free and open, no paywall.</p>
    </div>
  );
}
