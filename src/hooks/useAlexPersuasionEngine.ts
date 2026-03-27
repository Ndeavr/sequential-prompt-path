/**
 * useAlexPersuasionEngine — Orchestration hook for the full persuasion pipeline.
 * Ties intent detection, predictive matching, invisible booking, and persuasion together.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  detectUserIntent,
  buildPredictiveMatches,
  scoreBookingReadiness,
  type IntentSignals,
  type IntentResult,
  type PredictiveMatch,
} from "@/services/alexPredictiveMatchEngine";
import {
  prepareBookingDraft,
  resumeBookingAfterAuth,
  logMomentumEvent,
  type BookingDraft,
} from "@/services/alexInvisibleBooking";
import {
  getPersuasionPrompt,
  type PersuasionPrompt,
} from "@/services/alexPersuasionEngine";
import { detectObjection, type ObjectionResult } from "@/services/alexSoftObjectionHandler";
import { supabase } from "@/integrations/supabase/client";

export type EngineState =
  | "listening"
  | "thinking"
  | "predicting"
  | "matching"
  | "preparing_booking"
  | "waiting_input"
  | "objection_handling"
  | "opening_calendar"
  | "auth_resume"
  | "no_result_recovery"
  | "success"
  | "error";

export interface PersuasionEngineState {
  state: EngineState;
  intent: IntentResult | null;
  matches: PredictiveMatch[];
  topMatch: PredictiveMatch | null;
  bookingDraft: BookingDraft | null;
  persuasionPrompt: PersuasionPrompt | null;
  objection: ObjectionResult | null;
  bookingReadiness: number;
  sessionId: string;
}

export function useAlexPersuasionEngine() {
  const { user } = useAuth();
  const sessionIdRef = useRef(crypto.randomUUID());
  const [engineState, setEngineState] = useState<PersuasionEngineState>({
    state: "listening",
    intent: null,
    matches: [],
    topMatch: null,
    bookingDraft: null,
    persuasionPrompt: null,
    objection: null,
    bookingReadiness: 0,
    sessionId: sessionIdRef.current,
  });

  // Resume draft after auth
  useEffect(() => {
    if (user?.id) {
      resumeBookingAfterAuth(sessionIdRef.current, user.id).then((draft) => {
        if (draft) {
          setEngineState((prev) => ({ ...prev, bookingDraft: draft, state: "auth_resume" }));
        }
      });
    }
  }, [user?.id]);

  // Process user message through the full pipeline
  const processMessage = useCallback(
    async (text: string, signals: IntentSignals) => {
      setEngineState((prev) => ({ ...prev, state: "thinking" }));

      // 1. Detect objection first
      const objection = detectObjection(text);
      if (objection.detected) {
        setEngineState((prev) => ({
          ...prev,
          objection,
          state: "objection_handling",
        }));
        await logMomentumEvent(sessionIdRef.current, "objection_detected", -0.1, {
          type: objection.type,
        });
      }

      // 2. Detect intent
      const intent = detectUserIntent(signals);
      setEngineState((prev) => ({ ...prev, intent, state: "predicting" }));

      // 3. Log intent
      await supabase.from("alex_intents" as any).insert({
        session_id: sessionIdRef.current,
        user_id: user?.id || null,
        detected_intent: intent.intent,
        confidence_score: intent.confidence,
        urgency_score: intent.urgency,
        trust_score: intent.trust,
        booking_readiness_score: intent.bookingReadiness,
        friction_score: intent.friction,
        raw_signals: signals,
      });

      // 4. Predictive matching (starts before conversation ends)
      let matches: PredictiveMatch[] = [];
      if (signals.mentionedService || signals.mentionedCity) {
        setEngineState((prev) => ({ ...prev, state: "matching" }));
        matches = await buildPredictiveMatches({
          serviceType: signals.mentionedService,
          city: signals.mentionedCity,
          sessionId: sessionIdRef.current,
        });
      }

      const topMatch = matches[0] || null;
      const readiness = scoreBookingReadiness(intent, !!topMatch);

      // 5. Prepare invisible booking draft if readiness > 0.5
      let draft = engineState.bookingDraft;
      if (readiness > 0.5) {
        setEngineState((prev) => ({ ...prev, state: "preparing_booking" }));
        draft = await prepareBookingDraft({
          sessionId: sessionIdRef.current,
          userId: user?.id,
          contractorId: topMatch?.contractorId,
          serviceType: signals.mentionedService,
          city: signals.mentionedCity,
          projectSummary: text,
        });
        await logMomentumEvent(sessionIdRef.current, "draft_prepared", readiness);
      }

      // 6. Choose persuasion prompt
      const prompt = getPersuasionPrompt({
        bookingReadiness: readiness,
        trustScore: intent.trust,
        frictionScore: intent.friction,
        hasObjection: objection.detected,
        isReturning: false,
        hasMatch: !!topMatch,
      });

      // Log conversion prompt
      await supabase.from("alex_conversion_prompts" as any).insert({
        session_id: sessionIdRef.current,
        prompt_style: prompt.style,
        prompt_text: prompt.text,
        trigger_reason: prompt.triggerReason,
      });

      // 7. Determine final state
      let finalState: EngineState = "waiting_input";
      if (!matches.length && signals.mentionedService) finalState = "no_result_recovery";
      else if (readiness > 0.7 && topMatch) finalState = "opening_calendar";
      else if (objection.detected) finalState = "objection_handling";

      setEngineState({
        state: finalState,
        intent,
        matches,
        topMatch,
        bookingDraft: draft,
        persuasionPrompt: prompt,
        objection,
        bookingReadiness: readiness,
        sessionId: sessionIdRef.current,
      });

      return { intent, matches, topMatch, draft, prompt, objection, readiness };
    },
    [user?.id, engineState.bookingDraft]
  );

  const captureContact = useCallback(
    async (firstName: string, phone: string, email?: string) => {
      const draft = await prepareBookingDraft({
        sessionId: sessionIdRef.current,
        userId: user?.id,
        contactFirstName: firstName,
        contactPhone: phone,
        contactEmail: email,
      });
      if (draft) {
        setEngineState((prev) => ({ ...prev, bookingDraft: draft }));
        await logMomentumEvent(sessionIdRef.current, "contact_captured", 0.9);
      }
      return draft;
    },
    [user?.id]
  );

  const reset = useCallback(() => {
    sessionIdRef.current = crypto.randomUUID();
    setEngineState({
      state: "listening",
      intent: null,
      matches: [],
      topMatch: null,
      bookingDraft: null,
      persuasionPrompt: null,
      objection: null,
      bookingReadiness: 0,
      sessionId: sessionIdRef.current,
    });
  }, []);

  return {
    ...engineState,
    processMessage,
    captureContact,
    reset,
  };
}
