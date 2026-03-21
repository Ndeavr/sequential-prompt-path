/**
 * UNPRO — AI Coach Contractor Hook
 * Streaming chat + recommendations + nudges
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useContractorProfile, useContractorReviews } from "./useContractor";
import { useAppointments } from "./useAppointments";
import { useAuth } from "./useAuth";

type Msg = { role: "user" | "assistant"; content: string };

export function useContractorCoach() {
  const { user } = useAuth();
  const { data: profile } = useContractorProfile();
  const { data: reviews } = useContractorReviews();
  const { data: appointments } = useAppointments();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buildContext = useCallback(() => {
    if (!profile) return null;
    const fields = [
      profile.business_name, profile.specialty, profile.description,
      profile.phone, profile.email, profile.city, profile.license_number,
      profile.insurance_info, profile.logo_url, profile.website,
    ];
    const filled = fields.filter(Boolean).length;
    const completeness = Math.round((filled / fields.length) * 100);
    const missing = [];
    if (!profile.business_name) missing.push("nom entreprise");
    if (!profile.specialty) missing.push("spécialité");
    if (!profile.description) missing.push("description");
    if (!profile.phone) missing.push("téléphone");
    if (!profile.email) missing.push("email");
    if (!profile.city) missing.push("ville");
    if (!profile.license_number) missing.push("licence RBQ");
    if (!profile.insurance_info) missing.push("assurance");
    if (!profile.logo_url) missing.push("logo");
    if (!profile.website) missing.push("site web");

    const appts = appointments ?? [];
    return {
      business_name: profile.business_name,
      specialty: profile.specialty,
      city: profile.city,
      aipp_score: profile.aipp_score,
      rating: profile.rating,
      review_count: reviews?.length ?? 0,
      completeness,
      plan: "recrue", // TODO: from subscription
      license_number: profile.license_number,
      insurance_info: profile.insurance_info,
      logo_url: profile.logo_url,
      website: profile.website,
      years_experience: profile.years_experience,
      missing_fields: missing,
      new_appointments: appts.filter((a: any) => a.status === "requested" || a.status === "under_review").length,
      completed_appointments: appts.filter((a: any) => a.status === "completed").length,
    };
  }, [profile, reviews, appointments]);

  const sendMessage = useCallback(async (input: string, mode = "quick") => {
    const userMsg: Msg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contractor-coach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map(m => ({ role: m.role, content: m.content })),
            contractorContext: buildContext(),
            mode,
          }),
          signal: controller.signal,
        }
      );

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur du coach IA");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e.message || "Erreur inattendue");
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, buildContext]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    interrupt,
    contractorContext: buildContext(),
  };
}
