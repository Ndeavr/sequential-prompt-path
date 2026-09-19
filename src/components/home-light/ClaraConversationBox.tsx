/**
 * Clara inline conversation, backed by the existing text, voice and upload flows.
 *
 * ONE CLARA : cette boîte n'a plus d'état conversationnel parallèle. Elle lit et
 * écrit dans la session Clara canonique, ce qui rend la conversation persistante
 * après rafraîchissement, réouverture, authentification et changement d'appareil.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Camera, Mic, Plus } from "lucide-react";

import { cleanAlexText } from "@/utils/sanitizeAlexText";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexStore } from "@/features/alex/state/alexStore";
import { useAlexConversation } from "@/features/alex/hooks/useAlexConversation";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import {
  appendClaraMessage,
  rememberClaraReferences,
  startOrResumeClaraSession,
} from "@/services/clara/claraSession";
import {
  CLARA_VOICE_CLOSED_EVENT,
  CLARA_VOICE_MESSAGE_EVENT,
} from "@/services/clara/claraVoiceBridge";
import { detectClaraWorkflowIntent } from "@/services/alexIntentClassifier";
import {
  logClaraWorkflowEvent,
  nextWorkflowState,
  readWorkflow,
  rememberWorkflow,
  type ClaraWorkflowState,
} from "@/services/clara/claraWorkflow";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClaraMediaQueue } from "@/services/clara/claraMediaQueue";

const ClaraContextPanel = lazy(() => import("@/components/home-light/ClaraContextPanel"));
import type { ClaraSurfaceMode } from "@/components/home-light/ClaraContextPanel";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Msg = { id: string; role: "user" | "assistant"; text: string };

const QUOTE_PATTERN = /\b(soumission|soumissions|devis|comparer|comparaison)\b/i;
const CONTRACTOR_PATTERN = /\b(vérifi|verification|entrepreneur|contracteur|construction|plombier|peintre|couvreur|électricien|mon entreprise|je suis pro)\b/i;
const APPOINTMENT_PATTERN = /\b(rendez-vous|réserver|disponibilit|horaire|quand)\b/i;
const MATCH_PATTERN = /\b(jumelage|recommande|entrepreneur compatible|bon entrepreneur)\b/i;
const PROJECT_PATTERN = /\b(réparer|rénover|moderniser|améliorer|cuisine|salle de bain|toit|toiture|fuite|eau|fissure|projet)\b/i;

function detectSurfaceMode(text: string): ClaraSurfaceMode {
  if (QUOTE_PATTERN.test(text)) return "QUOTE";
  if (CONTRACTOR_PATTERN.test(text)) return "CONTRACTOR";
  if (APPOINTMENT_PATTERN.test(text)) return "APPOINTMENT";
  if (MATCH_PATTERN.test(text)) return "MATCH";
  if (PROJECT_PATTERN.test(text)) return "PROJECT";
  return "IDLE";
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Clara décide elle-même quand une question a des réponses fermées : elle
 * termine alors son message par un marqueur `[[CHOIX: A | B | C]]`.
 * Le marqueur n'est jamais affiché ; il devient des boutons de réponse rapide.
 */
export const CHOICE_MARKER = /\[\[\s*CHOIX\s*:([^\]]*)\]\]/i;

export function extractQuickReplies(raw: string): { text: string; options: string[] } {
  const match = raw.match(CHOICE_MARKER);
  if (!match) return { text: raw, options: [] };
  const options = match[1]
    .split("|")
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 6);
  return { text: raw.replace(CHOICE_MARKER, "").trim(), options };
}

type QuickReplies = { messageId: string; options: string[] };

export default function ClaraConversationBox() {
  const { openAlex } = useAlexVoice();
  const { handleUpload } = useAlexConversation();
  const { lang } = useLanguage();
  const copy = lang === "fr"
    ? {
        placeholder: "Bonjour ! Que puis-je-faire pour vous?",
        attach: "Ajouter une photo ou un document",
        camera: "Prendre une photo",
        voice: "Parler à Clara",
        send: "Envoyer",
        working: "Analyse en cours…",
        fallback: "Je continue ici avec vous. Reformulez en une phrase.",
      }
    : {
        placeholder: "Bonjour ! Que puis-je-faire pour vous?",
        attach: "Ajouter une photo ou un document",
        camera: "Prendre une photo",
        voice: "Talk to Clara",
        send: "Send",
        working: "Analyse en cours…",
        fallback: "Pour le moment je fonctionne en français. Je termine mes cours d'anglais sous peu.",
      };
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ClaraSurfaceMode>("IDLE");
  const [quoteCount, setQuoteCount] = useState(0);
  const [contextStatus, setContextStatus] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReplies | null>(null);
  const hydrated = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoCameraRef = useRef<HTMLInputElement>(null);
  const photoLibraryRef = useRef<HTMLInputElement>(null);
  const videoLibraryRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  // Parcours en cours : lu depuis la session canonique, jamais recréé localement.
  const workflowRef = useRef<ClaraWorkflowState | null>(null);

  // File d'attente média unique : progression réelle, reprise, rien de perdu.
  const mediaItems = useClaraMediaQueue((state) => state.items);
  const enqueueMedia = useClaraMediaQueue((state) => state.enqueue);
  const removeMedia = useClaraMediaQueue((state) => state.remove);
  const retryMedia = useClaraMediaQueue((state) => state.retry);
  const announcedMedia = useRef<Set<string>>(new Set());

  const focusComposer = useCallback(() => {
    const textarea = rootRef.current?.querySelector("textarea");
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.disabled = false;
      textarea.focus();
    }
  }, []);
  const hasInteracted = messages.length > 0 || mode !== "IDLE";
  const contextVisible = !["IDLE", "LISTENING", "ANALYZING"].includes(mode);
  const examples = useMemo(() => ["J’ai de l’eau ici.", "J’ai trois soumissions.", "Vérifie Construction ABC."], []);

  // Reprise de LA conversation : rafraîchissement, retour, réouverture,
  // et même compte sur un autre appareil.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    (async () => {
      try {
        const state = await startOrResumeClaraSession({ language: lang, entrypoint: "home_clara_box" });

        const restored = state.messages.map((m) => ({ id: m.id, role: m.role, text: m.text }));
        setMessages(restored);
        workflowRef.current = readWorkflow(state.context);
        const latestUser = [...restored].reverse().find((message) => message.role === "user");
        const restoredMode = typeof state.context.current_intent === "string"
          ? state.context.current_intent.toUpperCase() as ClaraSurfaceMode
          : latestUser ? detectSurfaceMode(latestUser.text) : "IDLE";
        setMode(restoredMode);
      } catch {
        // Conversation locale utilisable malgré tout : aucune erreur technique affichée.
      }
    })();
  }, [lang]);


  // ONE CLARA — la voix n'a pas d'historique séparé : chaque parole apparaît
  // ici en direct, puis l'état serveur fait autorité à la fermeture.
  useEffect(() => {
    const onVoiceMessage = (event: Event) => {
      const detail = (event as CustomEvent).detail as { id: string; role: "user" | "assistant"; text: string };
      if (!detail?.text) return;
      setMessages((previous) =>
        previous.some((m) => m.id === detail.id)
          ? previous
          : [...previous, { id: detail.id, role: detail.role, text: detail.text }],
      );
      if (detail.role === "user") {
        setQuickReplies(null);
        const nextMode = detectSurfaceMode(detail.text);
        if (nextMode !== "IDLE") setMode(nextMode);
      }
    };

    const onVoiceClosed = () => {
      void (async () => {
        try {
          const state = await startOrResumeClaraSession({ language: lang, entrypoint: "home_clara_box" });
          setMessages(state.messages.map((m) => ({ id: m.id, role: m.role, text: m.text })));
        } catch {
          // Les messages déjà visibles restent affichés.
        }
      })();
    };

    window.addEventListener(CLARA_VOICE_MESSAGE_EVENT, onVoiceMessage);
    window.addEventListener(CLARA_VOICE_CLOSED_EVENT, onVoiceClosed);
    return () => {
      window.removeEventListener(CLARA_VOICE_MESSAGE_EVENT, onVoiceMessage);
      window.removeEventListener(CLARA_VOICE_CLOSED_EVENT, onVoiceClosed);
    };
  }, [lang]);


  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      setError(null);
      setQuickReplies(null);
      const userMessageId = uid();
      const history = [...messages, { id: userMessageId, role: "user" as const, text }];
      setMessages(history);
      const nextMode = detectSurfaceMode(text);
      setMode(nextMode === "IDLE" ? "ANALYZING" : nextMode);
      rememberClaraReferences({ current_intent: nextMode, detected_role: nextMode === "CONTRACTOR" ? "CONTRACTOR" : undefined });

      // Routeur unique : l'intention ouvre, suspend ou reprend un parcours réel,
      // sans jamais être montrée à l'utilisateur ni perdre l'étape en cours.
      const detected = detectClaraWorkflowIntent(text).intent;
      logClaraWorkflowEvent("intent_detected", { intent: detected });
      const transition = nextWorkflowState(workflowRef.current, detected);
      if (transition.state !== workflowRef.current) {
        workflowRef.current = transition.state;
        rememberWorkflow(transition.state);
      }
      for (const event of transition.events) {
        logClaraWorkflowEvent(event, {
          intent: transition.state.intent,
          step: transition.state.step ?? null,
        });
      }

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
              .map((m) => ({ role: m.role, content: m.text })),
            context: {
              surface: "home_clara_box",
              mode: nextMode,
              workflow: workflowRef.current,
            },
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
                const shown = cleanAlexText(extractQuickReplies(full).text);
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

        const parsed = extractQuickReplies(full);
        const finalText = cleanAlexText(parsed.text);
        const shownText =
          finalText || "Je continue ici avec vous. Décrivez-moi la situation en quelques mots.";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: shownText } : m)),
        );
        setQuickReplies(parsed.options.length >= 2 ? { messageId: assistantId, options: parsed.options } : null);
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
        setMode((current) => current === "ANALYZING" ? nextMode : current);
        focusComposer();
      }
    },
    [busy, copy.fallback, focusComposer, messages],
  );

  const chooseQuickReply = useCallback(
    (option: string) => {
      if (busy) return;
      setQuickReplies(null);
      if (/^autre$/i.test(option)) {
        focusComposer();
        return;
      }
      void send(option);
    },
    [busy, focusComposer, send],
  );

  const submit = useCallback(async (message: PromptInputMessage) => {
    if (busy) return;
    if (message.files.length > 0) {
      setError(null);
      setBusy(true);
      setMode("ANALYZING");
      try {
        const files: File[] = [];
        for (const attachment of message.files) {
          const response = await fetch(attachment.url);
          const blob = await response.blob();
          const file = new File([blob], attachment.filename || "document", {
            type: attachment.mediaType || blob.type,
          });
          files.push(file);
        }
        const quoteMode = mode === "QUOTE" || files.length > 1 || files.some((file) => /pdf/i.test(file.type));
        if (quoteMode) {
          setMode("QUOTE");
          setQuoteCount(files.length);
          const { runQuoteAnalysis } = await import("@/features/quoteAnalyzer/services/quoteAnalysisClient");
          const analysis = await runQuoteAnalysis(files.slice(0, 3));
          setContextStatus(analysis.payload.recommendation || "Analyse terminée. Clara peut maintenant vous expliquer les écarts importants.");
        } else {
          const file = files[0];
          if (file) {
            setMode(file.type.startsWith("image/") ? "PHOTO" : "DOCUMENT");
            await handleUpload(file, message.text || undefined);
          }
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
      } catch {
        setError(copy.fallback);
        setContextStatus("Je ne peux pas confirmer ce résultat maintenant. Vous pouvez ajouter un autre fichier ou me décrire la situation.");
      } finally {
        setBusy(false);
      }
      return;
    }
    await send(message.text);
  }, [busy, copy.fallback, handleUpload, lang, mode, send]);

  const startVoice = () => {
    useAlexStore.getState().markUserEngaged();
    setMode("LISTENING");
    openAlex("home_hero", "user_tapped_orb");
  };

  const submitCameraFile = async (file: File | undefined) => {
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    await submit({ text: "", files: [{ type: "file", filename: file.name, mediaType: file.type, url: dataUrl }] });
  };

  return (
    <motion.section
      ref={rootRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12 }}
      className={`home-clara-shell mx-auto w-full text-left${contextVisible ? " has-context" : ""}`}
      aria-label="Conversation avec Clara"
    >
      <div className="home-clara-main home-clara-glass overflow-hidden border border-border">
        <div
          className={`home-clara-presence${busy ? " is-active" : ""}`}
          data-state={busy ? "working" : "idle"}
          aria-hidden="true"
        >
          <span /><i /><i />
        </div>
      {messages.length > 0 && (
        <Conversation className="home-clara-conversation max-h-[38vh] min-h-28">
          <ConversationContent className="gap-3 px-5 py-4 sm:px-6">
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent
                  data-role={message.role}
                  data-streaming={busy && message.role === "assistant" && message.id === messages[messages.length - 1]?.id ? "true" : "false"}
                  className="home-clara-message home-clara-message leading-relaxed group-[.is-user]:bg-primary-strong group-[.is-user]:text-primary-foreground"
                >
                  <MessageResponse>{message.text}</MessageResponse>
                </MessageContent>
              </Message>
            ))}
            {quickReplies && !busy && (
              <div className="home-clara-quick" role="group" aria-label="Réponses rapides">
                {quickReplies.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={busy}
                    onClick={() => chooseQuickReply(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            {busy && <p className="home-clara-working" role="status">{copy.working}</p>}
            {error && <p role="alert" className="home-clara-error">{error}</p>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div className="home-clara-composer">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label={copy.camera} onChange={(event) => { void submitCameraFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
        <PromptInput
          accept="image/*,.pdf,.doc,.docx"
          multiple={mode === "QUOTE"}
          maxFiles={mode === "QUOTE" ? 3 : 1}
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
              <PromptInputButton type="button" onClick={() => cameraRef.current?.click()} tooltip={copy.camera} aria-label={copy.camera} className="home-clara-tool rounded-full text-muted-foreground hover:text-foreground">
                <Camera className="h-5 w-5" />
              </PromptInputButton>
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
      {!hasInteracted && (
        <div className="home-clara-examples" aria-label="Exemples">
          {examples.map((example) => <button key={example} type="button" onClick={() => void send(example)}>{example}</button>)}
        </div>
      )}
      </div>
      {contextVisible && (
        <motion.div className="home-context-slot" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
          <Suspense fallback={<div className="home-clara-context"><Shimmer>Préparation…</Shimmer></div>}>
            <ClaraContextPanel mode={mode} quoteCount={quoteCount} statusText={contextStatus} />
          </Suspense>
        </motion.div>
      )}
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
      <Plus className="h-5 w-5" />
    </PromptInputButton>
  );
}
