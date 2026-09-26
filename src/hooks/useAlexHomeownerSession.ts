/**
 * useAlexHomeownerSession — Manages homeowner voice closer session state.
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isQualificationEngineEnabled } from "@/lib/alexFeatureFlags";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

interface HomeownerMessage {
  id: string;
  sender: "user" | "alex";
  text: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface DiagnosisData {
  project_type: string | null;
  city: string | null;
  urgency: string | null;
  professional_type: string | null;
}

interface NextAction {
  type: string;
  label_fr: string;
  label_en: string;
}

export function useAlexHomeownerSession() {
  const { user } = useAuth();
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState<HomeownerMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState("diagnosis");
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hasMatches, setHasMatches] = useState(false);
  const startedRef = useRef(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }, []);

  const startSession = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      // Create session in DB
      await (supabase.from("alex_homeowner_sessions") as any).insert({
        session_token: sessionToken,
        user_id: user?.id || null,
        language: "fr",
        locale_code: "fr-FR",
        current_step: "diagnosis",
      });

      const greeting = user
        ? "Bonjour. Comment puis-je vous aider?"
        : "Bonjour. Comment puis-je vous aider avec votre projet?";

      setMessages([{
        id: crypto.randomUUID(),
        sender: "alex",
        text: greeting,
        timestamp: new Date(),
      }]);
      setSessionStarted(true);
    } catch (err) {
      console.error("Failed to start homeowner session:", err);
      startedRef.current = false;
    }
  }, [sessionToken, user]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: HomeownerMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const token = await getToken();
      const useV3 = isQualificationEngineEnabled();
      const endpoint = useV3 ? "alex-qualify-turn" : "alex-homeowner-process-turn";
      const payload = useV3
        ? { session_token: sessionToken, user_message: text }
        : { homeowner_session_id: sessionToken, user_message: text, message_mode: "text" };

      const resp = await fetch(`${FUNCTIONS_BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => null);

      // La conversation ne reste jamais muette : toute réponse vide ou en
      // échec produit une relance utilisable, sans exposer d'erreur technique.
      if (!resp.ok || !data) {
        throw new Error(`turn_failed_${resp.status}`);
      }

      if (useV3) {
        const alexText = data.status === "qualified"
          ? (data.summary_fr ?? data.recommendation_headline_fr ?? "")
          : (data.next_question?.q ?? "");
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          sender: "alex",
          text: alexText || "Pouvez-vous m'en dire un peu plus sur votre projet ?",
          timestamp: new Date(),
          metadata: {
            status: data.status,
            score: data.score,
            next_question: data.next_question,
            graph_summary: data.graph_summary ?? data.graph,
            ready_for_match: data.ready_for_match,
            recommendation_headline_fr: data.recommendation_headline_fr,
            project_id: data.project_id ?? null,
          },
        }]);
        if (data.project_id) setProjectId(data.project_id);
        if (typeof data.has_matches === "boolean") setHasMatches(data.has_matches);
        if (data.status === "qualified") setCurrentStep("matching");
      } else {
        const chunk = data.alex_response_chunks?.[0]?.text;
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          sender: "alex",
          text: chunk || "Pouvez-vous m'en dire un peu plus sur votre projet ?",
          timestamp: new Date(),
          metadata: { next_action: data.next_action, scores: data.scores },
        }]);
        if (data.diagnosis) setDiagnosis(data.diagnosis);
        if (data.next_action) setNextAction(data.next_action);
        if (data.language) setLanguage(data.language);
      }
    } catch (err) {
      console.error("Homeowner process turn error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "alex",
          text: language === "fr" ? "Désolé, une erreur s'est produite. Réessayez." : "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionToken, isProcessing, getToken, language]);

  return {
    sessionToken,
    messages,
    isProcessing,
    currentStep,
    diagnosis,
    nextAction,
    language,
    sessionStarted,
    startSession,
    sendMessage,
  };
}
