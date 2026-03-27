/**
 * useAlexHomeownerSession — Manages homeowner voice closer session state.
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
      const resp = await fetch(`${FUNCTIONS_BASE}/alex-homeowner-process-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          homeowner_session_id: sessionToken,
          user_message: text,
          message_mode: "text",
        }),
      });

      const data = await resp.json();

      if (data.alex_response_chunks?.length) {
        const alexMsg: HomeownerMessage = {
          id: crypto.randomUUID(),
          sender: "alex",
          text: data.alex_response_chunks[0].text,
          timestamp: new Date(),
          metadata: { next_action: data.next_action, scores: data.scores },
        };
        setMessages((prev) => [...prev, alexMsg]);
      }

      if (data.diagnosis) setDiagnosis(data.diagnosis);
      if (data.next_action) setNextAction(data.next_action);
      if (data.language) setLanguage(data.language);
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
