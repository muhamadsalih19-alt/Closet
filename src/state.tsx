import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { EMPTY, loadData, loadImages, saveData, saveImage, deleteImage, type AppData } from './lib/storage';
import type { AiCtx } from './lib/ai';
import { hamperIds, laundryCycle, laundryForAi, withHamper, type LaundryCycle } from './lib/laundry';
import type { Item } from './lib/types';
import { feelFor, fetchWeather, weatherForAi, type DayWeather, type Feel, type Weather } from './lib/weather';

interface Store {
  data: AppData;
  images: Record<string, string>;
  update: (fn: (d: AppData) => AppData) => void;
  setImage: (id: string, dataUrl: string | null) => Promise<void>;
  replaceAll: (data: AppData, images: Record<string, string>) => Promise<void>;
  weather: Weather | null;
  weatherError: string;
  ai: AiCtx;
  toast: (msg: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('store missing');
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState('');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const toastTimer = useRef<number>(0);

  useEffect(() => {
    Promise.all([loadData(), loadImages()]).then(([d, imgs]) => {
      setData(d);
      setImages(imgs);
    });
  }, []);

  useEffect(() => {
    if (data) saveData(data);
  }, [data]);

  const lat = data?.settings.place?.lat;
  const lon = data?.settings.place?.lon;
  const placeName = data?.settings.place?.name;
  useEffect(() => {
    if (lat == null || lon == null) {
      setWeather(null);
      return;
    }
    setWeatherError('');
    fetchWeather({ lat, lon, name: placeName ?? '' })
      .then(setWeather)
      .catch((e) => setWeatherError(e instanceof Error ? e.message : 'Weather unavailable'));
  }, [lat, lon, placeName]);

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d ?? EMPTY)), []);

  const setImage = useCallback(async (id: string, dataUrl: string | null) => {
    if (dataUrl) await saveImage(id, dataUrl);
    else await deleteImage(id);
    setImages((m) => {
      const n = { ...m };
      if (dataUrl) n[id] = dataUrl;
      else delete n[id];
      return n;
    });
  }, []);

  const replaceAll = useCallback(async (d: AppData, imgs: Record<string, string>) => {
    for (const [id, url] of Object.entries(imgs)) await saveImage(id, url);
    setImages(imgs);
    setData(d);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2600);
  }, []);

  if (!data) return <div className="loading">Opening your closet…</div>;

  const store: Store = {
    data,
    images,
    update,
    setImage,
    replaceAll,
    weather,
    weatherError,
    ai: { apiKey: data.settings.apiKey, model: data.settings.model },
    toast,
  };
  return (
    <Ctx.Provider value={store}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </Ctx.Provider>
  );
}

/** The forecast for a date, how it feels to this person, and the text the stylist reads. */
export function useDayWeather(date: string): { day: DayWeather | undefined; feel: Feel | undefined; forAi: string | undefined; strongAC: boolean } {
  const { weather, data } = useStore();
  const day = weather?.days.find((d) => d.date === date);
  const isToday = weather?.days[0]?.date === date;
  return {
    day,
    feel: feelFor(day, data.settings),
    forAi: weatherForAi(day, data.settings, isToday ? weather?.now : undefined),
    strongAC: data.settings.strongAC,
  };
}

/** The closet as it stands on a date: pieces waiting for laundry day are marked unavailable. */
export function useLaundry(date: string): { items: Item[]; hamper: Set<string>; cycle: LaundryCycle | null; forAi: string | undefined } {
  const { data } = useStore();
  const hamper = hamperIds(data.items, data.wears, data.settings, date);
  return {
    items: withHamper(data.items, hamper),
    hamper,
    cycle: laundryCycle(data.settings, date),
    forAi: laundryForAi(data.items, data.wears, data.settings, date),
  };
}
