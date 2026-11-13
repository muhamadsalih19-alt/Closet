import { createContext, useContext } from 'react';

export type Tab = 'today' | 'closet' | 'outfits' | 'stylist' | 'me';

export type Overlay =
  | { kind: 'item'; id: string }
  | { kind: 'add'; status?: 'owned' | 'wishlist' }
  | { kind: 'outfit'; id?: string; itemIds?: string[]; name?: string; occasion?: string }
  | { kind: 'styleItem'; id: string };

export interface Nav {
  tab: Tab;
  go: (t: Tab) => void;
  open: (o: Overlay) => void;
  close: () => void;
}

export const NavCtx = createContext<Nav | null>(null);

export function useNav(): Nav {
  const n = useContext(NavCtx);
  if (!n) throw new Error('nav missing');
  return n;
}
