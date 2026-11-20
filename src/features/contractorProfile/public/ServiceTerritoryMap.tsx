import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/components/ui/LanguageToggle";
import {
  clampTerritoryZoom,
  googleMapsCityUrl,
  locateCities,
  territoryCities,
  territoryViewport,
  type TerritoryArea,
  type TerritoryPoint,
} from "./serviceTerritory";

/* eslint-disable @typescript-eslint/no-explicit-any */
type GoogleMapsNs = any;
declare global {
  interface Window {
    google?: { maps?: GoogleMapsNs };
    __unproTerritoryMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

const LOAD_TIMEOUT_MS = 12_000;
let loaderPromise: Promise<GoogleMapsNs> | null = null;
const authFailureListeners = new Set<() => void>();

function loadGoogleMaps(lang: "fr" | "en"): Promise<GoogleMapsNs> {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (loaderPromise) return loaderPromise;
  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
  if (!key) return Promise.reject(new Error("maps_key_missing"));
  loaderPromise = new Promise((resolve, reject) => {
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      authFailureListeners.forEach((listener) => listener());
      previousAuthFailure?.();
    };
    window.__unproTerritoryMapsReady = () => resolve(window.google!.maps);
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=__unproTerritoryMapsReady&language=${lang}&region=CA${channel ? `&channel=${encodeURIComponent(channel)}` : ""}`;
    script.onerror = () => { loaderPromise = null; script.remove(); reject(new Error("maps_script_failed")); };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#c7d2e3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c2a40" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#06213a" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#e6edf7" }] },
];

const COPY = {
  fr: {
    loading: "Chargement de la carte…",
    unavailable: "Carte indisponible pour le moment. Les villes desservies restent listées ci-dessous.",
    openIn: (city: string) => `Voir ${city} dans Google Maps`,
    mapTitle: (name: string) => `Carte des villes desservies par ${name}`,
    note: "Points : centre de chaque ville, pas l’adresse de l’entreprise.",
    unlocated: (n: number) => `${n} ville${n > 1 ? "s" : ""} sans position de référence : listée${n > 1 ? "s" : ""} seulement.`,
    cities: (n: number) => `${n} ville${n > 1 ? "s" : ""} desservie${n > 1 ? "s" : ""}`,
    primary: "principale",
    none: "Aucun territoire publié.",
    showOnMap: (city: string) => `Centrer la carte sur ${city}`,
  },
  en: {
    loading: "Loading map…",
    unavailable: "Map unavailable right now. Service cities are still listed below.",
    openIn: (city: string) => `View ${city} on Google Maps`,
    mapTitle: (name: string) => `Map of cities served by ${name}`,
    note: "Pins: centre of each city, not the business address.",
    unlocated: (n: number) => `${n} cit${n > 1 ? "ies" : "y"} without a reference position: listed only.`,
    cities: (n: number) => `${n} cit${n > 1 ? "ies" : "y"} served`,
    primary: "main",
    none: "No service area published.",
    showOnMap: (city: string) => `Centre the map on ${city}`,
  },
} as const;

type MapState = "idle" | "loading" | "ready" | "error";

type Props = { businessName?: string | null; areas: TerritoryArea[]; fallbackCity?: string | null };

export default function ServiceTerritoryMap({ businessName, areas, fallbackCity }: Props) {
  const { lang } = useLanguage();
  const t = COPY[lang] ?? COPY.fr;
  const cities = useMemo(() => territoryCities(areas, fallbackCity), [areas, fallbackCity]);
  const slugs = useMemo(() => cities.map((city) => city.slug), [cities]);

  const coords = useQuery({
    queryKey: ["territory-city-coordinates", slugs],
    enabled: slugs.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("cities").select("slug, latitude, longitude").in("slug", slugs);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { points, unlocated } = useMemo(() => locateCities(cities, coords.data ?? []), [cities, coords.data]);
  const viewport = useMemo(() => territoryViewport(points), [points]);
  const linkCity = cities.find((city) => city.primary)?.name ?? cities[0]?.name ?? fallbackCity ?? null;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [mapState, setMapState] = useState<MapState>("idle");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!viewport || !containerRef.current) { setMapState(coords.isError ? "error" : "idle"); return; }
    let cancelled = false;
    const markers = markersRef.current;
    const fail = () => { if (!cancelled) setMapState("error"); };
    authFailureListeners.add(fail);
    setMapState("loading");
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS);

    loadGoogleMaps(lang).then((maps) => {
      if (cancelled || !containerRef.current) return;
      const map = new maps.Map(containerRef.current, {
        clickableIcons: false,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
        minZoom: 6,
        maxZoom: 14,
        backgroundColor: "#0b1220",
        styles: DARK_STYLE,
        ...(viewport.kind === "center" ? { center: viewport.center, zoom: viewport.zoom } : { center: { lat: (viewport.south + viewport.north) / 2, lng: (viewport.west + viewport.east) / 2 }, zoom: 9 }),
      });
      mapRef.current = map;
      if (viewport.kind === "bounds") {
        map.fitBounds({ south: viewport.south, west: viewport.west, north: viewport.north, east: viewport.east }, 36);
        maps.event.addListenerOnce(map, "idle", () => map.setZoom(clampTerritoryZoom(map.getZoom())));
      }
      markers.forEach((marker) => marker.setMap(null));
      markers.clear();
      points.forEach((point: TerritoryPoint) => {
        const marker = new maps.Marker({
          map,
          position: { lat: point.lat, lng: point.lng },
          title: point.name,
          zIndex: point.primary ? 2 : 1,
          icon: { path: maps.SymbolPath.CIRCLE, scale: point.primary ? 8 : 6, fillColor: point.primary ? "#38bdf8" : "#60a5fa", fillOpacity: 0.95, strokeColor: "#e6edf7", strokeWeight: 2 },
        });
        marker.addListener("click", () => setSelected(point.slug));
        markers.set(point.slug, marker);
      });
      maps.event.addListenerOnce(map, "tilesloaded", () => { if (!cancelled) { clearTimeout(timer); setMapState((s) => (s === "error" ? s : "ready")); } });
    }).catch(fail);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      authFailureListeners.delete(fail);
      markers.forEach((marker) => marker.setMap(null));
      markers.clear();
      mapRef.current = null;
    };
  }, [viewport, points, lang, coords.isError]);

  const focusCity = (slug: string) => {
    setSelected(slug);
    const marker = markersRef.current.get(slug);
    if (marker && mapRef.current) {
      mapRef.current.panTo(marker.getPosition());
      mapRef.current.setZoom(clampTerritoryZoom(Math.max(mapRef.current.getZoom() ?? 0, 10)));
    }
  };

  if (!cities.length) return <p className="mt-3 text-sm text-text-muted-2">{t.none}</p>;

  const showMap = !!viewport && mapState !== "error";
  const locatedSlugs = new Set(points.map((p) => p.slug));

  return (
    <div className="mt-3 space-y-3" data-testid="service-territory">
      {showMap && (
        <div className="relative h-56 overflow-hidden rounded-lg border border-border bg-muted/30 sm:h-72">
          <div ref={containerRef} role="region" aria-label={t.mapTitle(businessName ?? "")} className={`h-full w-full transition-opacity duration-300 ${mapState === "ready" ? "opacity-100" : "opacity-0"}`} />
          {mapState !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-text-secondary" role="status" aria-live="polite">
              <MapPin className="h-4 w-4 animate-pulse text-primary" aria-hidden="true" />{t.loading}
            </div>
          )}
        </div>
      )}
      {(mapState === "error" || coords.isError) && <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-text-secondary" role="status" data-testid="territory-map-fallback">{t.unavailable}</p>}
      {showMap && mapState === "ready" && <p className="text-[11px] text-text-muted-2">{t.note}</p>}

      <details className="rounded-lg border border-border bg-muted/30 p-3">
        <summary className="cursor-pointer text-sm font-medium text-text-strong">{t.cities(cities.length)}</summary>
        <ul className="mt-2 flex flex-wrap gap-2">
          {cities.map((city) => {
            const interactive = mapState === "ready" && locatedSlugs.has(city.slug);
            const label = `${city.name}${city.primary ? ` · ${t.primary}` : ""}`;
            return (
              <li key={city.slug}>
                {interactive ? (
                  <button type="button" onClick={() => focusCity(city.slug)} aria-label={t.showOnMap(city.name)} aria-pressed={selected === city.slug} className={`min-h-9 rounded-full border px-3 text-xs transition-colors ${selected === city.slug ? "border-primary bg-primary/15 text-text-strong" : "border-border text-text-secondary hover:border-primary/60"}`}>{label}</button>
                ) : (
                  <span className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-xs text-text-secondary">{label}</span>
                )}
              </li>
            );
          })}
        </ul>
        {mapState === "ready" && unlocated.length > 0 && <p className="mt-2 text-[11px] text-text-muted-2">{t.unlocated(unlocated.length)}</p>}
      </details>

      {linkCity && (
        <a href={googleMapsCityUrl(linkCity)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">
          {t.openIn(linkCity)}<ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
