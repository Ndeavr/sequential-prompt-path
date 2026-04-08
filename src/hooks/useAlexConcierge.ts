/**
 * useAlexConcierge — Main hook for Alex Concierge V2.
 * Manages state machine, context resolution, and actions.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveAlexState,
  type AlexContext,
  type AlexState,
  type StateResolution,
  type MatchedContractor,
  type QuickIntent,
} from "@/services/alexStateMachine";

export function useAlexConcierge() {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<AlexState>("CONTEXT_UNKNOWN");
  const [resolution, setResolution] = useState<StateResolution | null>(null);
  const [context, setContext] = useState<AlexContext>({
    userId: null,
    isAuthenticated: false,
    hasProperty: false,
    intentDetected: null,
    category: null,
    urgency: null,
    budgetRange: null,
    matchedContractor: null,
    bookingIntentId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [matchedContractor, setMatchedContractor] = useState<MatchedContractor | null>(null);
  const initialized = useRef(false);

  // Resolve context on mount and auth change
  useEffect(() => {
    async function resolveContext() {
      setIsLoading(true);

      const userId = user?.id || null;
      const authed = !!isAuthenticated && !!userId;

      let hasProperty = false;
      let lastIntent: string | null = null;
      let category: string | null = null;
      let urgency: string | null = null;
      let budgetRange: string | null = null;

      if (authed && userId) {
        // Check property context
        const { data: props } = await supabase
          .from("property_context")
          .select("id")
          .eq("user_id", userId)
          .limit(1);
        hasProperty = (props && props.length > 0) || false;

        // Check user context memory
        const { data: mem } = await supabase
          .from("user_context_memory")
          .select("*")
          .eq("user_id", userId)
          .limit(1);
        if (mem && mem.length > 0) {
          lastIntent = mem[0].last_intent;
          category = mem[0].preferred_category;
          urgency = mem[0].urgency;
          budgetRange = mem[0].budget_range;
        }
      }

      const ctx: AlexContext = {
        userId,
        isAuthenticated: authed,
        hasProperty,
        intentDetected: lastIntent,
        category,
        urgency,
        budgetRange,
        matchedContractor: null,
        bookingIntentId: null,
      };

      setContext(ctx);
      const res = resolveAlexState(ctx);
      setState(res.state);
      setResolution(res);
      setIsLoading(false);
      initialized.current = true;
    }

    resolveContext();
  }, [user, isAuthenticated]);

  // Set intent and re-resolve
  const setIntent = useCallback(async (intent: string, cat?: string) => {
    const newCtx = { ...context, intentDetected: intent, category: cat || intent };
    setContext(newCtx);

    // Save to memory if authenticated
    if (newCtx.userId) {
      await supabase.from("user_context_memory").upsert({
        user_id: newCtx.userId,
        last_intent: intent,
        preferred_category: cat || intent,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }

    const res = resolveAlexState(newCtx);
    setState(res.state);
    setResolution(res);

    // Auto-trigger matching
    if (res.state === "CONTEXT_DEFINED") {
      await triggerMatching(newCtx);
    }
  }, [context]);

  // Trigger matching
  const triggerMatching = useCallback(async (ctx: AlexContext) => {
    setState("MATCHING");

    try {
      const { data, error } = await supabase.functions.invoke("alex-resolve-state", {
        body: {
          action: "match",
          user_id: ctx.userId,
          intent: ctx.intentDetected,
          category: ctx.category,
          urgency: ctx.urgency,
          budget_range: ctx.budgetRange,
        },
      });

      if (error || !data?.contractor) {
        const noMatchCtx = { ...ctx, matchedContractor: null };
        setContext(noMatchCtx);
        setState("NO_MATCH");
        setResolution(resolveAlexState(noMatchCtx));
        return;
      }

      const contractor: MatchedContractor = data.contractor;
      setMatchedContractor(contractor);

      const matchCtx = { ...ctx, matchedContractor: contractor };
      setContext(matchCtx);
      const res = resolveAlexState(matchCtx);
      setState(res.state);
      setResolution(res);

      // Save match result
      if (ctx.userId) {
        await supabase.from("matchmaking_results").insert({
          user_id: ctx.userId,
          project_type: ctx.intentDetected,
          contractor_id: contractor.id,
          score: contractor.aippScore,
          reason: contractor.reason,
          city: null,
          urgency: ctx.urgency,
        });
      }
    } catch (err) {
      console.error("[AlexConcierge] Matching error:", err);
      setState("ERROR");
    }
  }, []);

  // Create booking intent
  const createBookingIntent = useCallback(async (datetime?: string) => {
    if (!context.userId || !matchedContractor) return null;

    const { data, error } = await supabase
      .from("booking_intents")
      .insert({
        user_id: context.userId,
        contractor_id: matchedContractor.id,
        service_type: context.intentDetected,
        datetime: datetime || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (data) {
      const newCtx = { ...context, bookingIntentId: data.id, matchedContractor };
      setContext(newCtx);
      const res = resolveAlexState(newCtx);
      setState(res.state);
      setResolution(res);
    }

    return data;
  }, [context, matchedContractor]);

  // Set property context
  const setProperty = useCallback(async (address: string, city: string, propertyType: string) => {
    if (!context.userId) return;

    await supabase.from("property_context").insert({
      user_id: context.userId,
      address,
      city,
      property_type: propertyType,
    });

    const newCtx = { ...context, hasProperty: true };
    setContext(newCtx);
    const res = resolveAlexState(newCtx);
    setState(res.state);
    setResolution(res);
  }, [context]);

  // Reset session
  const reset = useCallback(() => {
    const newCtx = {
      ...context,
      intentDetected: null,
      category: null,
      urgency: null,
      budgetRange: null,
      matchedContractor: null,
      bookingIntentId: null,
    };
    setContext(newCtx);
    setMatchedContractor(null);
    const res = resolveAlexState(newCtx);
    setState(res.state);
    setResolution(res);
  }, [context]);

  return {
    state,
    resolution,
    context,
    matchedContractor,
    isLoading,
    setIntent,
    setProperty,
    createBookingIntent,
    triggerMatching,
    reset,
  };
}
