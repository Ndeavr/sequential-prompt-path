/**
 * useCalendarConnection — hooks for the Calendar Connection module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
}

export function useCalendarConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("calendar_connections")
      .select("id, user_id, provider, provider_account_email, connection_status, ics_token, is_primary, connected_at, last_synced_at, last_error_message")
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false });
    setConnections((data ?? []) as CalendarConnection[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const isConnected = connections.some(
    (c) => c.connection_status === "connected" || c.connection_status === "subscribed_external"
  );
  const primary = connections.find((c) => c.is_primary) ?? connections[0] ?? null;

  return { connections, primary, isConnected, loading, refresh };
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
      return;
    }
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-google-oauth-start`);
    if (returnTo) url.searchParams.set("return_to", returnTo);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json();
    if (body?.auth_url) window.location.href = body.auth_url;
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
    return await res.json() as { webcal_url: string; https_url: string; ics_token: string };
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
