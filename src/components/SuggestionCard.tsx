import { useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { giveFeedback, logWear, saveOutfit } from '../lib/actions';
import { OutfitBoard, useShareOutfit } from './ui';
import type { Suggestion } from '../lib/types';

export default function SuggestionCard({ s, occasion, onWear }: { s: Suggestion; occasion: string; onWear?: () => void }) {
  const { update, toast } = useStore();
  const { open } = useNav();
  const share = useShareOutfit();
  const [vote, setVote] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  const rate = (liked: boolean) => {
    if (vote !== null) return;
    setVote(liked);
    update((d) => giveFeedback(d, s.itemIds, liked));
    toast(liked ? 'Noted — more like this' : 'Noted — less like this');
  };

  return (
    <article className="card suggestion">
      <h3>{s.title}</h3>
      <OutfitBoard itemIds={s.itemIds} onItem={(id) => open({ kind: 'item', id })} />
      {s.why && <p>{s.why}</p>}
      {s.tip && <p className="tip">💡 {s.tip}</p>}
      <div className="row wrap">
        <button
          className="btn primary grow"
          onClick={() => {
            update((d) => logWear(d, s.itemIds, undefined, occasion));
            toast('Logged as today’s outfit');
            onWear?.();
          }}
        >
          Wear this today
        </button>
        <button className={'icon-btn round' + (vote === true ? ' on' : '')} onClick={() => rate(true)} aria-label="I like this">👍</button>
        <button className={'icon-btn round' + (vote === false ? ' on' : '')} onClick={() => rate(false)} aria-label="Not for me">👎</button>
      </div>
      <div className="row wrap">
        <button
          className="btn small"
          disabled={saved}
          onClick={() => {
            update((d) => saveOutfit(d, { name: s.title, itemIds: s.itemIds, occasion, note: s.why, source: 'ai' }));
            setSaved(true);
            toast('Saved to Outfits');
          }}
        >
          {saved ? 'Saved ✓' : 'Save outfit'}
        </button>
        <button className="btn small" onClick={() => open({ kind: 'outfit', itemIds: s.itemIds, name: s.title, occasion })}>Tweak</button>
        <button className="btn small" onClick={() => share(s.title, s.itemIds)}>Share</button>
      </div>
    </article>
  );
}
