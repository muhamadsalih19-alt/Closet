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
  tempUnit: 'C' | 'F';
  place: Place | null;
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
