export const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory', 'activewear', 'swimwear', 'sleepwear', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  top: 'Tops',
  bottom: 'Bottoms',
  dress: 'Dresses & one-pieces',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  bag: 'Bags',
  accessory: 'Accessories',
  activewear: 'Activewear',
  swimwear: 'Swimwear',
  sleepwear: 'Loungewear',
  other: 'Other',
};

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export const OCCASIONS = ['Everyday', 'Work', 'Smart casual', 'Date night', 'Going out', 'Formal event', 'Workout', 'Travel', 'Lounging at home', 'Interview', 'Wedding guest', 'Brunch'] as const;

/** Plain-language names for the occasions. The ids above stay the same so saved outfits keep matching. */
export const OCCASION_INFO: Record<string, { icon: string; label: string; hint: string }> = {
  Everyday: { icon: '🚶', label: 'Normal day', hint: 'Errands, uni, hanging out' },
  Work: { icon: '💼', label: 'Work', hint: 'Office or meetings' },
  'Smart casual': { icon: '☕', label: 'A bit nicer', hint: 'Nice café, mall, meeting friends' },
  Brunch: { icon: '🍳', label: 'Food out', hint: 'Brunch, lunch or a relaxed dinner' },
  'Date night': { icon: '❤️', label: 'Date', hint: 'Look good, still comfy' },
  'Going out': { icon: '🎉', label: 'Night out', hint: 'Party, club, birthday' },
  'Formal event': { icon: '🤵', label: 'Fancy event', hint: 'Gala, awards, suit-and-tie' },
  'Wedding guest': { icon: '💍', label: 'Wedding', hint: 'Going as a guest' },
  Interview: { icon: '🤝', label: 'Job interview', hint: 'Make a good first impression' },
  Workout: { icon: '🏋️', label: 'Gym or sport', hint: 'Training, running, football' },
  Travel: { icon: '✈️', label: 'Travelling', hint: 'Flight or long trip, comfort first' },
  'Lounging at home': { icon: '🛋️', label: 'Staying in', hint: 'Relaxing at home' },
};

/** Occasions in the order they're shown: most common first. */
export const OCCASION_ORDER = Object.keys(OCCASION_INFO);

export const occasionLabel = (id: string) => OCCASION_INFO[id]?.label ?? id;

/** What the stylist is told: the plain name plus an example. */
export const occasionForAi = (id: string) => (OCCASION_INFO[id] ? `${OCCASION_INFO[id].label} (${OCCASION_INFO[id].hint})` : id);

export type ItemStatus = 'owned' | 'wishlist' | 'archived';

export interface Item {
  id: string;
  name: string;
  category: Category;
  subcategory: string;
  colors: string[];
  pattern: string;
  material: string;
  seasons: Season[];
  /** 1 = very casual … 5 = black tie */
  formality: number;
  styleTags: string[];
  brand: string;
  price: number | null;
  notes: string;
  favorite: boolean;
  inLaundry: boolean;
  status: ItemStatus;
  hasPhoto: boolean;
  createdAt: number;
}

export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  occasion: string;
  note: string;
  favorite: boolean;
  source: 'ai' | 'manual';
  createdAt: number;
}

export interface WearLog {
  id: string;
  date: string; // YYYY-MM-DD
  itemIds: string[];
  outfitId: string | null;
  occasion: string;
}

export interface Plan {
  date: string;
  itemIds: string[];
  title: string;
  note: string;
}

export interface Feedback {
  itemIds: string[];
  liked: boolean;
  at: number;
}

export interface StyleProfile {
  name: string;
  wardrobe: 'womenswear' | 'menswear' | 'mixed';
  styles: string[];
  colorsLove: string;
  colorsAvoid: string;
  fitNotes: string;
  lifestyle: string;
  onboarded: boolean;
}

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export interface Settings {
  apiKey: string;
  model: string;
}

export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  itemIds?: string[];
  outfits?: { title: string; itemIds: string[] }[];
  image?: string;
}

export interface Suggestion {
  title: string;
  itemIds: string[];
  why: string;
  tip: string;
}
