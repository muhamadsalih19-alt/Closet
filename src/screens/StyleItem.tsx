import { useEffect, useState } from 'react';
import { useStore } from '../state';
import { useNav } from '../nav';
import { suggestOutfits, friendlyError } from '../lib/ai';
import { localOutfits } from '../lib/local';
import { weatherBrief } from '../lib/weather';
import { dayKey } from '../lib/storage';
import { OCCASIONS, type Suggestion } from '../lib/types';
import { Chip, ErrorNote, Sheet, Spinner } from '../components/ui';
import SuggestionCard from '../components/SuggestionCard';

export default function StyleItem({ id }: { id: string }) {
  const { data, weather, ai } = useStore();
  const { close } = useNav();
  const item = data.items.find((i) => i.id === id);
  const [occasion, setOccasion] = useState('Everyday');
  const [list, setList] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const wd = weather?.days[0];

  const run = async (occ: string) => {
    setErr('');
    setBusy(true);
    setList([]);
    try {
      if (!ai.apiKey) setList(localOutfits(data.items, data.wears, occ, wd, 3, id));
      else {
        const r = await suggestOutfits(ai, {
          items: data.items, wears: data.wears, feedback: data.feedback, profile: data.profile,
          weather: weatherBrief(wd, weather?.now), occasion: occ, date: dayKey(), anchorId: id,
        });
        setList(r.outfits);
      }
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    run('Everyday');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Sheet title={`Ways to wear ${item?.name ?? 'this'}`} onClose={close}>
      <div className="stack">
        <div className="chips scroll">
          {OCCASIONS.map((o) => <Chip key={o} on={occasion === o} onClick={() => { setOccasion(o); run(o); }}>{o}</Chip>)}
        </div>
        {busy && <Spinner label="Building looks around it…" />}
        <ErrorNote msg={err} />
        {list.map((s, i) => <SuggestionCard key={i} s={s} occasion={occasion} />)}
      </div>
    </Sheet>
  );
}
