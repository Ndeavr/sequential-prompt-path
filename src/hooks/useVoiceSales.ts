import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback, useRef } from "react";

export function usePlanCatalog() {
  return useQuery({
    queryKey: ["plan-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_catalog")
        .select("*")
        .eq("active", true)
        .order("position_rank");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export function useLeadPacks() {
  return useQuery({
    queryKey: ["lead-packs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_packs")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export type SalesMessage = { role: "user" | "assistant"; content: string };

export function useVoiceSalesChat() {
  const [messages, setMessages] = useState<SalesMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qualificationData, setQualificationData] = useState<Record<string, any>>({});
  const abortRef = useRef<AbortController | null>(null);

  const createSession = useCallback(async () => {
    const { data } = await supabase
      .from("contractor_plan_sessions")
      .insert({ session_status: "started" })
      .select("id")
      .single();
    if (data) setSessionId(data.id);
    return data?.id;
  }, []);

  const sendMessage = useCallback(async (input: string) => {
    const userMsg: SalesMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    let sid = sessionId;
    if (!sid) sid = await createSession() ?? null;

    const allMessages = [...messages, userMsg];
    let assistantSoFar = "";

    try {
      abortRef.current = new AbortController();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice-sales`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages,
            session_id: sid,
            qualification_data: qualificationData,
          }),
          signal: abortRef.current.signal,
        }
      );

      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
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
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") console.error("Voice sales error:", e);
    } finally {
      setIsStreaming(false);
    }
  }, [messages, sessionId, qualificationData, createSession]);

  const updateQualification = useCallback((data: Record<string, any>) => {
    setQualificationData(prev => ({ ...prev, ...data }));
  }, []);

  return { messages, isStreaming, sendMessage, sessionId, qualificationData, updateQualification };
}
