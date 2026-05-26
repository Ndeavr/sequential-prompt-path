/**
 * useNearbyCity — Detects user's city via IP geolocation (free, no API key).
 * Caches in localStorage for 24h. Falls back to "Montréal".
 */
import { useEffect, useState } from "react";

const KEY = "unpro_user_city";
const TTL = 24 * 60 * 60 * 1000;

interface Cached {
  city: string;
  ts: number;
}

function readCache(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached;
    if (Date.now() - c.ts > TTL) return null;
    return c.city || null;
  } catch {
    return null;
  }
}

function writeCache(city: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ city, ts: Date.now() }));
  } catch {}
}

export function useNearbyCity(): string {
  const [city, setCity] = useState<string>(() => readCache() || "Montréal");

  useEffect(() => {
    if (readCache()) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) return;
        const data = await res.json();
        const detected: string | undefined = data?.city;
        const country: string | undefined = data?.country_code;
        if (cancelled) return;
        if (detected && country === "CA") {
          setCity(detected);
          writeCache(detected);
        } else {
          writeCache("Montréal");
        }
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return city;
}
