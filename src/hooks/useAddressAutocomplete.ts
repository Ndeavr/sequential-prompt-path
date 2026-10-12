/**
 * UNPRO — Address Autocomplete Hook
 * Wraps the `google-places-autocomplete` edge function with debouncing
 * and request deduplication. Surfaces upstream Google errors.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAddressAccessToken } from "@/services/addressAccessToken";
import type { VerifiedAddressData } from "@/types/address";

export interface AddressPrediction {
  place_id: string;
  description: string;
  structured_formatting?: { main_text?: string; secondary_text?: string };
}

interface UseAddressAutocompleteOptions {
  region?: string;
  language?: string;
  debounceMs?: number;
  minChars?: number;
}

export interface AddressServiceError {
  code: string;       // e.g. REQUEST_DENIED, OVER_QUERY_LIMIT, API_KEY_MISSING, SERVICE_FAILED
  message: string;
}

export function useAddressAutocomplete(opts: UseAddressAutocompleteOptions = {}) {
  const { region = "ca", language = "fr", debounceMs = 500, minChars = 4 } = opts;
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AddressServiceError | null>(null);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);
  const sessionRef = useRef<string | null>(null);
  const lastQueryRef = useRef<string>("");
  const cacheRef = useRef(new Map<string, AddressPrediction[]>());
  const blockedUntilRef = useRef(0);

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    reqIdRef.current += 1;
  }, []);

  const search = useCallback((input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const query = (input || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (query.length >= minChars && query === lastQueryRef.current) return; // saisie inchangée
    const reqId = ++reqIdRef.current;
    if (query.length < minChars) {
      lastQueryRef.current = "";
      setPredictions([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    const cached = cacheRef.current.get(query);
    if (cached) { lastQueryRef.current = query; setPredictions(cached); setError(null); setIsLoading(false); return; }
    if (Date.now() < blockedUntilRef.current) {
      setIsLoading(false);
      return; // pause en cours : la saisie reste « à confirmer »
    }
    sessionRef.current ??= crypto.randomUUID();
    setIsLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "google-places-autocomplete",
          { body: { input, types: "address", region, language, sessionToken: sessionRef.current, session_token: await getAddressAccessToken() } }
        );
        if (reqId !== reqIdRef.current) return;
        if (fnError) {
          let code = "FUNCTION_ERROR";
          let message = "Service d'adresses momentanément indisponible";
          const ctx = (fnError as { context?: Response }).context;
          try {
            const b = await ctx?.json();
            code = b?.error || code;
            if (ctx?.status === 429) {
              const secs = Number(ctx.headers.get("Retry-After")) || Number(b?.retry_after_seconds) || 60;
              blockedUntilRef.current = Date.now() + secs * 1000;
              code = "RATE_LIMITED";
              message = `Beaucoup de recherches en peu de temps. Votre adresse reste « à confirmer »; réessayez dans ${Math.ceil(secs / 60)} min.`;
            }
          } catch { /* corps illisible */ }
          setError({ code, message });
          setPredictions([]);
          return;
        }
        // Upstream Google error surfaced from edge function (HTTP 200 + error field)
        if (data?.error) {
          setError({ code: data.error, message: data.message || "Service indisponible" });
          setPredictions([]);
          return;
        }
        const list = (data?.predictions as AddressPrediction[]) || [];
        lastQueryRef.current = query;
        if (cacheRef.current.size > 50) cacheRef.current.clear();
        cacheRef.current.set(query, list);
        setPredictions(list);
      } catch (e) {
        if (reqId !== reqIdRef.current) return;
        setError({ code: "NETWORK_ERROR", message: String(e) });
        setPredictions([]);
      } finally {
        if (reqId === reqIdRef.current) setIsLoading(false);
      }
    }, debounceMs);
  }, [region, language, debounceMs, minChars]);

  const fetchDetails = useCallback(async (placeId: string): Promise<VerifiedAddressData | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "google-places-autocomplete",
        { body: { place_id: placeId, sessionToken: sessionRef.current, session_token: await getAddressAccessToken() } }
      );
      if (fnError || !data?.result) return null;
      const r = data.result;
      if (r.place_id !== placeId || typeof r.address !== "string" || !r.address.trim()) return null;
      return {
        verified: true,
        placeId,
        fullAddress: r.address || "",
        streetNumber: r.street_number || "",
        streetName: r.street_name || "",
        city: r.city || "",
        province: r.province || "",
        postalCode: r.postal_code || "",
        country: r.country || "CA",
        latitude: typeof r.latitude === "number" ? r.latitude : null,
        longitude: typeof r.longitude === "number" ? r.longitude : null,
      };
    } catch {
      return null;
    } finally {
      sessionRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    reqIdRef.current += 1;
    lastQueryRef.current = "";
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setIsLoading(false);
    setPredictions([]);
    setError(null);
  }, []);

  return { predictions, isLoading, error, search, fetchDetails, reset };
}
