/**
 * useAlexBrain — Unified hook wiring all Alex intelligence layers.
 * Memory + Emotion + Friction + NextBestAction + Domain Copilot
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { storeMemory, retrieveMemory, summarizeSession, type MemoryEntry } from "@/services/alexMemoryBrain";
import { analyzeEmotion, type EmotionalAnalysis } from "@/services/alexEmotionalEngine";
import { analyzeFriction, createFrictionSignal, type FrictionSignal, type FrictionAnalysis } from "@/services/alexFrictionEngine";
import { getNextBestAction, type NextAction, type UserRole } from "@/services/alexNextBestAction";
import { getCopilotState, type CopilotDomain, type CopilotState, type CopilotContext } from "@/services/alexDomainCopilots";

interface UseAlexBrainOptions {
  hasScore?: boolean;
  hasUploadedPhoto?: boolean;
  hasPendingBooking?: boolean;
  hasSelectedPlan?: boolean;
  hasContractorProfile?: boolean;
}

export function useAlexBrain(options: UseAlexBrainOptions = {}) {
  const { user, role } = useAuth();
  const { pathname } = useLocation();

  const [emotion, setEmotion] = useState<EmotionalAnalysis | null>(null);
  const [friction, setFriction] = useState<FrictionAnalysis | null>(null);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [copilot, setCopilot] = useState<CopilotState | null>(null);

  const frictionSignalsRef = useRef<FrictionSignal[]>([]);
  const conversationHistoryRef = useRef<string[]>([]);

  const mapRole = useCallback((): UserRole => {
    if (role === "contractor") return "contractor";
    if (role === "admin") return "admin";
    return "homeowner";
  }, [role]);

  const mapDomain = useCallback((): CopilotDomain => {
    if (role === "contractor") return "contractor";
    if (pathname.includes("condo") || pathname.includes("syndic")) return "condo";
    return "homeowner";
  }, [role, pathname]);

  // ─── Process user input ───
  const processInput = useCallback((userText: string) => {
    conversationHistoryRef.current.push(userText);

    // Emotional analysis
    const emotionResult = analyzeEmotion(userText, conversationHistoryRef.current);
    setEmotion(emotionResult);

    // Friction analysis
    const frictionResult = analyzeFriction(frictionSignalsRef.current);
    setFriction(frictionResult);

    // Next best action
    const action = getNextBestAction({
      role: mapRole(),
      currentPage: pathname,
      hasScore: options.hasScore ?? false,
      hasUploadedPhoto: options.hasUploadedPhoto ?? false,
      hasPendingBooking: options.hasPendingBooking ?? false,
      hasSelectedPlan: options.hasSelectedPlan ?? false,
      hasContractorProfile: options.hasContractorProfile ?? false,
      isReturningUser: conversationHistoryRef.current.length > 2,
      friction: frictionResult,
      emotion: emotionResult,
    });
    setNextAction(action);

    // Copilot state
    const copilotCtx: CopilotContext = {
      hasPhoto: options.hasUploadedPhoto ?? false,
      hasScore: options.hasScore ?? false,
      hasBooking: options.hasPendingBooking ?? false,
      hasPlan: options.hasSelectedPlan ?? false,
      hasProfile: options.hasContractorProfile ?? false,
    };
    setCopilot(getCopilotState(mapDomain(), copilotCtx));

    // Store in memory
    if (user?.id) {
      storeMemory(user.id, {
        key: "last_question",
        value: userText,
        category: "history",
        importance: 3,
      });
    }

    return { emotion: emotionResult, friction: frictionResult, nextAction: action };
  }, [mapRole, mapDomain, pathname, options, user]);

  // ─── Add friction signal ───
  const addFriction = useCallback((type: string) => {
    frictionSignalsRef.current.push(createFrictionSignal(type));
  }, []);

  // ─── Remember something ───
  const remember = useCallback(async (key: string, value: string, category: MemoryEntry["category"] = "context") => {
    if (!user?.id) return;
    await storeMemory(user.id, { key, value, category, importance: 5 });
  }, [user]);

  // ─── Recall something ───
  const recall = useCallback(async (key: string): Promise<string | null> => {
    if (!user?.id) return null;
    return retrieveMemory(user.id, key);
  }, [user]);

  // ─── Get session summary ───
  const getSessionSummary = useCallback(() => {
    const turns = conversationHistoryRef.current.map((text, i) => ({
      role: (i % 2 === 0 ? "user" : "alex") as "user" | "alex",
      text,
    }));
    return summarizeSession(turns);
  }, []);

  return {
    emotion,
    friction,
    nextAction,
    copilot,
    processInput,
    addFriction,
    remember,
    recall,
    getSessionSummary,
  };
}
