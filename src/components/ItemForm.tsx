import { CATEGORIES, CATEGORY_LABEL, SEASONS, type Item } from '../lib/types';
import { Chip } from './ui';

const FORMALITY = ['', 'Very casual', 'Casual', 'Smart casual', 'Dressy', 'Formal'];
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function ItemForm({ item, onChange }: { item: Item; onChange: (patch: Partial<Item>) => void }) {
  return (
    <div className="stack-sm">
      <label className="field">
        <span>Name</span>
        <input value={item.name} onChange={(e) => onChange({ name: e.target.value })} />
      </label>
      <div className="grid2">
        <label className="field">
          <span>Category</span>
          <select value={item.category} onChange={(e) => onChange({ category: e.target.value as Item['category'] })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Type</span>
          <input value={item.subcategory} onChange={(e) => onChange({ subcategory: e.target.value })} placeholder="e.g. jeans" />
        </label>
      </div>
      <div className="grid2">
        <label className="field">
          <span>Colours</span>
          <input defaultValue={item.colors.join(', ')} onBlur={(e) => onChange({ colors: list(e.target.value) })} placeholder="navy, white" />
        </label>
        <label className="field">
          <span>Pattern</span>
          <input value={item.pattern} onChange={(e) => onChange({ pattern: e.target.value })} placeholder="solid" />
        </label>
      </div>
      <div className="grid2">
        <label className="field">
          <span>Material</span>
          <input value={item.material} onChange={(e) => onChange({ material: e.target.value })} />
        </label>
        <label className="field">
          <span>Brand</span>
          <input value={item.brand} onChange={(e) => onChange({ brand: e.target.value })} />
        </label>
      </div>
      <div className="field">
        <span>Seasons</span>
        <div className="chips">
          {SEASONS.map((s) => (
            <Chip key={s} on={item.seasons.includes(s)} onClick={() => onChange({ seasons: item.seasons.includes(s) ? item.seasons.filter((x) => x !== s) : [...item.seasons, s] })}>
              {s[0].toUpperCase() + s.slice(1)}
            </Chip>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Formality: {FORMALITY[item.formality]}</span>
        <input type="range" min={1} max={5} value={item.formality} onChange={(e) => onChange({ formality: +e.target.value })} />
      </label>
      <div className="grid2">
        <label className="field">
          <span>Style tags</span>
          <input defaultValue={item.styleTags.join(', ')} onBlur={(e) => onChange({ styleTags: list(e.target.value) })} placeholder="minimal, preppy" />
        </label>
        <label className="field">
          <span>Price paid</span>
          <input type="number" inputMode="decimal" min={0} value={item.price ?? ''} onChange={(e) => onChange({ price: e.target.value === '' ? null : +e.target.value })} placeholder="optional" />
        </label>
      </div>
      <label className="field">
        <span>Notes</span>
        <input value={item.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="e.g. runs small, dry clean only" />
      </label>
    </div>
  );
}
