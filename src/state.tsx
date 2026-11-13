import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { EMPTY, loadData, loadImages, saveData, saveImage, deleteImage, type AppData } from './lib/storage';
import { fetchWeather, type Weather } from './lib/weather';
import type { AiCtx } from './lib/ai';

interface Store {
  data: AppData;
  images: Record<string, string>;
  update: (fn: (d: AppData) => AppData) => void;
  setImage: (id: string, dataUrl: string | null) => Promise<void>;
  replaceAll: (data: AppData, images: Record<string, string>) => Promise<void>;
  weather: Weather | null;
  weatherError: string;
  refreshWeather: () => void;
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
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
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

  const place = data?.settings.place;
  const refreshWeather = useCallback(() => {
    if (!place) return;
    setWeatherError('');
    fetchWeather(place)
      .then(setWeather)
      .catch((e) => setWeatherError(e instanceof Error ? e.message : 'Weather unavailable'));
  }, [place]);

  useEffect(() => {
    refreshWeather();
  }, [refreshWeather]);

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
    refreshWeather,
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
