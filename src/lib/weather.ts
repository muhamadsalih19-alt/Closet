import type { Place } from './types';

export interface DayWeather {
  date: string;
  max: number; // °C
  min: number;
  rainChance: number;
  code: number;
  wind: number; // km/h
  uv: number;
}

export interface Weather {
  now: { temp: number; feels: number; code: number } | null;
  days: DayWeather[];
  place: string;
}

const DESCRIPTIONS: [number[], string, string][] = [
  [[0], 'Clear', '☀️'],
  [[1, 2], 'Partly cloudy', '⛅'],
  [[3], 'Overcast', '☁️'],
  [[45, 48], 'Fog', '🌫️'],
  [[51, 53, 55, 56, 57], 'Drizzle', '🌦️'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Rain', '🌧️'],
  [[71, 73, 75, 77, 85, 86], 'Snow', '❄️'],
  [[95, 96, 99], 'Thunderstorms', '⛈️'],
];

export function describe(code: number): { text: string; icon: string } {
  const d = DESCRIPTIONS.find(([codes]) => codes.includes(code));
  return d ? { text: d[1], icon: d[2] } : { text: 'Mixed', icon: '🌤️' };
}

export function fmtTemp(c: number, unit: 'C' | 'F'): string {
  return unit === 'F' ? `${Math.round((c * 9) / 5 + 32)}°` : `${Math.round(c)}°`;
}

/** One-line summary the stylist can read. */
export function weatherBrief(d: DayWeather | undefined, now?: Weather['now']): string {
  if (!d) return 'Weather unknown.';
  const parts = [
    `${describe(d.code).text}, high ${Math.round(d.max)}°C, low ${Math.round(d.min)}°C`,
    `${d.rainChance}% chance of rain`,
    `wind up to ${Math.round(d.wind)} km/h`,
  ];
  if (d.uv >= 6) parts.push(`UV ${Math.round(d.uv)} (strong sun)`);
  if (now) parts.push(`right now ${Math.round(now.temp)}°C, feels like ${Math.round(now.feels)}°C`);
  return parts.join(', ') + '.';
}

export async function fetchWeather(place: Place): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    '&current=temperature_2m,apparent_temperature,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,wind_speed_10m_max,uv_index_max' +
    '&timezone=auto&forecast_days=7';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather is unavailable right now.');
  const j = await res.json();
  const days: DayWeather[] = j.daily.time.map((t: string, i: number) => ({
    date: t,
    max: j.daily.temperature_2m_max[i],
    min: j.daily.temperature_2m_min[i],
    rainChance: j.daily.precipitation_probability_max[i] ?? 0,
    code: j.daily.weather_code[i],
    wind: j.daily.wind_speed_10m_max[i] ?? 0,
    uv: j.daily.uv_index_max[i] ?? 0,
  }));
  const now = j.current ? { temp: j.current.temperature_2m, feels: j.current.apparent_temperature, code: j.current.weather_code } : null;
  return { now, days, place: place.name };
}

export async function searchPlaces(q: string): Promise<Place[]> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&format=json`);
  if (!res.ok) throw new Error('Search failed. Try again.');
  const j = await res.json();
  return (j.results ?? []).map((r: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

export function currentPosition(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available on this device.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ name: 'Current location', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
      () => reject(new Error('Location permission was denied. Search for your city instead.')),
      { timeout: 10000, maximumAge: 3600_000 },
    );
  });
}
