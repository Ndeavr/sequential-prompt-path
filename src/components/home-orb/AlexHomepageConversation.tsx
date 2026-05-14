/**
 * AlexHomepageConversation — Inline Alex chat that lives INSIDE the homepage
 * hero. No overlay, no route change. Renders messages, accepts text + mic
 * triggers, and speaks Alex replies via the existing TTS service.
 *
 * Voice live-mode (continuous mic) intentionally falls back to text input on
 * the homepage — the goal is "conversation that never leaves the page".
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Mic, Send } from "lucide-react";
import AlexInlineTranscript, {
  type AlexInlineMessage,
} from "./AlexInlineTranscript";
import { useAlexVoice as useAlexTTS } from "@/features/alex/hooks/useAlexVoice";

export type AlexHomepageConversationHandle = {
  start: () => void;
  send: (text: string) => void;
};

interface Props {
  /** Spoken when the user first interacts. Display version stays as-is. */
  greeting: string;
  /** Forwarded to the orb so it can switch state. */
  onActivityChange?: (active: boolean) => void;
  onAssistantSpeakingChange?: (speaking: boolean) => void;
  /** Visual style. "dark" = original navy hero, "warm" = cream concierge. */
  variant?: "dark" | "warm";
  /** Hide the built-in composer (orb + input) — caller renders its own. */
  hideComposer?: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

async function callAlexChat(messages: AlexInlineMessage[]): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/alex-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.text })),
      context: { surface: "home_hero" },
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`alex-chat ${res.status}`);
  }

  // SSE: parse OpenAI-style deltas and accumulate.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") full += delta;
      } catch {
        // ignore malformed chunks
      }
    }
  }

  return full.trim() || "Désolée, je n'ai pas saisi. Pouvez-vous reformuler?";
}

export default forwardRef<AlexHomepageConversationHandle, Props>(function AlexHomepageConversation(
  { greeting, onActivityChange, onAssistantSpeakingChange, variant = "dark", hideComposer = false },
  ref,
) {
  const [messages, setMessages] = useState<AlexInlineMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const greetingInflight = useRef(false);

  const { speak, unlockAudio } = useAlexTTS();

  useEffect(() => {
    onActivityChange?.(messages.length > 0 || isThinking);
  }, [messages.length, isThinking, onActivityChange]);

  const speakAndTrack = useCallback(
    async (text: string) => {
      try {
        onAssistantSpeakingChange?.(true);
        await speak(text);
      } catch {
        /* swallowed — TTS already logs */
      } finally {
        onAssistantSpeakingChange?.(false);
      }
    },
    [speak, onAssistantSpeakingChange],
  );

  const greet = useCallback(async () => {
    if (hasGreeted || greetingInflight.current) return;
    greetingInflight.current = true;
    try {
      await unlockAudio(); // unlocks audio + speaks any pending greeting from the store
      setMessages((m) =>
        m.length === 0
          ? [{ id: uid(), role: "assistant", text: greeting }]
          : m,
      );
      // Speak the homepage-specific greeting explicitly (independent of store).
      await speakAndTrack(greeting);
      setHasGreeted(true);
    } finally {
      greetingInflight.current = false;
    }
  }, [greeting, hasGreeted, speakAndTrack, unlockAudio]);

  const sendUser = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const userMsg: AlexInlineMessage = {
        id: uid(),
        role: "user",
        text: trimmed,
      };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setIsThinking(true);
      try {
        const reply = await callAlexChat(next);
        const aMsg: AlexInlineMessage = {
          id: uid(),
          role: "assistant",
          text: reply,
        };
        setMessages((m) => [...m, aMsg]);
        setIsThinking(false);
        speakAndTrack(reply);
      } catch (e) {
        setIsThinking(false);
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            text:
              "Petit pépin de connexion. Réessayez dans quelques secondes — je reste ici.",
          },
        ]);
      }
    },
    [messages, speakAndTrack],
  );

  useImperativeHandle(
    ref,
    () => ({
      start: () => {
        void greet();
      },
      send: (text: string) => {
        if (!hasGreeted) void greet();
        void sendUser(text);
      },
    }),
    [greet, sendUser, hasGreeted],
  );

  return (
    <div className="w-full">
      <AlexInlineTranscript messages={messages} isThinking={isThinking} />

      {hideComposer ? null : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!hasGreeted) greet();
            sendUser(input);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => greet()}
            aria-label="Activer Alex"
            className={
              variant === "warm"
                ? "shrink-0 w-11 h-11 rounded-full inline-flex items-center justify-center bg-[#0E5E4E] text-white shadow-md"
                : "shrink-0 w-11 h-11 rounded-full inline-flex items-center justify-center border border-blue-400/40 bg-[hsl(220_60%_8%)] text-blue-300 hover:text-white transition"
            }
            style={
              variant === "warm"
                ? undefined
                : {
                    boxShadow:
                      "0 0 0 4px hsl(212 100% 50% / 0.18), 0 12px 30px -10px hsl(212 100% 50% / 0.5)",
                  }
            }
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (!hasGreeted) greet();
            }}
            placeholder="Décrivez votre projet, votre problème ou votre urgence…"
            className={
              variant === "warm"
                ? "flex-1 h-11 rounded-full border border-[#0F1B2D]/10 bg-white px-4 text-sm text-[#0F1B2D] placeholder:text-[#0F1B2D]/40 outline-none focus:border-[#0E5E4E]/40"
                : "flex-1 h-11 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-400/50"
            }
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Envoyer"
            className={
              variant === "warm"
                ? "shrink-0 w-11 h-11 rounded-full inline-flex items-center justify-center bg-[#0E5E4E] text-white disabled:opacity-40"
                : "shrink-0 w-11 h-11 rounded-full inline-flex items-center justify-center bg-blue-500 text-white disabled:opacity-40"
            }
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );

  // (unreachable placeholder removed below — useImperativeHandle declared above return)
});

