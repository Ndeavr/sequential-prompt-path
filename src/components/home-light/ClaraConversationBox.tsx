/**
 * ClaraConversationBox — Large inline conversational box on the light homepage.
 *
 * RULES:
 * - Text-first. NO voice overlay/popup on load or on first message.
 * - Voice is strictly opt-in via an explicit secondary button.
 * - Streams responses from the `alex-chat` edge function.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic } from "lucide-react";

import { cleanAlexText } from "@/utils/sanitizeAlexText";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const GREETING =
  "Bonjour. Que souhaitez-vous comprendre au sujet de votre propriété aujourd'hui ?";

const SUGGESTIONS = [
  "J'ai une infiltration d'eau",
  "Ma toiture a 20 ans",
  "Je veux refaire mon entrée",
  "Je suis entrepreneur",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ClaraConversationBox() {
  const { openAlex } = useAlexVoice();
  const [messages, setMessages] = useState<Msg[]>([
    { id: "greeting", role: "assistant", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      setError(null);
      setInput("");
      const history = [...messages, { id: uid(), role: "user" as const, text }];
      setMessages(history);
      setBusy(true);
      trackCopilotEvent("home_clara_message_sent");

      const assistantId = uid();
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/alex-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            messages: history
              .filter((m) => m.id !== "greeting")
              .map((m) => ({ role: m.role, content: m.text })),
            context: { surface: "home_clara_box" },
          }),
        });

        if (!res.ok || !res.body) throw new Error(`alex-chat ${res.status}`);

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", text: "" },
        ]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let full = "";

        for (;;) {
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
              if (typeof delta === "string") {
                full += delta;
                const shown = cleanAlexText(full);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, text: shown } : m,
                  ),
                );
              }
            } catch {
              /* partial frame — ignore */
            }
          }
        }

        const finalText = cleanAlexText(full);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text:
                    finalText ||
                    "Je continue ici avec vous. Décrivez-moi la situation en quelques mots.",
                }
              : m,
          ),
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setError("Je continue ici avec vous. Reformulez en une phrase.");
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  const startVoice = () => {
    useAlexStore.getState().markUserEngaged();
    openAlex("home_hero", "user_tapped_orb");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12 }}
      className="mx-auto mt-10 w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-card text-left shadow-xl shadow-primary/10"
      aria-label="Conversation avec Clara"
    >
      <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <p className="text-sm font-semibold text-foreground">Clara</p>
        <button
          type="button"
          onClick={startVoice}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Mic className="h-3.5 w-3.5" />
          Passer à la voix
        </button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[42vh] min-h-[220px] space-y-3 overflow-y-auto px-5 py-5"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground"
                : "mr-auto max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-4 py-3 text-[15px] leading-relaxed text-foreground"
            }
          >
            {m.text}
          </div>
        ))}

        {busy && (
          <div className="mr-auto rounded-2xl bg-muted px-4 py-3 text-[14px] text-muted-foreground">
            Analyse en cours…
          </div>
        )}

        {error && (
          <div className="mr-auto rounded-2xl bg-muted px-4 py-3 text-[14px] text-foreground">
            {error}
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-5 pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-border bg-background px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 px-5 py-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Décrivez votre situation…"
          aria-label="Votre message pour Clara"
          className="h-12 flex-1 rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          data-cta-canonical="home_alex"
          aria-label="Envoyer"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
    </motion.section>
  );
}
