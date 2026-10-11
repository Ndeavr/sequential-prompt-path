/**
 * UNPRO — Google Maps Platform connector helper
 *
 * Routes server-side Places calls through the Lovable connector
 * (LOVABLE_API_KEY + GOOGLE_MAPS_API_KEY). Falls back to a standalone
 * server key (GOOGLE_PLACES_SERVER_KEY) or the legacy browser key
 * (GOOGLE_PLACES_API_KEY) for direct Google endpoints.
 *
 * Why: when GOOGLE_PLACES_API_KEY is restricted to a browser domain
 * (e.g. unpro.ca / www.unpro.ca), server-side calls fail with
 * "API keys with referer restrictions cannot be used with this API."
 * The connector runs server-to-server and avoids the referer problem.
 */

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/google_maps";

export interface GoogleMapsCredentials {
  lovableKey: string | null;
  connectionKey: string | null;
  serverKey: string | null;
  legacyKey: string | null;
}

export function getGoogleMapsCredentials(): GoogleMapsCredentials {
  return {
    lovableKey: Deno.env.get("LOVABLE_API_KEY") || null,
    connectionKey: Deno.env.get("GOOGLE_MAPS_API_KEY") || null,
    serverKey: Deno.env.get("GOOGLE_PLACES_SERVER_KEY") || null,
    legacyKey: Deno.env.get("GOOGLE_PLACES_API_KEY") || null,
  };
}

export function googleConnectorAvailable(c?: GoogleMapsCredentials): boolean {
  const creds = c ?? getGoogleMapsCredentials();
  return !!creds.lovableKey && !!creds.connectionKey;
}

function connectorHeaders(c: GoogleMapsCredentials) {
  return {
    "Authorization": `Bearer ${c.lovableKey}`,
    "X-Connection-Api-Key": c.connectionKey || "",
    "Content-Type": "application/json",
  };
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  address: string;
  street_number: string;
  street_name: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  website: string;
  rating: number;
  review_count: number;
  types: string[];
}

// New Places API field masks
const AUTOCOMPLETE_FIELDS =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat";

const DETAILS_FIELDS =
  "id,displayName,formattedAddress,addressComponents,location,rating,userRatingCount,websiteUri,nationalPhoneNumber";

interface AutocompleteOptions {
  language?: string;
  region?: string;
  types?: string;
  sessionToken?: string;
}

interface SearchTextOptions {
  language?: string;
  region?: string;
  maxResults?: number;
  locationBias?: {
    rectangle: {
      low: { latitude: number; longitude: number };
      high: { latitude: number; longitude: number };
    };
  };
}

interface DetailsOptions {
  sessionToken?: string;
  language?: string;
  fields?: string;
}

interface ApiResult<T> {
  data: T | null;
  source: string;
  google_status?: string;
  error_message?: string;
}

export function getEffectiveServerKey(c?: GoogleMapsCredentials): string | null {
  const creds = c ?? getGoogleMapsCredentials();
  return creds.serverKey || creds.legacyKey || null;
}

/**
 * Autocomplete: prefers New Places API autocomplete via connector,
 * falls back to connector searchText, then legacy autocomplete.
 */
export async function placesAutocomplete(input: string, opts: AutocompleteOptions = {}): Promise<ApiResult<PlacePrediction[]>> {
  const c = getGoogleMapsCredentials();
  if (!googleConnectorAvailable(c)) return { data: null, source: "missing_connector", google_status: "API_KEY_MISSING", error_message: "Connexion Google Maps indisponible" };
  const body: Record<string, unknown> = {
    input: input.trim(), languageCode: opts.language || "fr", regionCode: "CA",
    includedRegionCodes: ["ca"],
    locationBias: { circle: { center: { latitude: 46.8139, longitude: -71.208 }, radius: 50000 } },
  };
  // Legacy collections `address`, `geocode`, `establishment` are NOT New API primary types.
  if (opts.types && !["address", "geocode", "establishment"].includes(opts.types)) body.includedPrimaryTypes = [opts.types];
  if (opts.sessionToken) body.sessionToken = opts.sessionToken;
  try {
    const response = await fetch(`${GATEWAY_BASE}/places/v1/places:autocomplete`, {
      method: "POST", headers: { ...connectorHeaders(c), "X-Goog-FieldMask": AUTOCOMPLETE_FIELDS }, body: JSON.stringify(body),
    });
    if (!response.ok) return await placesFailure(response, "connector_places_autocomplete");
    const result = await response.json();
    return { data: (result.suggestions || []).filter((s: any) => s.placePrediction?.placeId && s.placePrediction?.text?.text).slice(0, 5).map((s: any) => ({
      place_id: s.placePrediction.placeId, description: s.placePrediction.text.text,
      structured_formatting: { main_text: s.placePrediction.structuredFormat?.mainText?.text || "", secondary_text: s.placePrediction.structuredFormat?.secondaryText?.text || "" },
    })), source: "connector_places_autocomplete", google_status: "OK" };
  } catch { return { data: null, source: "connector_places_autocomplete", google_status: "NETWORK_ERROR", error_message: "Google Maps indisponible" }; }
}

async function placesFailure(response: Response, source: string): Promise<ApiResult<never>> {
  const raw = await response.text();
  let reason = "";
  try { const body = JSON.parse(raw); reason = body.error?.details?.find((d: any) => d.reason)?.reason || ""; } catch { /* non-JSON provider failure */ }
  const message = response.status === 403
    ? reason === "API_KEY_HTTP_REFERRER_BLOCKED"
      ? "Google Cloud : la clé serveur doit utiliser des restrictions IP ou aucune restriction de site."
      : reason === "API_KEY_SERVICE_BLOCKED"
        ? "Google Cloud : autorisez Places API (New) sur la clé serveur."
        : "Google Cloud : vérifiez les restrictions de la clé serveur."
    : `Google Maps indisponible (${response.status}).`;
  console.error("[googleMapsConnector] denied", { status: response.status, reason });
  return { data: null, source, google_status: reason || `HTTP_${response.status}`, error_message: message };
}

/**
 * SearchText via the connector with a custom field mask. Used when the caller
 * needs full place details (phone, website, rating, address components, etc.)
 */
export async function placesSearchTextRaw(
  query: string,
  opts: SearchTextOptions = {},
  fieldMask: string = "places.id,places.displayName,places.formattedAddress",
): Promise<{ places: any[]; source: string; google_status?: string; error_message?: string }> {
  const creds = getGoogleMapsCredentials();
  if (!googleConnectorAvailable(creds)) {
    return {
      places: [],
      source: "missing_connector",
      error_message: "Connecteur Lovable Google Maps non configuré",
    };
  }

  const url = `${GATEWAY_BASE}/places/v1/places:searchText`;
  const body: Record<string, unknown> = {
    textQuery: query.trim(),
    languageCode: opts.language || "fr-CA",
    regionCode: opts.region || "CA",
    maxResultCount: opts.maxResults || 5,
  };
  if (opts.locationBias) body.locationBias = opts.locationBias;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      ...connectorHeaders(creds),
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    return { places: [], source: "connector_searchText", google_status: "FETCH_ERROR", error_message: text.slice(0, 300) };
  }

  const data = await r.json();
  const places = Array.isArray(data.places) ? data.places : [];

  return {
    places,
    source: "connector_searchText",
    google_status: places.length ? "OK" : "ZERO_RESULTS",
  };
}

/**
 * SearchText via the connector. Lightweight version used for autocomplete fallbacks.
 */
export async function placesSearchText(
  query: string,
  opts: SearchTextOptions = {},
  c?: GoogleMapsCredentials,
): Promise<ApiResult<PlacePrediction[]>> {
  const res = await placesSearchTextRaw(query, opts, "places.id,places.displayName,places.formattedAddress");
  return {
    data: res.places.map((p: any) => ({
      place_id: p.id || "",
      description: p.formattedAddress || p.displayName?.text || "",
      structured_formatting: {
        main_text: p.displayName?.text || "",
        secondary_text: p.formattedAddress || "",
      },
    })),
    source: res.source,
    google_status: res.google_status,
    error_message: res.error_message,
  };
}

/**
 * Place details via connector (New API) or legacy fallback.
 */
export async function placeDetails(placeId: string, opts: DetailsOptions = {}): Promise<ApiResult<PlaceDetails>> {
  const c = getGoogleMapsCredentials();
  if (!googleConnectorAvailable(c)) return { data: null, source: "missing_connector", google_status: "API_KEY_MISSING", error_message: "Connexion Google Maps indisponible" };
  const id = placeId.replace(/^places\//, "");
  const params = new URLSearchParams({ languageCode: opts.language || "fr" });
  if (opts.sessionToken) params.set("sessionToken", opts.sessionToken);
  try {
    const response = await fetch(`${GATEWAY_BASE}/places/v1/places/${encodeURIComponent(id)}?${params}`, {
      headers: { ...connectorHeaders(c), "X-Goog-FieldMask": opts.fields || DETAILS_FIELDS },
    });
    if (!response.ok) return await placesFailure(response, "connector_details");
    const data = await response.json();
    if (!data.id) return { data: null, source: "connector_details", google_status: "DETAILS_FAILED" };
    return { data: normalizeNewPlaceDetails(data), source: "connector_details", google_status: "OK" };
  } catch { return { data: null, source: "connector_details", google_status: "NETWORK_ERROR" }; }
}

function normalizeNewPlaceDetails(p: any): PlaceDetails {
  const comps = Array.isArray(p.addressComponents) ? p.addressComponents : [];
  const pick = (type: string, short = false): string => {
    const c = comps.find((x: any) => Array.isArray(x.types) && x.types.includes(type));
    if (!c) return "";
    return short ? (c.shortText || c.longText || "") : (c.longText || c.shortText || "");
  };

  return {
    place_id: p.id || "",
    name: p.displayName?.text || "",
    address: p.formattedAddress || "",
    street_number: pick("street_number"),
    street_name: pick("route"),
    city: pick("locality") || pick("sublocality") || pick("administrative_area_level_2"),
    province: pick("administrative_area_level_1", true),
    postal_code: pick("postal_code"),
    country: pick("country", true) || "CA",
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    phone: p.nationalPhoneNumber || "",
    website: p.websiteUri || "",
    rating: p.rating || 0,
    review_count: p.userRatingCount || 0,
    types: p.types || [],
  };
}

function normalizeLegacyPlaceDetails(r: any): PlaceDetails {
  const comps: any[] = r.address_components || [];
  const pick = (type: string, short = false): string => {
    const c = comps.find((x: any) => Array.isArray(x.types) && x.types.includes(type));
    if (!c) return "";
    return short ? (c.short_name || c.long_name || "") : (c.long_name || c.short_name || "");
  };

  return {
    place_id: r.place_id || "",
    name: r.name || "",
    address: r.formatted_address || "",
    street_number: pick("street_number"),
    street_name: pick("route"),
    city: pick("locality") || pick("sublocality") || pick("administrative_area_level_2"),
    province: pick("administrative_area_level_1", true),
    postal_code: pick("postal_code"),
    country: pick("country", true) || "CA",
    latitude: r.geometry?.location?.lat ?? null,
    longitude: r.geometry?.location?.lng ?? null,
    phone: r.formatted_phone_number || "",
    website: r.website || "",
    rating: r.rating || 0,
    review_count: r.user_ratings_total || 0,
    types: r.types || [],
  };
}
