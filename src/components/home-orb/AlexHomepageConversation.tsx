/**
 * AlexHomepageConversation — Inline Alex chat with state machine.
 *
 * State: idle | listening | thinking | speaking | error
 *
 * Speaking sync: split each assistant utterance into sentences and call
 * `speak()` per sentence. Each sentence is revealed right before its TTS
 * chunk plays; awaiting `speak(s)` resolves when that chunk's audio ends,
 * so reveal stays naturally synced with the voice.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Mic, Send } from "lucide-react";
import AlexInlineTranscript, {
  type AlexInlineMessage,
} from "./AlexInlineTranscript";
import { useAlexVoice as useAlexTTS } from "@/features/alex/hooks/useAlexVoice";
import { prepareAlexSpeechText } from "@/lib/prepareAlexSpeechText";

export type AlexState = "idle" | "listening" | "thinking" | "speaking" | "error";

export type AlexHomepageConversationHandle = {
  start: () => void;
};

interface Props {
  greeting: string;
  onStateChange?: (state: AlexState) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Split into natural sentences while keeping punctuation. */
function splitSentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g);
  return (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
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
        /* ignore */
      }
    }
  }

  return full.trim() || "Désolée, je n'ai pas saisi. Pouvez-vous reformuler?";
}

export default forwardRef<AlexHomepageConversationHandle, Props>(
  function AlexHomepageConversation({ greeting, onStateChange }, ref) {
    const [messages, setMessages] = useState<AlexInlineMessage[]>([]);
    const [input, setInput] = useState("");
    const [state, setState] = useState<AlexState>("idle");
    const [liveSpoken, setLiveSpoken] = useState<string[]>([]);
    const hasGreetedRef = useRef(false);
    const greetingInflight = useRef(false);

    const { speak, unlockAudio } = useAlexTTS();

    useEffect(() => {
      onStateChange?.(state);
    }, [state, onStateChange]);

    /**
     * Speak text sentence-by-sentence, revealing each line before its audio chunk.
     * Returns the full text once the whole utterance has played.
     */
    const speakProgressive = useCallback(
      async (text: string) => {
        const sentences = splitSentences(text);
        setLiveSpoken([]);
        setState("speaking");

        for (const sentence of sentences) {
          setLiveSpoken((prev) => [...prev, sentence]);
          try {
            await speak(prepareAlexSpeechText(sentence, "fr"));
          } catch {
            /* TTS errors are logged inside the hook */
          }
        }

        // Persist the full utterance to messages, then collapse the live block.
        setMessages((m) => [
          ...m,
          { id: uid(), role: "assistant", text },
        ]);
        // Brief pause so the last line isn't ripped away mid-breath.
        await new Promise((r) => setTimeout(r, 600));
        setLiveSpoken([]);
        setState("idle");
      },
      [speak],
    );

    const greet = useCallback(async () => {
      if (hasGreetedRef.current || greetingInflight.current) return;
      greetingInflight.current = true;
      try {
        await unlockAudio();
        await speakProgressive(greeting);
        hasGreetedRef.current = true;
      } finally {
        greetingInflight.current = false;
      }
    }, [greeting, speakProgressive, unlockAudio]);

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
        setState("thinking");
        try {
          const reply = await callAlexChat(next);
          await speakProgressive(reply);
        } catch {
          setState("error");
          setTimeout(() => setState("idle"), 2500);
        }
      },
      [messages, speakProgressive],
    );

    useImperativeHandle(ref, () => ({ start: () => greet() }), [greet]);

    const captionLine =
      state === "listening"
        ? "Je vous écoute…"
        : state === "thinking"
        ? "Analyse en cours…"
        : state === "error"
        ? "Je n'ai pas bien compris. Pouvez-vous répéter?"
        : null;

    return (
      <div className="w-full">
        <AlexInlineTranscript
          messages={messages}
          liveSpoken={state === "speaking" ? liveSpoken : []}
          captionLine={captionLine}
          captionTone={state === "error" ? "error" : "neutral"}
        />

        {/* Inline composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!hasGreetedRef.current) {
              greet();
              return;
            }
            sendUser(input);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (!hasGreetedRef.current) greet();
            }}
            placeholder="Décrivez votre situation…"
            className="flex-1 h-11 rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-blue-400/50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Envoyer"
            className="shrink-0 w-11 h-11 rounded-full inline-flex items-center justify-center bg-blue-500 text-white disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  },
);
