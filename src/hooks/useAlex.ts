import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AlexContractorVerificationContext } from "@/services/alexVerificationContext";

type Msg = { role: "user" | "assistant"; content: string };

const ALEX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-chat`;

interface UseAlexOptions {
  onResponseComplete?: (fullText: string) => void;
  onSentenceReady?: (sentence: string) => void;
}

export const useAlex = (options?: UseAlexOptions) => {
  const { session, isAuthenticated, role } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sendMessage = useCallback(
    async (
      input: string,
      context?: {
        properties?: Array<{ address: string; city?: string | null }>;
        homeScore?: number | null;
        currentPage?: string;
        voiceMode?: boolean;
        /** Contractor verification context for trust-aware responses */
        contractorVerification?: AlexContractorVerificationContext | null;
      }
    ) => {
      const userMsg: Msg = { role: "user", content: input };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let assistantSoFar = "";
      let sentenceBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });

        // Stream sentences to TTS as they arrive
        if (optionsRef.current?.onSentenceReady) {
          sentenceBuffer += chunk;
          // Look for sentence boundaries
          const regex = /[.!?]\s/g;
          let match: RegExpExecArray | null;
          let lastEnd = 0;
          while ((match = regex.exec(sentenceBuffer)) !== null) {
            const sentence = sentenceBuffer.slice(lastEnd, match.index + 1).trim();
            if (sentence.length > 5) {
              optionsRef.current.onSentenceReady(sentence);
            }
            lastEnd = match.index + match[0].length;
          }
          sentenceBuffer = sentenceBuffer.slice(lastEnd);
        }
      };

      try {
        const allMessages = [...messages, userMsg];
        const enrichedContext = {
          ...context,
          isAuthenticated,
          userRole: role,
          userId: session?.user?.id,
          userName: session?.user?.user_metadata?.full_name?.split(" ")[0],
        };

        const resp = await fetch(ALEX_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context: enrichedContext,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Erreur" }));
          upsertAssistant(err.error || "Désolé, une erreur est survenue.");
          setIsStreaming(false);
          return;
        }

        if (!resp.body) {
          upsertAssistant("Désolé, je ne peux pas répondre pour le moment.");
          setIsStreaming(false);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;

        while (!streamDone) {
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
            if (jsonStr === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Flush remaining text buffer
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              /* ignore */
            }
          }
        }

        // Flush remaining sentence buffer
        if (sentenceBuffer.trim() && optionsRef.current?.onSentenceReady) {
          optionsRef.current.onSentenceReady(sentenceBuffer.trim());
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          upsertAssistant("Désolé, une erreur est survenue. Réessayez.");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        if (assistantSoFar) {
          optionsRef.current?.onResponseComplete?.(assistantSoFar);
        }
      }
    },
    [messages, session, isAuthenticated, role]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, cancel, reset };
};
