/**
 * useAlexSalesSession — Manages the Alex sales closer conversation state.
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SalesStep =
  | "greeting" | "ask_service" | "ask_city" | "ask_revenue"
  | "ask_job_value" | "ask_capacity" | "show_projection"
  | "recommend_plan" | "checkout_ready" | "activating" | "success";

export interface SalesProjection {
  target_revenue: number;
  avg_job_value: number;
  rdv_annual: number;
  rdv_monthly: number;
  recommended_plan: string;
}

export interface SalesPlanRec {
  plan: string;
  price: number;
}

export interface SalesMessage {
  id: string;
  sender: "alex" | "user";
  text: string;
  timestamp: number;
}

export interface SalesObjection {
  type: string;
  resolved: boolean;
}

export function useAlexSalesSession(language: "fr" | "en" = "fr") {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<SalesStep>("greeting");
  const [messages, setMessages] = useState<SalesMessage[]>([]);
  const [projection, setProjection] = useState<SalesProjection | null>(null);
  const [planRec, setPlanRec] = useState<SalesPlanRec | null>(null);
  const [objection, setObjection] = useState<SalesObjection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uiActions, setUiActions] = useState<string[]>([]);
  const msgCounter = useRef(0);

  const addMessage = useCallback((sender: "alex" | "user", text: string) => {
    msgCounter.current++;
    setMessages(prev => [...prev, {
      id: `msg-${msgCounter.current}`,
      sender,
      text,
      timestamp: Date.now(),
    }]);
  }, []);

  const startSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("alex-sales-process-turn", {
        body: { language },
      });
      if (error) throw error;
      setSessionId(data.sales_session_id);
      setStep(data.current_step || "greeting");
      addMessage("alex", data.alex_response);
    } finally {
      setIsLoading(false);
    }
  }, [language, addMessage]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addMessage("user", text);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("alex-sales-process-turn", {
        body: {
          sales_session_id: sessionId,
          user_message: text,
          language,
        },
      });
      if (error) throw error;
      
      setStep(data.current_step || step);
      addMessage("alex", data.alex_response);
      
      if (data.projection) setProjection(data.projection);
      if (data.plan_recommendation) setPlanRec(data.plan_recommendation);
      if (data.objection_state) setObjection(data.objection_state);
      if (data.ui_actions) setUiActions(data.ui_actions);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, language, step, addMessage]);

  return {
    sessionId,
    step,
    messages,
    projection,
    planRec,
    objection,
    isLoading,
    uiActions,
    startSession,
    sendMessage,
  };
}
