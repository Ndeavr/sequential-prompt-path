/**
 * UNPRO — useActivationFunnel
 * Central hook for the 9-screen contractor activation funnel.
 * Persists to Supabase contractor_activation_funnel table.
 * Includes debounced autosave (1.5s).
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  type ActivationFunnelState,
  type ActivationScreen,
  DEFAULT_ACTIVATION_STATE,
  SCREEN_ROUTES,
} from "@/types/activationFunnel";

const SESSION_KEY = "unpro_activation_funnel_id";

export function useActivationFunnel() {
  const [state, setState] = useState<ActivationFunnelState>(DEFAULT_ACTIVATION_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const funnelIdRef = useRef<string | null>(null);

  // Load existing funnel on mount
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Check for existing funnel
        const { data } = await supabase
          .from("contractor_activation_funnel" as any)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data) {
          funnelIdRef.current = (data as any).id;
          sessionStorage.setItem(SESSION_KEY, (data as any).id);
          setState({
            id: (data as any).id,
            user_id: (data as any).user_id,
            mode: (data as any).mode || "solo",
            current_screen: ((data as any).current_screen || 1) as ActivationScreen,
            business_name: (data as any).business_name || "",
            phone: (data as any).phone || "",
            email: (data as any).email || "",
            website: (data as any).website || "",
            import_status: (data as any).import_status || "pending",
            imported_data: (data as any).imported_data || {},
            aipp_score: (data as any).aipp_score || null,
            checklist_state: (data as any).checklist_state || {},
            selected_services: (data as any).selected_services || [],
            selected_zones: (data as any).selected_zones || [],
            media_uploads: (data as any).media_uploads || [],
            preferences: (data as any).preferences || {},
            calendar_connected: (data as any).calendar_connected || false,
            selected_plan: (data as any).selected_plan || null,
            billing_cycle: (data as any).billing_cycle || null,
            stripe_session_id: (data as any).stripe_session_id || null,
            payment_status: (data as any).payment_status || "pending",
            completed_at: (data as any).completed_at || null,
          });
        }
      } catch (e) {
        console.error("Failed to load activation funnel:", e);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Debounced autosave
  const pendingUpdatesRef = useRef<Partial<ActivationFunnelState>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const flushSave = useCallback(async () => {
    if (!funnelIdRef.current || Object.keys(pendingUpdatesRef.current).length === 0) return;
    setSaving(true);
    const toSave = { ...pendingUpdatesRef.current };
    pendingUpdatesRef.current = {};
    try {
      await supabase
        .from("contractor_activation_funnel" as any)
        .update(toSave as any)
        .eq("id", funnelIdRef.current);
    } catch (e) {
      console.error("Failed to save funnel:", e);
    }
    setSaving(false);
  }, []);

  // Save to DB with 1.5s debounce
  const saveToDB = useCallback(async (updates: Partial<ActivationFunnelState>) => {
    if (!funnelIdRef.current) return;
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(flushSave, 1500);
  }, [flushSave]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      flushSave();
    };
  }, [flushSave]);

  // Create new funnel row
  const createFunnel = useCallback(async (data: {
    business_name: string;
    phone: string;
    email: string;
    website?: string;
    mode?: "solo" | "alex";
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const row = {
      user_id: user.id,
      business_name: data.business_name,
      phone: data.phone,
      email: data.email,
      website: data.website || "",
      mode: data.mode || "solo",
      current_screen: 2 as const,
    };

    const { data: inserted, error } = await supabase
      .from("contractor_activation_funnel" as any)
      .insert(row as any)
      .select()
      .single();

    if (error) throw error;
    const id = (inserted as any).id;
    funnelIdRef.current = id;
    sessionStorage.setItem(SESSION_KEY, id);
    setState(prev => ({
      ...prev,
      ...row,
      id,
      user_id: user.id,
    }));
    return id;
  }, []);

  // Update local + DB
  const updateFunnel = useCallback(async (updates: Partial<ActivationFunnelState>) => {
    setState(prev => ({ ...prev, ...updates }));
    await saveToDB(updates);
  }, [saveToDB]);

  // Navigation
  const goToScreen = useCallback(async (screen: ActivationScreen) => {
    setState(prev => ({ ...prev, current_screen: screen }));
    await saveToDB({ current_screen: screen });
    navigate(SCREEN_ROUTES[screen]);
  }, [navigate, saveToDB]);

  const nextScreen = useCallback(async () => {
    const next = Math.min(state.current_screen + 1, 9) as ActivationScreen;
    await goToScreen(next);
  }, [state.current_screen, goToScreen]);

  const prevScreen = useCallback(async () => {
    const prev = Math.max(state.current_screen - 1, 1) as ActivationScreen;
    await goToScreen(prev);
  }, [state.current_screen, goToScreen]);

  // Completion percentages
  const completionBySection = {
    identity: state.business_name && state.phone && state.email ? 100 : state.business_name ? 50 : 0,
    compliance: (state.imported_data as any)?.rbq_number ? 100 : 0,
    services: state.selected_services.length > 0 ? 100 : 0,
    zones: state.selected_zones.length > 0 ? 100 : 0,
    media: state.media_uploads.length >= 3 ? 100 : state.media_uploads.length > 0 ? 50 : 0,
    preferences: Object.keys(state.preferences).length > 0 ? 100 : 0,
    calendar: state.calendar_connected ? 100 : 0,
  };

  const overallCompletion = Math.round(
    Object.values(completionBySection).reduce((a, b) => a + b, 0) / 7
  );

  // Polling for import status
  const pollImportStatus = useCallback(async () => {
    if (!funnelIdRef.current) return;
    const { data } = await supabase
      .from("contractor_activation_funnel" as any)
      .select("import_status, imported_data, aipp_score")
      .eq("id", funnelIdRef.current)
      .single();
    if (data) {
      setState(prev => {
        const updated: ActivationFunnelState = {
          ...prev,
          import_status: (data as any).import_status,
          imported_data: (data as any).imported_data || {},
          aipp_score: (data as any).aipp_score || null,
        };
        return updated;
      });
    }
    return (data as any)?.import_status;
  }, []);

  return {
    state,
    loading,
    saving,
    createFunnel,
    updateFunnel,
    goToScreen,
    nextScreen,
    prevScreen,
    completionBySection,
    overallCompletion,
    pollImportStatus,
    funnelId: funnelIdRef.current,
  };
}
