import { useCallback, useState } from 'react';
import { NavCtx, type Overlay, type Tab } from './nav';
import { useStore } from './state';
import Today from './screens/Today';
import Closet from './screens/Closet';
import Outfits from './screens/Outfits';
import Stylist from './screens/Stylist';
import Me from './screens/Me';
import Welcome from './screens/Welcome';
import ItemDetail from './screens/ItemDetail';
import AddItems from './screens/AddItems';
import OutfitEditor from './screens/OutfitEditor';
import StyleItem from './screens/StyleItem';

const ICONS: Record<Tab, string> = {
  today: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  closet: 'M12 6.5a1.8 1.8 0 1 1 1.8 1.8c-.9.4-1.8.9-1.8 1.7M12 10 3.5 16c-.8.6-.4 1.8.6 1.8h15.8c1 0 1.4-1.2.6-1.8L12 10z',
  outfits: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  stylist: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20c.8-3.5 3.8-5.5 7.5-5.5s6.7 2 7.5 5.5',
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'closet', label: 'Closet' },
  { id: 'outfits', label: 'Outfits' },
  { id: 'stylist', label: 'Stylist' },
  { id: 'me', label: 'Me' },
];

export default function App() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [stack, setStack] = useState<Overlay[]>([]);
  const open = useCallback((o: Overlay) => setStack((s) => [...s, o]), []);
  const close = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const go = useCallback((t: Tab) => {
    setStack([]);
    setTab(t);
    window.scrollTo(0, 0);
  }, []);

  if (!data.profile.onboarded) return <Welcome />;

  return (
    <NavCtx.Provider value={{ tab, go, open, close }}>
      <main className="page">
        {tab === 'today' && <Today />}
        {tab === 'closet' && <Closet />}
        {tab === 'outfits' && <Outfits />}
        {tab === 'stylist' && <Stylist />}
        {tab === 'me' && <Me />}
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' on' : '')} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab === t.id ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={ICONS[t.id]} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {stack.map((o, i) => {
        const key = i + o.kind;
        if (o.kind === 'item') return <ItemDetail key={key} id={o.id} />;
        if (o.kind === 'add') return <AddItems key={key} status={o.status ?? 'owned'} />;
        if (o.kind === 'outfit') return <OutfitEditor key={key} {...o} />;
        if (o.kind === 'styleItem') return <StyleItem key={key} id={o.id} />;
        return null;
      })}
    </NavCtx.Provider>
  );
}
