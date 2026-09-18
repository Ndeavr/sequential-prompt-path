/**
 * Clara inline conversation, backed by the existing text, voice and upload flows.
 *
 * ONE CLARA : cette boîte n'a plus d'état conversationnel parallèle. Elle lit et
 * écrit dans la session Clara canonique, ce qui rend la conversation persistante
 * après rafraîchissement, réouverture, authentification et changement d'appareil.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Mic, Paperclip } from "lucide-react";

import { cleanAlexText } from "@/utils/sanitizeAlexText";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";
import { useAlexConversation } from "@/features/alex/hooks/useAlexConversation";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import {
  appendClaraMessage,
  startOrResumeClaraSession,
} from "@/services/clara/claraSession";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Msg = { id: string; role: "user" | "assistant"; text: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ClaraConversationBox() {
  const { openAlex } = useAlexVoice();
  const { handleUpload } = useAlexConversation();
  const { lang } = useLanguage();
  const copy = lang === "fr"
    ? {
        hello: "Bonjour, je suis Clara.",
        question: "Quel projet voulez-vous réaliser ?",
        placeholder: "Décrivez votre projet…",
        attach: "Joindre un document",
        voice: "Parler à Clara",
        send: "Envoyer",
        working: "Analyse en cours…",
        fallback: "Je continue ici avec vous. Reformulez en une phrase.",
      }
    : {
        hello: "Hello, I'm Clara.",
        question: "What project would you like to complete?",
        placeholder: "Describe your project…",
        attach: "Attach a document",
        voice: "Talk to Clara",
        send: "Send",
        working: "Analyzing…",
        fallback: "Pour le moment je fonctionne en français. Je termine mes cours d'anglais sous peu.",
      };
  const [messages, setMessages] = useState<Msg[]>([
    { id: "greeting", role: "assistant", text: copy.question },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Reprise de LA conversation : rafraîchissement, retour, réouverture,
  // et même compte sur un autre appareil.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let cancelled = false;
    (async () => {
      try {
        const state = await startOrResumeClaraSession({ language: lang, entrypoint: "home_clara_box" });
        if (cancelled || state.messages.length === 0) return;
        setMessages((previous) => [
          previous[0],
          ...state.messages.map((m) => ({ id: m.id, role: m.role, text: m.text })),
        ]);
      } catch {
        // Conversation locale utilisable malgré tout : aucune erreur technique affichée.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      setError(null);
      const userMessageId = uid();
      const history = [...messages, { id: userMessageId, role: "user" as const, text }];
      setMessages(history);
      setBusy(true);
      trackCopilotEvent("message_sent", { surface: "home_clara_box" });
      void appendClaraMessage({ role: "user", text, clientMessageId: userMessageId }).catch(() => {});

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
        const shownText =
          finalText || "Je continue ici avec vous. Décrivez-moi la situation en quelques mots.";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: shownText } : m)),
        );
        void appendClaraMessage({
          role: "assistant",
          text: shownText,
          clientMessageId: assistantId,
        }).catch(() => {});
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setError(copy.fallback);
      } finally {
        setBusy(false);
      }
    },
    [busy, copy.fallback, messages],
  );

  const submit = useCallback(async (message: PromptInputMessage) => {
    if (busy) return;
    if (message.files.length > 0) {
      setError(null);
      setBusy(true);
      try {
        for (const attachment of message.files) {
          const response = await fetch(attachment.url);
          const blob = await response.blob();
          const file = new File([blob], attachment.filename || "document", {
            type: attachment.mediaType || blob.type,
          });
          await handleUpload(file, message.text || undefined);
        }
        const uploadId = uid();
        const uploadText = message.text || (lang === "fr" ? "Document joint" : "Attached document");
        setMessages((previous) => [
          ...previous,
          { id: uploadId, role: "user", text: uploadText },
        ]);
        void appendClaraMessage({
          role: "user",
          text: uploadText,
          messageType: "attachment",
          clientMessageId: uploadId,
        }).catch(() => {});
        openAlex("home_hero", "user_uploaded_file");
      } catch {
        setError(copy.fallback);
      } finally {
        setBusy(false);
      }
      return;
    }
    await send(message.text);
  }, [busy, copy.fallback, handleUpload, lang, openAlex, send]);

  const startVoice = () => {
    useAlexStore.getState().markUserEngaged();
    openAlex("home_hero", "user_tapped_orb");
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12 }}
      className="home-clara-glass mx-auto w-full overflow-hidden border border-border text-left"
      aria-label="Conversation avec Clara"
    >
      <div className="home-clara-intro flex items-center">
        <span className="home-clara-halo relative grid shrink-0 place-items-center rounded-full" aria-hidden="true">
          <span className="home-clara-halo-core rounded-full" />
        </span>
        <div>
          <p className="home-clara-greeting font-bold text-foreground">{copy.hello}</p>
          <p className="home-clara-question text-muted-foreground">{copy.question}</p>
        </div>
      </div>

      {messages.length > 1 && (
        <Conversation className="max-h-[28vh] min-h-28">
          <ConversationContent className="gap-3 px-5 py-4 sm:px-6">
            {messages.slice(1).map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent className="leading-relaxed group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
                  <MessageResponse>{message.text}</MessageResponse>
                </MessageContent>
              </Message>
            ))}
            {busy && <Shimmer className="text-sm text-muted-foreground">{copy.working}</Shimmer>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div className="home-clara-composer">
        <PromptInput
          accept="image/*,.pdf,.doc,.docx"
          maxFiles={1}
          maxFileSize={10 * 1024 * 1024}
          onSubmit={submit}
          onError={() => setError(copy.fallback)}
          className="home-clara-prompt"
        >
          <PromptInputTextarea
            aria-label={copy.placeholder}
            placeholder={copy.placeholder}
            disabled={busy}
            className="home-clara-textarea text-foreground placeholder:text-muted-foreground"
          />
          <PromptInputFooter className="home-clara-controls">
            <PromptInputTools>
              <AttachmentButton label={copy.attach} />
              <PromptInputButton type="button" onClick={startVoice} tooltip={copy.voice} aria-label={copy.voice} className="home-clara-tool rounded-full text-muted-foreground hover:text-foreground">
                <Mic className="h-5 w-5" />
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit
              status={busy ? "submitted" : "ready"}
              disabled={busy}
              aria-label={copy.send}
              data-cta-canonical="home_alex"
              className="home-clara-submit rounded-full bg-primary text-primary-foreground shadow-glow hover:bg-primary-strong"
            >
              <ArrowUp className="h-5 w-5" />
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </motion.section>
  );
}

function AttachmentButton({ label }: { label: string }) {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton
      type="button"
      onClick={attachments.openFileDialog}
      tooltip={label}
      aria-label={label}
      className="home-clara-tool rounded-full text-muted-foreground hover:text-foreground"
    >
      <Paperclip className="h-5 w-5" />
    </PromptInputButton>
  );
}
