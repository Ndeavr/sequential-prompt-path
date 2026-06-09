/**
 * Resolves server-side Google Places API key with graceful fallbacks.
 * The browser-restricted GOOGLE_PLACES_API_KEY is rejected by Places Text Search
 * with REQUEST_DENIED, so we prefer an explicit server key, then the managed
 * GOOGLE_MAPS_API_KEY (server-side connector), and only last fall back to the
 * legacy browser key.
 */
export function resolvePlacesKey(): { key: string; source: string } | null {
  const candidates: Array<[string, string]> = [
    ["GOOGLE_PLACES_SERVER_KEY", "server"],
    ["GOOGLE_MAPS_API_KEY", "maps_managed"],
    ["GOOGLE_PLACES_API_KEY", "legacy_browser"],
  ];
  for (const [env, source] of candidates) {
    const v = Deno.env.get(env);
    if (v && v.length > 10) return { key: v, source };
  }
  return null;
}
