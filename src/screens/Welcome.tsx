import { useState } from 'react';
import { useStore } from '../state';
import { Chip } from '../components/ui';
import type { StyleProfile } from '../lib/types';

export const STYLE_OPTIONS = ['Minimalist', 'Classic', 'Casual', 'Streetwear', 'Preppy', 'Boho', 'Romantic', 'Edgy', 'Sporty', 'Smart / tailored', 'Vintage', 'Y2K', 'Scandi', 'Old money', 'Coastal', 'Grunge', 'Avant-garde', 'Workwear'];

export default function Welcome() {
  const { data, update } = useStore();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<StyleProfile>(data.profile);
  const [key, setKey] = useState(data.settings.apiKey);

  const finish = () =>
    update((d) => ({ ...d, profile: { ...p, onboarded: true }, settings: { ...d.settings, apiKey: key.trim() } }));

  return (
    <main className="page welcome">
      <div className="dots" aria-hidden>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}
      </div>

      {step === 0 && (
        <section className="stack">
          <div className="hero-mark" aria-hidden>⌒</div>
          <h1>Drape</h1>
          <p className="lead">Your whole closet in your pocket, and a stylist who picks your outfit every morning — from clothes you already own.</p>
          <ul className="ticks">
            <li>Snap your clothes; AI tags them for you</li>
            <li>Daily outfits matched to your plans and your taste</li>
            <li>Glow Up feedback, look recreation, packing lists and more</li>
            <li>Every feature free. Your photos stay on this phone.</li>
          </ul>
          <label className="field">
            <span>What should your stylist call you?</span>
            <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Your first name" autoComplete="given-name" />
          </label>
          <button className="btn primary big" onClick={() => setStep(1)}>Get started</button>
        </section>
      )}

      {step === 1 && (
        <section className="stack">
          <h2>What’s your style?</h2>
          <p className="muted">Pick as many as you like. You can change this any time.</p>
          <div className="field">
            <span>I mostly wear</span>
            <div className="chips">
              {(['womenswear', 'menswear', 'mixed'] as const).map((w) => (
                <Chip key={w} on={p.wardrobe === w} onClick={() => setP({ ...p, wardrobe: w })}>
                  {w === 'mixed' ? 'A mix / no preference' : w[0].toUpperCase() + w.slice(1)}
                </Chip>
              ))}
            </div>
          </div>
          <div className="chips">
            {STYLE_OPTIONS.map((s) => (
              <Chip key={s} on={p.styles.includes(s)} onClick={() => setP({ ...p, styles: p.styles.includes(s) ? p.styles.filter((x) => x !== s) : [...p.styles, s] })}>
                {s}
              </Chip>
            ))}
          </div>
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </section>
      )}

      {step === 2 && (
        <section className="stack">
          <h2>A few details</h2>
          <p className="muted">All optional — the more your stylist knows, the better the picks.</p>
          <label className="field">
            <span>Colours you love</span>
            <input value={p.colorsLove} onChange={(e) => setP({ ...p, colorsLove: e.target.value })} placeholder="e.g. earth tones, navy, sage green" />
          </label>
          <label className="field">
            <span>Colours you avoid</span>
            <input value={p.colorsAvoid} onChange={(e) => setP({ ...p, colorsAvoid: e.target.value })} placeholder="e.g. neon, orange" />
          </label>
          <label className="field">
            <span>Fit preferences</span>
            <input value={p.fitNotes} onChange={(e) => setP({ ...p, fitNotes: e.target.value })} placeholder="e.g. high-waisted, relaxed fits, no crop tops" />
          </label>
          <label className="field">
            <span>Your week looks like…</span>
            <input value={p.lifestyle} onChange={(e) => setP({ ...p, lifestyle: e.target.value })} placeholder="e.g. office 3 days, gym, weekend dinners" />
          </label>
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </section>
      )}

      {step === 3 && (
        <section className="stack">
          <h2>Your AI stylist</h2>
          <div className="card stack-sm">
            <h3>Claude API key</h3>
            <p className="muted small">
              The AI stylist runs on Claude. Paste a key from <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer">the Claude Console</a> —
              you pay Anthropic only for what you use (usually a few cents a day), no subscription. It stays on this device. Skip it to use the simple offline picker for now.
            </p>
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" spellCheck={false} aria-label="Claude API key" />
          </div>
          <div className="row">
            <button className="btn" onClick={() => setStep(2)}>Back</button>
            <button className="btn primary grow" onClick={finish}>Open my closet</button>
          </div>
        </section>
      )}
    </main>
  );
}

function Nav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="row">
      <button className="btn" onClick={onBack}>Back</button>
      <button className="btn primary grow" onClick={onNext}>Next</button>
    </div>
  );
}
