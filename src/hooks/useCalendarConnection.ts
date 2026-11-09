/**
 * useCalendarConnection — hooks for the Calendar Connection module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CALENDAR_CHANGED_EVENT, hasRequiredCalendarScopes } from "@/lib/calendarReturn";

export type CalendarProvider = "google" | "apple" | "outlook";
export type CalendarStatus =
  | "idle" | "connecting" | "connected"
  | "subscribed_external" | "failed" | "revoked";

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  provider_account_email: string | null;
  connection_status: CalendarStatus;
  ics_token: string | null;
  is_primary: boolean;
  connected_at: string | null;
  last_synced_at: string | null;
  last_error_message: string | null;
  /** Permissions granted by Google, as saved by the OAuth callback. */
  scopes_json?: unknown;
  /** Server-written selection (selected_calendar_id) — owner-readable via RLS. */
  metadata?: unknown;
}

/**
 * Server truth for calendar views, strongest first:
 * reconnect_required (revoked/failed/missing permission) → not_connected →
 * no_selection (connected, no calendar chosen) → not_synced → ready.
 */
export type CalendarReadiness = "not_connected" | "reconnect_required" | "no_selection" | "not_synced" | "ready";

const isUsableGoogle = (c: CalendarConnection) =>
  c.provider === "google" && c.connection_status === "connected" && hasRequiredCalendarScopes(c.scopes_json);

export function selectedCalendarId(connection: CalendarConnection | null | undefined): string | null {
  const meta = connection?.metadata;
  if (!meta || typeof meta !== "object") return null;
  const id = (meta as Record<string, unknown>).selected_calendar_id;
  return typeof id === "string" && id.trim() ? id : null;
}

export function deriveCalendarReadiness(connections: CalendarConnection[]): {
  readiness: CalendarReadiness;
  google: CalendarConnection | null;
} {
  const usable = connections.find(isUsableGoogle) ?? null;
  if (!usable) {
    const google = connections.find((c) => c.provider === "google") ?? null;
    return { readiness: google ? "reconnect_required" : "not_connected", google };
  }
  if (!selectedCalendarId(usable)) return { readiness: "no_selection", google: usable };
  if (!usable.last_synced_at) return { readiness: "not_synced", google: usable };
  return { readiness: "ready", google: usable };
}

/**
 * Count a connection success only for a connection the callback just saved
 * (connected_at is rewritten on every OAuth success) and only once per connection.
 * Opening the success URL later never re-counts an old connection.
 */
export const CALENDAR_SUCCESS_WINDOW_MS = 15 * 60 * 1000;
export function shouldTrackCalendarSuccess(
  connectedAt: string | null | undefined,
  nowMs: number,
  alreadyTrackedKey: string | null,
): boolean {
  if (!connectedAt) return false;
  const at = Date.parse(connectedAt);
  if (!Number.isFinite(at)) return false;
  if (nowMs - at > CALENDAR_SUCCESS_WINDOW_MS || at - nowMs > 60_000) return false;
  return alreadyTrackedKey !== connectedAt;
}

/**
 * A generated Apple webcal link is outgoing only; it never proves that
 * the user subscribed and never grants UNPRO free/busy read access.
 * Keep this pure so it can be tested with synthetic connections.
 */
export function deriveCalendarCapabilities(connections: CalendarConnection[]) {
  // Connected = saved server-side AND every required Google permission granted.
  const usable = isUsableGoogle;
  const isConnected = connections.some(usable);
  const hasExternalAppleFeed = connections.some(
    (c) => c.provider === "apple" && c.connection_status === "subscribed_external"
  );
  const primary = connections.find(usable)
    ?? connections.find((c) => c.is_primary)
    ?? connections[0] ?? null;
  return { isConnected, hasExternalAppleFeed, primary };
}

export function useCalendarConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: readError } = await supabase
      .from("calendar_connections")
      .select("id, user_id, provider, provider_account_email, connection_status, ics_token, is_primary, connected_at, last_synced_at, last_error_message, scopes_json, metadata")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });
    setError(Boolean(readError));
    setConnections((data ?? []) as CalendarConnection[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Every calendar view rereads the saved state after a connection change or tab return.
  useEffect(() => {
    const onChange = () => { void refresh(); };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener(CALENDAR_CHANGED_EVENT, onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(CALENDAR_CHANGED_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const { isConnected, hasExternalAppleFeed, primary } = deriveCalendarCapabilities(connections);
  const { readiness, google } = deriveCalendarReadiness(connections);

  return { connections, primary, google, readiness, isConnected, hasExternalAppleFeed, loading, error, refresh };
}

export function useCalendarConversionTracking() {
  const { user } = useAuth();
  const track = useCallback(async (params: {
    surface: string;
    event_type: string;
    role_context?: string;
    provider?: string;
    prompt_variant?: string;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      await supabase.from("calendar_conversion_events").insert([{
        user_id: user?.id ?? null,
        role_context: params.role_context ?? "guest",
        surface: params.surface,
        prompt_variant: params.prompt_variant ?? null,
        provider: params.provider ?? null,
        event_type: params.event_type,
        metadata: (params.metadata ?? {}) as never,
      } as never]);
    } catch (e) {
      console.warn("[calendar tracking]", e);
    }
  }, [user]);
  return { track };
}

export function useStartGoogleOAuth() {
  const startGoogle = useCallback(async (returnTo?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/role";
      return false;
    }
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-google-oauth-start`);
    if (returnTo) url.searchParams.set("return_to", returnTo);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json().catch(() => ({})) as { auth_url?: string; error?: string };
    if (!res.ok || !body.auth_url) {
      throw new Error(body.error || "calendar_oauth_start_failed");
    }
    window.location.assign(body.auth_url);
    return true;
  }, []);
  return { startGoogle };
}

export function useSubscribeAppleCalendar() {
  const subscribe = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = "/role";
      return null;
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-apple-ics`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      },
    );
    const body = await res.json().catch(() => ({})) as Partial<{
      webcal_url: string;
      https_url: string;
      ics_token: string;
      error: string;
    }>;
    if (!res.ok || !body.webcal_url || !body.https_url || !body.ics_token) {
      throw new Error(body.error || "calendar_apple_subscription_failed");
    }
    return body as { webcal_url: string; https_url: string; ics_token: string };
  }, []);
  return { subscribe };
}

export function useDisconnectCalendar() {
  const disconnect = useCallback(async (provider: CalendarProvider) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-disconnect`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider }),
      },
    );
  }, []);
  return { disconnect };
}

export function useCalendarPrompt(role: string, surface: string, lang: "fr" | "en" = "fr") {
  const [prompt, setPrompt] = useState<{
    headline: string; subtext: string; primary_cta: string; secondary_cta: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("calendar_connection_prompts")
        .select("headline, subtext, primary_cta, secondary_cta")
        .eq("role_type", role)
        .eq("surface", surface)
        .eq("language", lang)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setPrompt(data);
    })();
    return () => { cancelled = true; };
  }, [role, surface, lang]);

  return prompt;
}
