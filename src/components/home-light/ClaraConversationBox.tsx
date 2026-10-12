/**
 * Clara inline conversation, backed by the existing text, voice and upload flows.
 *
 * ONE CLARA : cette boîte n'a plus d'état conversationnel parallèle. Elle lit et
 * écrit dans la session Clara canonique, ce qui rend la conversation persistante
 * après rafraîchissement, réouverture, authentification et changement d'appareil.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUp, Camera, EllipsisVertical, FileText, History, Home, Image as ImageIcon, Mic, Plus, RotateCcw, SquarePen, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cleanAlexText } from "@/utils/sanitizeAlexText";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAlexVoiceLockedStore } from "@/stores/alexVoiceLockedStore";
import { useAlexStore } from "@/features/alex/state/alexStore";
import { useAlexConversation } from "@/features/alex/hooks/useAlexConversation";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import { trackFunnelStep } from "@/lib/analytics/funnelSteps";
import {
  appendClaraMessage,
  listClaraConversations,
  rememberClaraReferences,
  resumeClaraConversation,
  startNewClaraSession,
  startOrResumeClaraSession,
  type ClaraHistoryEntry,
} from "@/services/clara/claraSession";
import {
  CLARA_CONTRACTOR_TRANSITION_TEXT,
  CLARA_CONTRACTOR_VOICE_FINISHED_EVENT,
  CLARA_VOICE_CLOSED_EVENT,
  CLARA_VOICE_MESSAGE_EVENT,
  CLARA_VOICE_TEXT_INPUT_EVENT,
} from "@/services/clara/claraVoiceBridge";
import {
  applyAnswer,
  isAddressAnswer,
  CLARA_ADDRESS_CLARIFICATION,
  CLARA_CONTRACTOR_ANALYSIS_NOTE,
  CLARA_CONTRACTOR_OPENING,
  getClaraQualification,
  hydrateClaraQualification,
  nextQualificationStep,
  type ClaraQualificationStep,
  saveClaraQualification,
  isContractorConversationTurn,
  mentionsRbq,
  mapRbqAnswer,
  isAmbiguousRbqAnswer,
  CLARA_RBQ_QUICK_REPLIES,
  CLARA_RBQ_QUESTION,
} from "@/services/clara/claraContractorQualification";
import { playTyping, createStreamingTyping } from "@/services/clara/claraTyping";
import { detectClaraWorkflowIntent } from "@/services/alexIntentClassifier";
import {
  destinationCtaLabel,
  openClaraDestination,
  openFailureMessage,
  openSuccessMessage,
  resolveClaraDestination,
  rewriteGuidance,
  stripOpenAnnouncement,
} from "@/services/clara/claraNavigation";
import {
  logClaraWorkflowEvent,
  nextWorkflowState,
  readWorkflow,
  rememberWorkflow,
  type ClaraWorkflowIntent,
  type ClaraWorkflowState,
} from "@/services/clara/claraWorkflow";
import {
  DOSSIER_OPEN_EVENT,
  mentionsDossier,
  rememberInDossier,
} from "@/services/clara/claraDossier";
import { hasActiveContractorFlow, isContractorContext, pauseActiveContractorFlow, readHomeCursor, rememberActiveContractorFlow, rememberHomeCursor } from "@/services/clara/claraContractorResume";
import ClaraContractorFlow, { type ClaraContractorFlowHandle } from "@/components/home-light/ClaraContractorFlow";
import DossierMaisonSheet from "@/components/dossier-maison/DossierMaisonSheet";

const CHOOSE_ADDRESS = "Choisir mon adresse";
const FAKE_DONE = /^(c['’]est fait|c['’]est bon|un instant|ok|d['’]accord|fait)\b/i;

import { useLanguage } from "@/components/ui/LanguageToggle";
import { Conversation, ConversationContent, ConversationScrollButton, ConversationViewportFollow } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useClaraMediaQueue } from "@/services/clara/claraMediaQueue";
import { prepareImageForUpload } from "@/services/clara/claraMedia";

const ClaraContextPanel = lazy(() => import("@/components/home-light/ClaraContextPanel"));
import type { ClaraSurfaceMode } from "@/components/home-light/ClaraContextPanel";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type MsgAttachment = { url: string; kind: "image" | "video" | "document"; name: string };
type MsgAction = { label: string; intent: string };
type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "pending" | "streaming" | "complete" | "failed";
  attachments?: MsgAttachment[];
  action?: MsgAction;
};

function reconcileMessages(current: Msg[], incoming: Msg[]): Msg[] {
  if (current.length === 0) return incoming.map((message) => ({ ...message, status: "complete" }));
  const pending = new Map(incoming.map((message) => [message.id, message]));
  const merged = current.map((message) => {
    const persisted = pending.get(message.id);
    if (!persisted) return message;
    pending.delete(message.id);
    if (message.status === "streaming") return message;
    return { ...message, ...persisted, status: "complete" as const };
  });
  for (const message of incoming) {
    if (pending.has(message.id)) merged.push({ ...message, status: "complete" });
  }
  return merged;
}

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
 * La voix est suggérée par le CONTEXTE, jamais par un minuteur : Clara vient de
 * poser une question ouverte, le client décrit une situation, ou l'échange écrit
 * s'allonge. Jamais pour une donnée courte (courriel, téléphone, adresse, code,
 * montant, oui/non) ni pendant un envoi de fichier.
 */
const SHORT_ANSWER_PATTERN =
  /(courriel|adresse courriel|e-?mail|téléphone|numéro|code|adresse|montant|budget exact|oui ou non|code postal)/i;
const OPEN_QUESTION_PATTERN =
  /(décrivez|expliquez|racontez|qu'est-ce qui|comment|pourquoi|dites-moi|parlez-moi|que se passe)/i;

export function shouldSuggestVoice(input: {
  lastAssistantText: string | null;
  lastUserText: string | null;
  userMessageCount: number;
  uploading: boolean;
  voiceActive: boolean;
}): boolean {
  if (input.uploading || input.voiceActive) return false;
  const assistant = (input.lastAssistantText ?? "").trim();
  if (!assistant) return false;
  if (SHORT_ANSWER_PATTERN.test(assistant)) return false;
  const isQuestion = assistant.includes("?");
  const openQuestion = isQuestion && OPEN_QUESTION_PATTERN.test(assistant);
  const longUserMessage = (input.lastUserText ?? "").trim().length >= 140;
  const longConversation = input.userMessageCount >= 3 && isQuestion;
  return openQuestion || longUserMessage || longConversation;
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
  let options = match[1]
    .split("|")
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (/photo|image/i.test(raw)) {
    const wantsPhoto = options.some((option) => /photo|image|envoyer|ajouter/i.test(option));
    const skipsPhoto = options.some((option) => /sans|continue|pas de photo/i.test(option));
    if (wantsPhoto || skipsPhoto) options = ["📷 Ajouter une photo", "Continuer sans photo"];
  }
  return { text: raw.replace(CHOICE_MARKER, "").trim(), options };
}

type QuickReplies = { messageId: string; options: string[] };

type IntentSuggestion = {
  label: string;
  intent: ClaraWorkflowIntent;
  source: "default" | "trending";
};

const DEFAULT_INTENT_SUGGESTIONS: IntentSuggestion[] = [
  { label: "Je suis entrepreneur", intent: "contractor_onboarding", source: "default" },
  { label: "Analyser 3 soumissions", intent: "quote_comparison", source: "default" },
  { label: "Vérifier un entrepreneur", intent: "contractor_verification", source: "default" },
];

/** Public détecté par Clara : il détermine seul les choix proposés. */
type ClaraAudience = "homeowner" | "contractor";

/**
 * Clara ne dit jamais qu'elle ouvre l'inscription sans que l'écran s'ouvre :
 * cette formule déclenche l'ouverture réelle du parcours entrepreneur.
 */
const ANNOUNCES_CONTRACTOR_FORM =
  /(formulaire d['’]inscription|ouvre (?:votre |le )?(?:formulaire|dossier|inscription)|votre inscription)/i;

/** Un choix cliquable d'ouverture : il agit, il n'est jamais renvoyé comme texte. */
const OPEN_CHOICE = /^ouvrir\b|inscription|activer mon profil/i;
type ContractorChoice = "score" | "contracts" | "profile";
const CONTRACTOR_SUGGESTIONS: { label: string; choice: ContractorChoice }[] = [
  { label: "Vérifier mon score IA", choice: "score" },
  { label: "Obtenir plus de contrats", choice: "contracts" },
  { label: "Compléter mon profil", choice: "profile" },
];
const CLARA_CONTRACTOR_SCORE_TEXT =
  "Je regarde votre présence en ligne, ce que les IA comprennent de votre entreprise et ce qui pourrait vous empêcher d’être recommandé.";
/** Lecture après la fin complète du texte, puis exactement 3 pulsations. */
const TRANSITION_READ_MS = 900;
const TRANSITION_PULSE_MS = 550;
const TRANSITION_PULSES = 3;

interface ClaraConversationBoxProps {
  onConversationActiveChange?: (active: boolean) => void;
}

export default function ClaraConversationBox({ onConversationActiveChange }: ClaraConversationBoxProps) {
  const { openAlex, closeAlex } = useAlexVoice();
  const { handleUpload } = useAlexConversation();
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const copy = lang === "fr"
    ? {
        placeholder: "Que voulez-vous faire ?",
        placeholderActive: "Répondez à Clara…",
        listening: "Clara vous écoute…",
        attach: "Ajouter une photo ou un document",
        camera: "Prendre une photo",
        voice: "Parler à Clara",
        send: "Envoyer",
        working: "Analyse en cours…",
        fallback: "Je continue ici avec vous. Reformulez en une phrase.",
        reset: "Nouvelle conversation",
        resetConfirm: "Commencer une nouvelle conversation ?",
        resetYes: "Commencer",
        resetNo: "Annuler",

      }
    : {
        placeholder: "Que voulez-vous faire ?",
        placeholderActive: "Répondez à Clara…",
        listening: "Clara is listening…",
        attach: "Ajouter une photo ou un document",
        camera: "Prendre une photo",
        voice: "Talk to Clara",
        send: "Send",
        working: "Analyse en cours…",
        fallback: "Pour le moment je fonctionne en français. Je termine mes cours d'anglais sous peu.",
        reset: "New conversation",
        resetConfirm: "Start a new conversation?",
        resetYes: "Start",
        resetNo: "Cancel",
      };

  const [messages, setMessages] = useState<Msg[]>([]);
  /** Fil courant lisible sans fermeture périmée (anti-doublon des tours de Clara). */
  const messagesRef = useRef<Msg[]>([]);
  messagesRef.current = messages;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ClaraSurfaceMode>(() => hasActiveContractorFlow() ? "CONTRACTOR" : "IDLE");
  const [quoteCount, setQuoteCount] = useState(0);
  const [contextStatus, setContextStatus] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReplies | null>(null);
  const [transitionPause, setTransitionPause] = useState(false);
  /** Clara écrit : l’écriture elle-même tient lieu d’indicateur. */
  const [claraTyping, setClaraTyping] = useState(false);
  /** Courte respiration avant la réponse : « Clara écrit… » dans le fil. */
  const [claraBreathing, setClaraBreathing] = useState(false);

  const [audience, setAudienceState] = useState<ClaraAudience>(() => hasActiveContractorFlow() ? "contractor" : "homeowner");
  /** Rôle courant lisible immédiatement (les rappels asynchrones ne doivent jamais se tromper de parcours). */
  const audienceRef = useRef<ClaraAudience>(audience);
  const setAudience = useCallback((next: ClaraAudience) => {
    audienceRef.current = next;
    setAudienceState(next);
  }, []);
  const [composerText, setComposerText] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [confirmReset, setConfirmReset] = useState(false);
  // Le micro est un MODE de la même conversation : aucun état de session ici.
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceGlow, setVoiceGlow] = useState(false);
  const [voiceTip, setVoiceTip] = useState<string | null>(null);
  const voiceTipShown = useRef(false);
  const voiceCooldownUntil = useRef(0);
  // Dossier maison : s'ouvre PAR-DESSUS la conversation, jamais en navigation.
  const [dossierOpen, setDossierOpen] = useState(false);
  const [dossierEditAddress, setDossierEditAddress] = useState(false);
  // Vrai seulement après une adresse réellement enregistrée par le serveur.
  const dossierAddressSavedRef = useRef(false);
  const dossierPendingRef = useRef(false);
  /** Le dossier ne s'ouvre de lui-même qu'une fois : ensuite, le bouton suffit. */
  const dossierAutoOpened = useRef(false);
  // Conversations passées : liste réelle, jamais reconstruite localement.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<ClaraHistoryEntry[]>([]);


  const hydrated = useRef(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoCameraRef = useRef<HTMLInputElement>(null);
  const photoLibraryRef = useRef<HTMLInputElement>(null);
  const videoLibraryRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const activeTypingIdRef = useRef<string | null>(null);
  // Parcours en cours : lu depuis la session canonique, jamais recréé localement.
  const workflowRef = useRef<ClaraWorkflowState | null>(null);
  // Dernière intention avec écran réel : sert au bouton visible d'ouverture.
  const lastIntentRef = useRef<ClaraWorkflowIntent | null>(null);

  // File d'attente média unique : progression réelle, reprise, rien de perdu.
  const mediaItems = useClaraMediaQueue((state) => state.items);
  const enqueueMedia = useClaraMediaQueue((state) => state.enqueue);
  const removeMedia = useClaraMediaQueue((state) => state.remove);
  const retryMedia = useClaraMediaQueue((state) => state.retry);
  const clearMedia = useClaraMediaQueue((state) => state.clear);
  const announcedMedia = useRef<Set<string>>(new Set());
  const localPreviewUrls = useRef<Set<string>>(new Set());
  const activationTracked = useRef(false);
  const contractorTransitionRef = useRef(false);
  /** Question de qualification en attente de réponse (une seule à la fois). */
  const qualificationStepRef = useRef<ClaraQualificationStep | null>(null);
  /** Parcours entrepreneur mené entièrement dans le chat. */
  const [contractorFlow, setContractorFlow] = useState(false);
  const contractorFlowRef = useRef<ClaraContractorFlowHandle | null>(null);
  const mountedRef = useRef(true);
  const askNextRef = useRef<(() => Promise<boolean>) | null>(null);
  const transitionRef = useRef<((note: string) => Promise<void>) | null>(null);

  useEffect(() => {
    // Remonté explicitement : en double montage (StrictMode), le nettoyage du
    // premier passage laissait la carte définitivement « démontée ».
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Clara ouvre elle-même le Dossier maison, dans la même conversation.
  useEffect(() => {
    const onOpen = () => setDossierOpen(true);
    window.addEventListener(DOSSIER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(DOSSIER_OPEN_EVENT, onOpen);
  }, []);

  const createLocalPreview = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    localPreviewUrls.current.add(url);
    return url;
  }, []);

  const clearLocalPreviews = useCallback(() => {
    localPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    localPreviewUrls.current.clear();
  }, []);

  useEffect(() => clearLocalPreviews, [clearLocalPreviews]);

  /**
   * Clavier stable (Android Gboard) : Clara ne rouvre JAMAIS le clavier d'elle-même.
   * Le focus n'est rendu que si l'utilisateur était en train d'écrire
   * (composer engagé), sinon un tap sur un choix ouvrirait le clavier.
   */
  const composerEngagedRef = useRef(false);
  const focusComposer = useCallback(() => {
    const textarea = textareaRef.current ?? rootRef.current?.querySelector("textarea");
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.disabled = false;
    if (!composerEngagedRef.current || document.activeElement === textarea) return;
    textarea.focus({ preventScroll: true });
  }, []);

  /**
   * Le fil de discussion a UN seul conteneur de défilement. On ne ramène
   * jamais l'utilisateur en bas de force : on ne suit la conversation que
   * s'il s'y trouvait déjà (seuil natif d'environ 140 px).
   */
  const NEAR_BOTTOM_PX = 140;
  const getScroller = useCallback(
    () => rootRef.current?.querySelector<HTMLElement>(".home-clara-conversation > div") ?? null,
    [],
  );
  const isNearBottom = useCallback(() => {
    const scroller = getScroller();
    if (!scroller) return true;
    return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= NEAR_BOTTOM_PX;
  }, [getScroller]);
  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      window.requestAnimationFrame(() => {
        const scroller = getScroller();
        if (!scroller) return;
        scroller.scrollTo({ top: scroller.scrollHeight - scroller.clientHeight, behavior });
      });
    },
    [getScroller],
  );
  /**
   * Clavier mobile : le champ de saisie doit rester au-dessus du clavier.
   * On ne déplace la page que si la zone de saisie déborde réellement de la
   * fenêtre visible — jamais de recentrage automatique intempestif.
   */
  const keepComposerVisible = useCallback(() => {
    // StickToBottom owns follow/manual scrolling; viewport CSS owns composer.
    // Never scroll the document from a message, focus or composer resize.
  }, []);

  // Une fois engagée, la conversation reste active : un blur (clavier fermé)
  // ne refait jamais apparaître l'accueil, donc aucune hauteur qui saute.
  const [composerEverFocused, setComposerEverFocused] = useState(false);
  const isConversationActive = messages.length > 0 || mode !== "IDLE" || composerFocused || composerEverFocused;

  useEffect(() => {
    document.documentElement.dataset.claraConversationActive = String(isConversationActive);
    window.dispatchEvent(new CustomEvent("clara:conversation-active", { detail: { active: isConversationActive } }));
    onConversationActiveChange?.(isConversationActive);
    if (isConversationActive && !activationTracked.current) {
      activationTracked.current = true;
      trackCopilotEvent("clara_conversation_activated", { surface: "home_clara_box" });
      trackCopilotEvent("clara_hero_collapsed", { surface: "home_clara_box" });
    }
    // Toujours retirer le verrou : au changement d'état l'effet le repose,
    // au démontage (navigation Clara) la page de destination défile nativement.
    return () => {
      delete document.documentElement.dataset.claraConversationActive;
    };
  }, [isConversationActive, onConversationActiveChange]);

  /**
   * Nouvelle conversation : une VRAIE session canonique est créée côté serveur
   * (nouvel identifiant), l'état local est vidé et l'accueil revient.
   * Le compte, le profil, la maison et les préférences ne sont jamais touchés.
   */
  const startFreshConversation = useCallback(async () => {
    setConfirmReset(false);
    // La voix est un canal de la même conversation : on la coupe proprement avant.
    try {
      closeAlex();
    } catch {
      /* aucune session vocale active */
    }
    clearMedia();
    clearLocalPreviews();
    announcedMedia.current = new Set();
    workflowRef.current = null;
    rememberHomeCursor(null);
    setMessages([]);
    setComposerEverFocused(false);
    setQuickReplies(null);
    setError(null);
    setQuoteCount(0);
    setContextStatus(null);
    setMode("IDLE");
    setAudience("homeowner");
    qualificationStepRef.current = null;
    setContractorFlow(false);
    rememberActiveContractorFlow(false);
    activationTracked.current = false;
    trackCopilotEvent("clara_new_conversation", { surface: "home_clara_box" });
    try {
      await startNewClaraSession({ language: lang, entrypoint: "home_clara_box" });
    } catch {
      // La conversation reste utilisable : la session sera recréée à la première écriture.
    }
    focusComposer();
  }, [clearLocalPreviews, clearMedia, closeAlex, focusComposer, lang]);

  /** Conversations passées : la liste vient du serveur, jamais d'une copie locale. */
  const openHistory = useCallback(async () => {
    setHistoryOpen(true);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      setHistoryItems(await listClaraConversations());
    } catch {
      setHistoryError("Impossible d’afficher vos conversations pour le moment.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  /** Reprise d'une conversation existante : même fil, aucun message inventé. */
  const resumeConversation = useCallback(
    async (entry: ClaraHistoryEntry) => {
      setHistoryOpen(false);
      if (entry.current) return;
      setHistoryError(null);
      try {
        closeAlex();
      } catch {
        /* aucune session vocale active */
      }
      try {
        const state = await resumeClaraConversation(entry.session_token);
        setMessages((current) => reconcileMessages(current, state.messages.map((m) => ({ id: m.id, role: m.role, text: m.text }))));
        setQuickReplies(null);
        setError(null);
        setMode("IDLE");
        trackCopilotEvent("clara_conversation_resumed", { surface: "home_clara_box" });
        scrollToLatest("auto");
        focusComposer();
      } catch {
        setError("Impossible de rouvrir cette conversation. Réessayez dans un instant.");
      }
    },
    [closeAlex, focusComposer, scrollToLatest],
  );


  const handleResetClick = useCallback(() => {
    // Conversation vide : aucune confirmation inutile.
    if (messages.length === 0 && mediaItems.length === 0) {
      void startFreshConversation();
      return;
    }
    setConfirmReset((previous) => !previous);
  }, [mediaItems.length, messages.length, startFreshConversation]);

  // La salutation d'accueil n'est permise qu'AVANT toute interaction : texte,
  // voix ou média. Une fois la conversation démarrée, elle ne revient jamais,
  // même après un remontage du composant.
  const conversationStarted = isConversationActive;
  // Entrepreneur : Clara pose les questions dans le chat, aucun formulaire dessous.
  const contextVisible = !["IDLE", "LISTENING", "ANALYZING", "CONTRACTOR"].includes(mode);
  const intentSuggestions = DEFAULT_INTENT_SUGGESTIONS;

  // Reprise de LA conversation : rafraîchissement, retour, réouverture,
  // et même compte sur un autre appareil.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    (async () => {
      try {
        const state = await startOrResumeClaraSession({ language: lang, entrypoint: "home_clara_box" });

        const restored = state.messages.map((m) => ({ id: m.id, role: m.role, text: m.text }));
        setMessages((current) => reconcileMessages(current, restored));
        workflowRef.current = readWorkflow(state.context);
        const latestUser = [...restored].reverse().find((message) => message.role === "user");
        const restoredMode = typeof state.context.current_intent === "string"
          ? state.context.current_intent.toUpperCase() as ClaraSurfaceMode
          : latestUser ? detectSurfaceMode(latestUser.text) : "IDLE";
        // Context and qualification must be restored with the messages.
        // A local marker only applies to this exact canonical conversation.
        hydrateClaraQualification(state.context.workflow as Record<string, unknown> | undefined);
        const contractor = isContractorContext(state.context)
          || (!state.context.current_intent && hasActiveContractorFlow());
        setAudience(contractor ? "contractor" : "homeowner");
        setContractorFlow(contractor);
        rememberActiveContractorFlow(contractor);
        setMode(contractor ? "CONTRACTOR" : restoredMode);
        // Rafraîchissement : les choix de la dernière question maison reviennent.
        const cursor = contractor ? null : readHomeCursor();
        const lastRestored = restored[restored.length - 1];
        if (cursor && cursor.options.length >= 2 && lastRestored?.role === "assistant" && lastRestored.text.trim() === cursor.text.trim()) {
          setQuickReplies({ messageId: lastRestored.id, options: cursor.options });
        }
      } catch {
        // Preserve this session’s in-chat progress when the server is unavailable.
        if (hasActiveContractorFlow()) setContractorFlow(true);
      }
    })();
  }, [lang, setAudience]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const publishHeight = () => {
      rootRef.current?.style.setProperty("--clara-composer-height", `${composer.getBoundingClientRect().height}px`);
      keepComposerVisible();
    };
    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(composer);
    return () => observer.disconnect();
  }, [keepComposerVisible]);

  useEffect(() => {
    const updateOnline = () => {
      const next = navigator.onLine;
      setOnline(next);
      if (next) setError((current) => current === "Connexion interrompue. Votre message reste ici." ? null : current);
    };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => keepComposerVisible(), [messages, busy, composerText, keepComposerVisible]);

  useEffect(() => {
    if (!quickReplies || busy) return;
    // Les choix apparaissent après la réponse : si le lecteur suivait déjà le
    // bas, leur dernière ligne doit rester atteignable au-dessus du composeur.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => scrollToLatest("auto"));
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [busy, quickReplies, scrollToLatest]);

  useEffect(() => {
    trackCopilotEvent("clara_chat_opened", { surface: "home_clara_box" });
  }, []);


  // ONE CLARA — la voix n'a pas d'historique séparé : chaque parole apparaît
  // ici en direct, puis l'état serveur fait autorité à la fermeture.
  useEffect(() => {
    const onVoiceMessage = (event: Event) => {
      const detail = (event as CustomEvent).detail as { id: string; role: "user" | "assistant"; text: string };
      if (!detail?.text) return;
      // Anti-duplication : même identifiant, ou même énoncé final déjà affiché
      // (les transcriptions partielles ne doivent jamais créer un doublon).
      const normalized = detail.text.trim().toLowerCase();
      setMessages((previous) => {
        if (previous.some((m) => m.id === detail.id)) {
          return previous.map((message) => message.id === detail.id
            ? { ...message, text: detail.text, status: "complete" }
            : message);
        }
        const last = [...previous].reverse().find((m) => m.role === detail.role);
        if (last && last.text.trim().toLowerCase() === normalized) return previous;
        return [...previous, { id: detail.id, role: detail.role, text: detail.text, status: "complete" }];
      });
      if (detail.role === "user") {
        setQuickReplies(null);
        // Réponse vocale à la question en cours : même enregistrement que le texte.
        if (qualificationStepRef.current) {
          if (qualificationStepRef.current.field === "service_areas" && isAddressAnswer(detail.text)) return;
          applyAnswer(qualificationStepRef.current, detail.text);
          qualificationStepRef.current = null;
          // Même machine d’états que le texte : question suivante ou transition.
          void askNextRef.current?.().then((asked) => {
            if (!asked) void transitionRef.current?.(detail.text);
          });
        }
        const nextMode = detectSurfaceMode(detail.text);
        if (nextMode !== "IDLE") setMode(nextMode);
      }
    };

    const onVoiceClosed = () => {
      // Retour au clavier : même conversation, simple changement de canal.
      setVoiceActive(false);
      trackCopilotEvent("clara_input_mode_changed", { surface: "home_clara_box", mode: "text" });
      void (async () => {
        try {
          const state = await startOrResumeClaraSession({ language: lang, entrypoint: "home_clara_box" });
          setMessages((current) => reconcileMessages(current, state.messages.map((m) => ({ id: m.id, role: m.role, text: m.text }))));
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

  // Résultat média : seulement ce que l'analyse a réellement produit.
  useEffect(() => {
    for (const item of mediaItems) {
      if (item.status !== "done" || !item.summary) continue;
      if (announcedMedia.current.has(item.id)) continue;
      announcedMedia.current.add(item.id);

      const messageId = uid();
      setMessages((previous) => [...previous, { id: messageId, role: "assistant", text: item.summary as string }]);
      setContextStatus(item.summary);
      void appendClaraMessage({
        role: "assistant",
        text: item.summary,
        clientMessageId: messageId,
      }).catch(() => {});
    }
  }, [mediaItems]);

  /**
   * Ouverture unique : Clara et le bouton visible passent exactement ici.
   * Aucune confirmation n'est écrite avant que la route ait réellement changé.
   */
  const runOpen = useCallback(
    async (intent: ClaraWorkflowIntent, note?: string) => {
      const destination = resolveClaraDestination(intent);
      if (!destination) return false;

      trackCopilotEvent("clara_navigation_attempted", { surface: "home_clara_box", kind: destination.path });
      logClaraWorkflowEvent("workflow_started", { intent, step: destination.path });
      const { ok } = await openClaraDestination(navigate, destination, { intent, note });

      const messageId = uid();
      const text = ok ? openSuccessMessage(destination) : openFailureMessage(destination);
      setMessages((previous) => [
        ...previous,
        { id: messageId, role: "assistant", text, action: ok ? undefined : { label: destinationCtaLabel(destination), intent } },
      ]);
      void appendClaraMessage({ role: "assistant", text, clientMessageId: messageId }).catch(() => {});
      trackCopilotEvent(ok ? "clara_navigation_succeeded" : "clara_navigation_failed", {
        surface: "home_clara_box",
        kind: destination.path,
      });
      return ok;
    },
    [navigate],
  );

  const openContractorAfterTransition = useCallback(async (note?: string) => {
    const destination = resolveClaraDestination("contractor_onboarding");
    if (!destination) return false;
    const { ok } = await openClaraDestination(navigate, destination, {
      intent: "contractor_onboarding",
      note,
    });
    if (!ok && mountedRef.current) {
      const messageId = uid();
      const text = openFailureMessage(destination);
      setMessages((previous) => [...previous, {
        id: messageId,
        role: "assistant",
        text,
        action: { label: destinationCtaLabel(destination), intent: "contractor_onboarding" },
      }]);
      void appendClaraMessage({ role: "assistant", text, clientMessageId: messageId }).catch(() => {});
    }
    return ok;
  }, [navigate]);

  const finishContractorTransition = useCallback(async (note?: string) => {
    if (!mountedRef.current) return;
    // Point d'abandon mesurable no 1 : intention entrepreneur exprimée à l'accueil.
    void trackFunnelStep("home_contractor_click", { metadata: { surface: "home_clara_box" } });
    // Le texte est déjà entièrement affiché : pause de lecture, puis 3 pulsations.
    await new Promise<void>((resolve) => window.setTimeout(resolve, TRANSITION_READ_MS));
    if (!mountedRef.current) return;
    setTransitionPause(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, TRANSITION_PULSE_MS * TRANSITION_PULSES + 80));
    if (!mountedRef.current) return;
    const ok = await openContractorAfterTransition(note);
    // Jamais de cul-de-sac : si l'ouverture échoue, la conversation redevient utilisable.
    if (mountedRef.current) {
      setTransitionPause(false);
      setBusy(false);
      contractorTransitionRef.current = false;
      if (!ok) setMode("IDLE");
    }
  }, [openContractorAfterTransition]);

  /** Écrit une phrase de Clara dans la conversation visible ET canonique. */
  const sayClara = useCallback(async (text: string, quick?: string[]) => {
    if (!mountedRef.current) return;
    // Anti-doublon : si Clara vient déjà de poser exactement cette question,
    // on réaffiche seulement ses choix, sans second tour identique.
    const lastAssistant = [...messagesRef.current].reverse().find((m) => m.role === "assistant");
    const lastMessage = messagesRef.current[messagesRef.current.length - 1];
    if (lastMessage && lastMessage === lastAssistant && lastAssistant.text.trim() === text.trim()) {
      setQuickReplies(quick && quick.length >= 2 ? { messageId: lastAssistant.id, options: quick } : null);
      return;
    }
    const messageId = uid();
    setQuickReplies(null);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // Courte respiration avant la réponse : « Clara écrit… » reste dans le fil.
    if (!reducedMotion) {
      setClaraBreathing(true);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 400 + Math.round(Math.random() * 300)));
      if (!mountedRef.current) return;
      setClaraBreathing(false);
    }
    activeTypingIdRef.current = messageId;
    setMessages((previous) => [...previous, { id: messageId, role: "assistant", text: "", status: "streaming" }]);
    // Affichage progressif seulement : le texte enregistré reste exact.
    setClaraTyping(true);
    await playTyping(text, (value) => {
      setMessages((previous) => previous.map((m) => (m.id === messageId ? { ...m, text: value, status: "streaming" } : m)));
    }, { reducedMotion, isAlive: () => mountedRef.current && activeTypingIdRef.current === messageId });

    if (!mountedRef.current) return;
    if (activeTypingIdRef.current !== messageId) {
      setMessages((previous) => previous.map((m) => (m.id === messageId ? { ...m, status: "complete" } : m)));
      setClaraTyping(false);
      return;
    }
    setQuickReplies(quick && quick.length >= 2 ? { messageId, options: quick } : null);
    // L’enregistrement se fait en arrière-plan : aucun « Analyse en cours… » après une question.
    setClaraTyping(false);
    activeTypingIdRef.current = null;
    setMessages((previous) => previous.map((m) => (m.id === messageId ? { ...m, text, status: "complete" } : m)));
    void appendClaraMessage({ role: "assistant", text, clientMessageId: messageId }).catch(() => undefined);
  }, []);

  const addFlowUserMessage = useCallback((text: string) => {
    const id = uid();
    setQuickReplies(null);
    setMessages((previous) => [...previous, { id, role: "user", text }]);
    void appendClaraMessage({ role: "user", text, clientMessageId: id }).catch(() => undefined);
    scrollToLatest("smooth");
  }, [scrollToLatest]);

  /**
   * Qualification entrepreneur : Clara pose une seule question utile par tour,
   * jamais une déjà répondue. L'audit ne s'ouvre qu'ensuite.
   * Retourne `true` quand une question a été posée (donc pas de navigation).
   */
  const askNextQualification = useCallback(
    async (options: { opening?: boolean } = {}) => {
      // Le parcours entrepreneur avance maintenant dans le chat :
      // aucune redirection automatique vers l'audit.
      if (options.opening) await sayClara(CLARA_CONTRACTOR_OPENING);
      rememberActiveContractorFlow(true);
      setContractorFlow(true);
      qualificationStepRef.current = null;
      trackCopilotEvent("contractor_context_captured", { surface: "home_clara_box", kind: "in_chat_flow" });
      return true;
      // Entreprise déjà identifiée (audit précédent) : jamais redemandée.
      const known = getClaraQualification();
      if (!known.business_name) {
        try {
          const raw = window.sessionStorage.getItem("unpro_audit_ia_result");
          const name = raw ? (JSON.parse(raw) as { business_name?: string | null }).business_name : null;
          if (name) saveClaraQualification({ business_name: name });
        } catch {
          /* rien de connu */
        }
      }
      const step = nextQualificationStep(getClaraQualification());
      qualificationStepRef.current = step;
      if (!step) return false;
      if (options.opening) await sayClara(CLARA_CONTRACTOR_OPENING);
      await sayClara(step.question, step.quickReplies);
      trackCopilotEvent("contractor_context_captured", {
        surface: "home_clara_box",
        kind: step.field,
      });
      return true;
    },
    [sayClara],
  );


  const beginTextContractorTransition = useCallback(async (note: string, transitionText: string = CLARA_CONTRACTOR_TRANSITION_TEXT) => {
    // Seule la garde d'unicité s'applique : un état « occupé » résiduel ne doit
    // jamais bloquer la transition entrepreneur.
    if (contractorTransitionRef.current) return;
    contractorTransitionRef.current = true;
    setBusy(true);
    setError(null);
    setQuickReplies(null);

    const assistantId = uid();
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setMessages((previous) => [...previous, { id: assistantId, role: "assistant", text: reduceMotion ? transitionText : "" }]);

    if (!reduceMotion) {
      setClaraTyping(true);
      await playTyping(transitionText, (value) => {
        setMessages((previous) => previous.map((message) =>
          message.id === assistantId ? { ...message, text: value } : message,
        ));
      }, { isAlive: () => mountedRef.current });
      setClaraTyping(false);
      if (!mountedRef.current) return;
    }

    await appendClaraMessage({
      role: "assistant",
      text: transitionText,
      clientMessageId: assistantId,
    }).catch(() => undefined);
    await finishContractorTransition(note);
  }, [finishContractorTransition]);

  askNextRef.current = () => askNextQualification();
  transitionRef.current = (note: string) => beginTextContractorTransition(note, CLARA_CONTRACTOR_ANALYSIS_NOTE);

  useEffect(() => {
    const onVoiceFinished = (event: Event) => {
      const detail = (event as CustomEvent<{ note?: string }>).detail;
      if (contractorTransitionRef.current) return;
      contractorTransitionRef.current = true;
      setBusy(true);
      void finishContractorTransition(detail?.note);
    };
    window.addEventListener(CLARA_CONTRACTOR_VOICE_FINISHED_EVENT, onVoiceFinished);
    return () => window.removeEventListener(CLARA_CONTRACTOR_VOICE_FINISHED_EVENT, onVoiceFinished);
  }, [finishContractorTransition]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      // Parcours entrepreneur dans le chat : la réponse libre lui revient.
      if (contractorFlow && contractorFlowRef.current?.handleText(text)) {
        setError(null);
        focusComposer();
        return;
      }

      setError(null);
      setQuickReplies(null);
      const userMessageId = uid();
      const history = [...messages, { id: userMessageId, role: "user" as const, text }];
      setMessages(history);
      // Envoi utilisateur : on descend toujours au dernier message, en douceur.
      scrollToLatest("smooth");

      // Qualification entrepreneur en cours : la réponse est enregistrée tout
      // de suite, puis Clara pose la question suivante — ou ouvre l'audit.
      const pendingStep = qualificationStepRef.current;
      if (pendingStep) {
        setBusy(true);
        void appendClaraMessage({ role: "user", text, clientMessageId: userMessageId }).catch(() => {});
        if (pendingStep.field === "service_areas" && isAddressAnswer(text)) {
          try { await sayClara(CLARA_ADDRESS_CLARIFICATION); }
          finally { setBusy(false); }
          return;
        }
        applyAnswer(pendingStep, text);
        qualificationStepRef.current = null;
        try {
          const asked = await askNextQualification();
          if (!asked) {
            await beginTextContractorTransition(text, CLARA_CONTRACTOR_ANALYSIS_NOTE);
            return;
          }
        } finally {
          if (mountedRef.current && qualificationStepRef.current) setBusy(false);
          focusComposer();
        }
        return;
      }

      // Rôle de la conversation : « propriétaire » s'interprète selon la question
      // ACTIVE de Clara. Une réponse à une question sur l'entreprise reste
      // dans le parcours entrepreneur — jamais de Dossier maison.
      const lastAssistantText = [...messages].reverse().find((m) => m.role === "assistant")?.text ?? "";
      const contractorTurn = audienceRef.current === "contractor"
        || isContractorConversationTurn(text, lastAssistantText);

      // Situation RBQ : mêmes 6 statuts que « Mon profil », jamais une 2e validation.
      if (contractorTurn && (mentionsRbq(lastAssistantText) || mentionsRbq(text))) {
        const declaration = mapRbqAnswer(text);
        if (declaration || isAmbiguousRbqAnswer(text)) {
          setAudience("contractor");
          setBusy(true);
          void appendClaraMessage({ role: "user", text, clientMessageId: userMessageId }).catch(() => {});
          try {
            if (declaration) {
              saveClaraQualification({ rbq_declaration: declaration });
              trackCopilotEvent("contractor_context_captured", { surface: "home_clara_box", kind: `rbq_${declaration}` });
              await sayClara("Merci, c'est noté comme déclaré. UNPRO le vérifiera; on continue votre inscription.");
              await askNextQualification();
            } else {
              await sayClara(CLARA_RBQ_QUESTION, CLARA_RBQ_QUICK_REPLIES);
            }
          } finally {
            if (mountedRef.current) setBusy(false);
          }
          return;
        }
      }

      const nextMode = contractorTurn ? "CONTRACTOR" : detectSurfaceMode(text);
      setMode(nextMode === "IDLE" ? "ANALYZING" : nextMode);
      rememberClaraReferences({ current_intent: nextMode, detected_role: nextMode === "CONTRACTOR" ? "CONTRACTOR" : undefined });

      // Dossier maison : ce que le propriétaire vient de déclarer est conservé
      // tel quel, avec sa provenance. Aucune interprétation n'est enregistrée.
      // Le dossier maison appartient au parcours propriétaire uniquement.
      if (nextMode === "PROJECT" && audienceRef.current === "homeowner") {
        rememberInDossier({
          category: "project",
          label: text.slice(0, 160),
          detail: "Décrit par le propriétaire pendant la conversation.",
          provenance: "declared",
        });
      }


      // Routeur unique : l'intention ouvre, suspend ou reprend un parcours réel,
      // sans jamais être montrée à l'utilisateur ni perdre l'étape en cours.
      const classified = detectClaraWorkflowIntent(text);
      const detected = classified.intent;
      const destination = resolveClaraDestination(detected, classified.confidence);
      if (destination) lastIntentRef.current = detected;
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

      // Entrepreneur : Clara qualifie directement dans le chat, sans longue réponse.
      if ((destination && detected === "contractor_onboarding") || (contractorTurn && !contractorFlow)) {
        void appendClaraMessage({ role: "user", text, clientMessageId: userMessageId }).catch(() => {});
        setAudience("contractor");
        trackCopilotEvent("contractor_intent_detected", { surface: "home_clara_box" });
        try {
          const asked = await askNextQualification();
          if (!asked) {
            await beginTextContractorTransition(text, CLARA_CONTRACTOR_ANALYSIS_NOTE);
            return;
          }
        } finally {
          if (mountedRef.current && !contractorTransitionRef.current) setBusy(false);
          focusComposer();
        }
        return;
      }
      void appendClaraMessage({ role: "user", text, clientMessageId: userMessageId }).catch(() => {});

      const assistantId = uid();
      const reveal = createStreamingTyping((shown) => {
        setMessages((prev) => prev.map((m) => m.id === assistantId
          ? { ...m, text: shown, status: "streaming" } : m));
      }, {
        reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
        isAlive: () => mountedRef.current,
      });
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
              userRole: audienceRef.current,
              contractorQualification: audienceRef.current === "contractor" ? getClaraQualification() : undefined,
              addressScope: "homeownerPropertyAddress is separate from contractorBusinessAddress and contractorServiceArea; pending addresses are unverified",
              workflow: workflowRef.current,
            },
          }),
        });

        if (!res.ok || !res.body) throw new Error(`alex-chat ${res.status}`);

        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", text: "", status: "streaming" },
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
                reveal.update(shown);
              }
            } catch {
              /* partial frame — ignore */
            }
          }
        }

        const parsed = extractQuickReplies(full);
        const finalText = cleanAlexText(parsed.text);
        // Clara ne renvoie jamais l'utilisateur chercher : elle prend en charge.
        const guidedText = stripOpenAnnouncement(rewriteGuidance(finalText, destination));
        const shownText =
          guidedText || "Je continue ici avec vous. Décrivez-moi la situation en quelques mots.";
        // Curseur maison : dernière question propriétaire, restaurée au retour.
        if (audienceRef.current === "homeowner") {
          rememberHomeCursor({ text: shownText, options: parsed.options.length >= 2 ? parsed.options : [] });
        }
        void appendClaraMessage({
          role: "assistant",
          text: shownText,
          clientMessageId: assistantId,
        }).catch(() => {});

        // « Je l'ajoute à votre dossier maison » : le dossier s'ouvre vraiment,
        // par-dessus la conversation — jamais dans un parcours entrepreneur.
        if (
          audienceRef.current === "homeowner"
          && !contractorTurn
          && mentionsDossier(shownText)
          && !dossierAutoOpened.current
        ) {
          dossierAutoOpened.current = true;
          setDossierOpen(true);
        }
        // Clara a promis d'agir sur le dossier : les confirmations génériques
        // (« C'est fait », « Un instant ») sont remplacées par l'action réelle.
        if (audienceRef.current === "homeowner" && !contractorTurn && mentionsDossier(shownText) && !dossierAddressSavedRef.current) {
          dossierPendingRef.current = true;
          setQuickReplies({ messageId: assistantId, options: [CHOOSE_ADDRESS, "Continuer sans adresse"] });
        }


        // Navigation assistée : Clara ouvre elle-même l'écran réel, dans le même
        // onglet, et ne confirme qu'après le changement de route réussi.
        if (destination && detected === "contractor_onboarding") {
          setQuickReplies(null);
          setAudience("contractor");
          trackCopilotEvent("contractor_intent_detected", { surface: "home_clara_box" });
          // Clara qualifie d'abord : l'audit n'est ouvert qu'une fois l'essentiel connu.
          const asked = await askNextQualification();
          if (!asked) await beginTextContractorTransition(text, CLARA_CONTRACTOR_ANALYSIS_NOTE);
        } else if (audienceRef.current === "contractor" && ANNOUNCES_CONTRACTOR_FORM.test(shownText)) {
          // Clara vient d'annoncer l'inscription : l'écran s'ouvre réellement.
          setQuickReplies(null);
          await runOpen("contractor_onboarding", text);
        } else if (destination) {
          setQuickReplies(null);
          await runOpen(detected, text);
        }
        await reveal.finish();
        if (mountedRef.current) {
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, text: shownText, status: "complete" } : m));
          const rbqChoices = audienceRef.current === "contractor" && mentionsRbq(shownText);
          if (!destination) setQuickReplies(rbqChoices
            ? { messageId: assistantId, options: CLARA_RBQ_QUICK_REPLIES }
            : parsed.options.length >= 2 ? { messageId: assistantId, options: parsed.options } : null);
        }
      } catch {
        reveal.cancel();
        setMessages((prev) => prev.map((m) => m.id === assistantId
          ? { ...m, text: m.text || copy.fallback, status: "failed" }
          : m));
        setError(copy.fallback);
      } finally {
        reveal.cancel();
        setBusy(false);
        setMode((current) => current === "ANALYZING" ? nextMode : current);
        focusComposer();
      }
    },
    [askNextQualification, contractorFlow, beginTextContractorTransition, busy, copy.fallback, focusComposer, messages, runOpen, sayClara, scrollToLatest],
  );

  const chooseQuickReply = useCallback(
    (option: string) => {
      if (busy) return;
      setQuickReplies(null);
      trackCopilotEvent("clara_quick_reply_selected", { surface: "home_clara_box", kind: /photo/i.test(option) ? "photo" : "text" });
      if (option === CHOOSE_ADDRESS || (dossierPendingRef.current && FAKE_DONE.test(option))) {
        setDossierEditAddress(true);
        setDossierOpen(true);
        return;
      }
      if (option === "Continuer sans adresse") dossierPendingRef.current = false;
      if (/ajouter une photo/i.test(option)) {
        cameraRef.current?.click();
        return;
      }
      // Un choix « Ouvrir … » n'est jamais un simple message : il ouvre vraiment.
      // En parcours entrepreneur, la destination est connue même sans intention détectée.
      if (OPEN_CHOICE.test(option)) {
        const intent: ClaraWorkflowIntent | null =
          audienceRef.current === "contractor" ? "contractor_onboarding" : lastIntentRef.current;
        if (intent) {
          void runOpen(intent);
          return;
        }
      }
      if (/^autre$/i.test(option)) {
        focusComposer();
        return;
      }
      void send(option);
    },
    [busy, focusComposer, runOpen, send],
  );

  const chooseIntentSuggestion = useCallback(
    async (suggestion: IntentSuggestion) => {
      if (busy) return;
      trackCopilotEvent("clara_quick_reply_selected", {
        surface: "home_clara_box",
        kind: suggestion.source,
      });

      const destination = resolveClaraDestination(suggestion.intent);
      if (!destination) {
        await send(suggestion.label);
        return;
      }

      const userMessageId = uid();
      setError(null);
      setQuickReplies(null);
      setMessages((previous) => [...previous, { id: userMessageId, role: "user", text: suggestion.label }]);
      const nextMode = detectSurfaceMode(suggestion.label);
      setMode(nextMode === "IDLE" ? "ANALYZING" : nextMode);
      lastIntentRef.current = suggestion.intent;
      rememberClaraReferences({
        current_intent: suggestion.intent,
        detected_role: suggestion.intent === "contractor_onboarding" ? "CONTRACTOR" : undefined,
      });
      const transition = nextWorkflowState(workflowRef.current, suggestion.intent);
      workflowRef.current = transition.state;
      rememberWorkflow(transition.state);
      logClaraWorkflowEvent("intent_detected", { intent: suggestion.intent });
      void appendClaraMessage({
        role: "user",
        text: suggestion.label,
        clientMessageId: userMessageId,
      }).catch(() => undefined);

      if (suggestion.intent === "contractor_onboarding") {
        trackCopilotEvent("contractor_intent_detected", { surface: "home_clara_box" });
        // Les choix deviennent immédiatement des choix entrepreneur.
        setAudience("contractor");
        setMode("CONTRACTOR");
        // Clara parle d'abord et pose UNE question à la fois, dans le chat.
        setBusy(true);
        try {
          const asked = await askNextQualification();
          if (!asked) {
            await beginTextContractorTransition(suggestion.label, CLARA_CONTRACTOR_ANALYSIS_NOTE);
            return;
          }
        } finally {
          if (mountedRef.current && !contractorTransitionRef.current) setBusy(false);
          focusComposer();
        }
        return;
      }
      setBusy(true);
      try {
        await runOpen(suggestion.intent, suggestion.label);
      } finally {
        setBusy(false);
      }
    },
    [askNextQualification, beginTextContractorTransition, busy, focusComposer, runOpen, sayClara, send],
  );

  /** Choix entrepreneur : l'audit ne s'ouvre qu'après texte complet + 3 pulsations. */
  const chooseContractorSuggestion = useCallback(
    async (label: string, choice: ContractorChoice) => {
      if (busy || contractorTransitionRef.current) return;
      trackCopilotEvent("clara_quick_reply_selected", { surface: "home_clara_box", kind: `contractor_${choice}` });
      const userMessageId = uid();
      setError(null);
      setQuickReplies(null);
      setMessages((previous) => [...previous, { id: userMessageId, role: "user", text: label }]);
      void appendClaraMessage({ role: "user", text: label, clientMessageId: userMessageId }).catch(() => undefined);
      scrollToLatest("smooth");
      if (choice === "score") {
        await beginTextContractorTransition(label, CLARA_CONTRACTOR_SCORE_TEXT);
        return;
      }
      if (choice === "contracts") saveClaraQualification({ goals: ["Plus de contrats"] });
      setBusy(true);
      try {
        const asked = await askNextQualification();
        if (!asked) {
          await beginTextContractorTransition(label, CLARA_CONTRACTOR_ANALYSIS_NOTE);
          return;
        }
      } finally {
        if (mountedRef.current && !contractorTransitionRef.current) setBusy(false);
        focusComposer();
      }
    },
    [askNextQualification, beginTextContractorTransition, busy, focusComposer, scrollToLatest],
  );

  const submit = useCallback(async (message: PromptInputMessage) => {
    if (busy) return;
    if (!message.text.trim() && message.files.length === 0) return;
    if (!navigator.onLine) {
      setError("Connexion interrompue. Votre message reste ici.");
      focusComposer();
      return;
    }
    setComposerText("");
    if (message.files.length > 0) {
      setError(null);
      setBusy(true);
      setMode("ANALYZING");
      trackCopilotEvent("clara_upload_started", { surface: "home_clara_box", count: message.files.length });
      try {
        const files: File[] = [];
        for (const attachment of message.files) {
          const response = await fetch(attachment.url);
          const blob = await response.blob();
          const file = new File([blob], attachment.filename || "document", {
            type: attachment.mediaType || blob.type,
          });
          const prepared = file.type.startsWith("image/") ? await prepareImageForUpload(file) : { file, compressed: false };
          if (prepared.compressed) trackCopilotEvent("clara_image_compressed", { surface: "home_clara_box", path: "prompt" });
          files.push(prepared.file);
        }
        const quoteMode = mode === "QUOTE" || files.length > 1 || files.some((file) => /pdf/i.test(file.type));
        let analysisContinuation: string | null = null;
        if (quoteMode) {
          setMode("QUOTE");
          setQuoteCount(files.length);
          const { runQuoteAnalysis } = await import("@/features/quoteAnalyzer/services/quoteAnalysisClient");
          const analysis = await runQuoteAnalysis(files.slice(0, 3));
          const recommendation = analysis.payload.recommendation || "Analyse terminée. Clara peut maintenant vous expliquer les écarts importants.";
          setContextStatus(recommendation);
          analysisContinuation = recommendation;
        } else {
          const first = files[0];
          if (first) {
            setMode(
              first.type.startsWith("video/")
                ? "VIDEO"
                : first.type.startsWith("image/")
                  ? "PHOTO"
                  : "DOCUMENT",
            );
          }
          // File d'attente unique : envoi asynchrone, progression réelle, reprise possible.
          enqueueMedia(files);
        }
        const uploadId = uid();
        const firstFile = files[0];
        const defaultLabel = firstFile?.type.startsWith("image/")
          ? (lang === "fr" ? "Photo ajoutée ✓" : "Photo added ✓")
          : firstFile?.type.startsWith("video/")
            ? (lang === "fr" ? "Vidéo envoyée" : "Video sent")
            : (lang === "fr" ? "Document ajouté ✓" : "Document added ✓");
        const uploadText = message.text || defaultLabel;
        const uploadAttachments: MsgAttachment[] = files.map((file) => ({
          url: createLocalPreview(file),
          kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "document",
          name: file.name,
        }));
        setMessages((previous) => [
          ...previous,
          { id: uploadId, role: "user", text: uploadText, attachments: uploadAttachments },
        ]);
        await appendClaraMessage({
          role: "user",
          text: uploadText,
          messageType: "attachment",
          clientMessageId: uploadId,
        }).catch(() => undefined);
        if (analysisContinuation) {
          const analysisMessageId = uid();
          setMessages((previous) => [...previous, { id: analysisMessageId, role: "assistant", text: analysisContinuation as string }]);
          await appendClaraMessage({
            role: "assistant",
            text: analysisContinuation,
            clientMessageId: analysisMessageId,
          }).catch(() => undefined);
        }
        trackCopilotEvent("clara_upload_completed", { surface: "home_clara_box", count: files.length });
        trackCopilotEvent("clara_attachment_selected", { surface: "home_clara_box", count: files.length });
      } catch {
        trackCopilotEvent("clara_upload_failed", { surface: "home_clara_box" });
        setError("Impossible d’ajouter ce fichier. Réessayer.");
      } finally {
        setBusy(false);
        focusComposer();
        keepComposerVisible();
      }
      return;
    }
    await send(message.text);
    focusComposer();
    keepComposerVisible();
  }, [busy, createLocalPreview, enqueueMedia, focusComposer, keepComposerVisible, lang, mode, send]);

  // Suggestion contextuelle de la voix : halo discret, jamais une alerte.
  const uploadingMedia = mediaItems.some((item) => item.status === "queued" || item.status === "analyzing");
  const lastAssistantText = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant")?.text ?? null,
    [messages],
  );
  const lastUserText = useMemo(
    () => [...messages].reverse().find((m) => m.role === "user")?.text ?? null,
    [messages],
  );
  const userMessageCount = useMemo(() => messages.filter((m) => m.role === "user").length, [messages]);

  useEffect(() => {
    const recommended = shouldSuggestVoice({
      lastAssistantText,
      lastUserText,
      userMessageCount,
      uploading: uploadingMedia || busy,
      voiceActive,
    });
    if (!recommended) {
      setVoiceGlow(false);
      setVoiceTip(null);
      return;
    }
    if (Date.now() < voiceCooldownUntil.current) return;
    setVoiceGlow(true);
    trackCopilotEvent("clara_voice_suggested", { surface: "home_clara_box" });
    if (!voiceTipShown.current) {
      voiceTipShown.current = true;
      setVoiceTip(lang === "fr" ? "Plus simple à expliquer à voix haute" : "Easier to explain out loud");
    }
    const timer = window.setTimeout(() => {
      setVoiceGlow(false);
      setVoiceTip(null);
      voiceCooldownUntil.current = Date.now() + 60_000;
      trackCopilotEvent("clara_voice_suggestion_dismissed", { surface: "home_clara_box" });
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [lastAssistantText, lastUserText, userMessageCount, uploadingMedia, busy, voiceActive, lang]);

  const startVoice = async () => {
    // Un changement de canal fige la révélation en cours au lieu de la rejouer.
    activeTypingIdRef.current = null;
    setClaraTyping(false);
    useAlexStore.getState().markUserEngaged();
    try {
      await startOrResumeClaraSession({ language: lang, entrypoint: "home_clara_box" });
    } catch {
      setError("Clara reste disponible ici. Réessayer le micro dans un instant.");
      return;
    }
    // MODE, pas session : la conversation canonique reste exactement la même.
    setMode("LISTENING");
    setVoiceActive(true);
    setVoiceGlow(false);
    setVoiceTip(null);
    voiceCooldownUntil.current = Date.now() + 60_000;
    trackCopilotEvent("clara_input_mode_changed", { surface: "home_clara_box", mode: "voice" });
    trackCopilotEvent("clara_voice_started", { surface: "home_clara_box" });
    const voiceStore = useAlexVoiceLockedStore.getState();
    if (voiceStore.isOverlayOpen && (voiceStore.machineState === "paused" || voiceStore.machineState === "completed")) {
      voiceStore.resumeVoiceSession("user_resume_from_composer");
      return;
    }
    openAlex("home_hero", "user_tapped_orb", "floating");
  };

  const handleComposerChange = useCallback((value: string) => {
    setComposerText(value);
    if (voiceActive) {
      activeTypingIdRef.current = null;
      setClaraTyping(false);
      window.dispatchEvent(new CustomEvent(CLARA_VOICE_TEXT_INPUT_EVENT));
      setVoiceActive(false);
      setMode((current) => current === "LISTENING" ? "IDLE" : current);
      trackCopilotEvent("clara_input_mode_changed", { surface: "home_clara_box", mode: "text" });
    }
    keepComposerVisible();
  }, [keepComposerVisible, voiceActive]);

  const handleComposerFocus = useCallback(() => {
    composerEngagedRef.current = true;
    setComposerFocused(true);
    setComposerEverFocused(true);
    if (voiceActive) {
      activeTypingIdRef.current = null;
      setClaraTyping(false);
      window.dispatchEvent(new CustomEvent(CLARA_VOICE_TEXT_INPUT_EVENT));
      setVoiceActive(false);
      setMode((current) => current === "LISTENING" ? "IDLE" : current);
      trackCopilotEvent("clara_input_mode_changed", { surface: "home_clara_box", mode: "text" });
    }
    window.setTimeout(keepComposerVisible, 180);
  }, [keepComposerVisible, voiceActive]);

  const showIntentSuggestions = audience === "homeowner"
    && !isConversationActive
    && !composerFocused
    && composerText.trim().length === 0;

  // Capture directe (appareil photo, caméra, galerie) : le fichier entre
  // immédiatement dans la file d'attente, sans passer par un aperçu factice.
  const acceptDirectFiles = useCallback(
    (list: FileList | null) => {
      const files = list ? Array.from(list) : [];
      if (files.length === 0) return;
      const first = files[0];
      setError(null);
      setQuickReplies(null);
      trackCopilotEvent("clara_attachment_selected", { surface: "home_clara_box", count: files.length });
      trackCopilotEvent("clara_input_mode_changed", { surface: "home_clara_box", mode: first.type.startsWith("video/") ? "video" : first.type.startsWith("image/") ? "photo" : "document" });
      trackCopilotEvent("clara_upload_started", { surface: "home_clara_box", count: files.length });
      setMode(first.type.startsWith("video/") ? "VIDEO" : first.type.startsWith("image/") ? "PHOTO" : "DOCUMENT");
      enqueueMedia(files);

      const messageId = uid();
      const label = first.type.startsWith("video/") ? "Vidéo ajoutée ✓" : first.type.startsWith("image/") ? "Photo ajoutée ✓" : "Document ajouté ✓";
      const attachments: MsgAttachment[] = files.map((file) => ({
        url: createLocalPreview(file),
        kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "document",
        name: file.name,
      }));
      setMessages((previous) => [...previous, { id: messageId, role: "user", text: label, attachments }]);
      void appendClaraMessage({
        role: "user",
        text: label,
        messageType: "attachment",
        clientMessageId: messageId,
      }).catch(() => {});

      // Une pièce réellement transmise entre au Dossier maison, sans analyse
      // présumée : ce qui est confirmé, c'est la réception du fichier.
      for (const file of files) {
        rememberInDossier({
          category: "document",
          label: file.name || label,
          entryKey: `${file.name || label}-${file.size}`,
          detail: file.type.startsWith("video/")
            ? "Vidéo transmise par le propriétaire."
            : file.type.startsWith("image/")
              ? "Photo transmise par le propriétaire."
              : "Document transmis par le propriétaire.",
          provenance: "declared",
        });
      }
    },
    [createLocalPreview, enqueueMedia],
  );

  return (
    <section
      ref={rootRef}
      className={`home-clara-shell mx-auto w-full text-left${contextVisible ? " has-context" : ""}${isConversationActive ? " is-conversation-active" : ""}`}
      aria-label="Conversation avec Clara"
    >
      <div className="home-clara-main home-clara-glass relative overflow-hidden border border-border">
        <div className="home-clara-command-row" data-chat-row="commands">
          <div className={`home-clara-presence${busy ? " is-active" : ""}`} data-state={busy ? "working" : "idle"}>
            <span aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
            <strong>Clara</strong>
            <small>{busy ? "Analyse en cours…" : voiceActive ? "Mode vocal" : "Disponible"}</small>
          </div>
          <div className="home-clara-command-actions" aria-label="Commandes de conversation">
            <DropdownMenu open={historyOpen} onOpenChange={(next) => { setHistoryOpen(next); if (next) void openHistory(); }}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="home-clara-history-open" title="Conversations" aria-label="Voir mes conversations">
                  <History aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="home-clara-history">
                <DropdownMenuLabel>Mes conversations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {historyLoading && <p className="home-clara-history-empty">Chargement…</p>}
                {historyError && <p className="home-clara-history-empty" role="alert">{historyError}</p>}
                {!historyLoading && !historyError && historyItems.length === 0 && <p className="home-clara-history-empty">Aucune conversation précédente.</p>}
                {historyItems.map((entry) => (
                  <DropdownMenuItem key={entry.session_id} onSelect={() => void resumeConversation(entry)} data-current={entry.current ? "true" : undefined}>
                    <span>{entry.title || "Conversation sans message"}</span>
                    {entry.current && <em>En cours</em>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="home-clara-more" title="Plus d’actions" aria-label="Plus d’actions">
                  <EllipsisVertical aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="home-clara-actions-menu">
                <DropdownMenuItem onSelect={() => setDossierOpen(true)} className="home-clara-dossier-open min-h-11 gap-2">
                  <Home aria-hidden="true" /> Dossier maison
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleResetClick} className="home-clara-reset min-h-11 gap-2" aria-label={copy.reset}>
                  <SquarePen aria-hidden="true" /> {copy.reset}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div id="home-clara-voice-slot" className="home-clara-voice-slot" aria-live="polite" />
        </div>
        <DossierMaisonSheet
          open={dossierOpen}
          onOpenChange={(next) => { setDossierOpen(next); if (!next) setDossierEditAddress(false); }}
          editAddress={dossierEditAddress}
          onAddressSaved={(entry) => {
            dossierAddressSavedRef.current = true;
            dossierPendingRef.current = false;
            setDossierOpen(false);
            setDossierEditAddress(false);
            trackCopilotEvent("clara_property_address_saved", { surface: "home_clara_box", provenance: entry.provenance });
            // Une sauvegarde de dossier n'est jamais une réponse à la qualification entrepreneur.
            const note = `L'adresse de ma propriété est ${entry.label}${entry.provenance === "pending" ? " (à confirmer)" : ""}.`;
            if (audienceRef.current === "contractor") {
              addFlowUserMessage(note);
              void sayClara("L'adresse reste dans votre dossier maison, séparée des territoires de votre entreprise. Dans quelles villes souhaitez-vous travailler?");
            } else void send(note);
          }}
        />
        <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
          <AlertDialogContent className="home-clara-reset-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>{copy.reset}</AlertDialogTitle>
              <AlertDialogDescription>{copy.resetConfirm}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{copy.resetNo}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void startFreshConversation()}>{copy.resetYes}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Conversation className="home-clara-conversation min-h-0" initial="instant" resize="instant">
          <ConversationViewportFollow />
          {/* Les messages commencent en haut, juste sous la barre d'outils :
              aucune zone vide artificielle avant le premier échange. */}
          <ConversationContent className="flex flex-col justify-start gap-3 px-5 py-3 sm:px-6">
            {messages.length === 0 && (
              <Message from="assistant">
                <MessageContent className="home-clara-message leading-relaxed">
                  <MessageResponse>Bonjour ! Que puis-je faire pour vous ?</MessageResponse>
                </MessageContent>
              </Message>
            )}
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent
                  data-role={message.role}
                  data-streaming={message.status === "streaming" ? "true" : "false"}
                  data-message-status={message.status ?? "complete"}
                  className="home-clara-message home-clara-message leading-relaxed group-[.is-user]:bg-primary-strong group-[.is-user]:text-primary-foreground"
                >
                  {message.attachments && message.attachments.length > 0 && (
                    <ul className="home-clara-attachments" aria-label="Pièces jointes">
                      {message.attachments.map((attachment) => (
                        <li key={attachment.url} data-kind={attachment.kind}>
                          {attachment.kind === "image" ? (
                           <img src={attachment.url} alt="Photo ajoutée" />
                          ) : attachment.kind === "video" ? (
                            <video src={attachment.url} muted playsInline preload="metadata" aria-label={attachment.name} />
                          ) : (
                             <span><FileText className="h-4 w-4" aria-hidden="true" /> {attachment.name || "Document ajouté"}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <MessageResponse>{message.text}</MessageResponse>
                  {message.action && (
                    <div className="home-clara-quick" role="group" aria-label="Action proposée">
                      <button type="button" onClick={() => void runOpen(message.action!.intent as ClaraWorkflowIntent)}>
                        {message.action.label}
                      </button>
                    </div>
                  )}
                </MessageContent>
              </Message>
            ))}
            {quickReplies && !busy && (
              <div className="home-clara-quick" role="group" aria-label="Réponses rapides">
                {quickReplies.options.map((option, index) => (
                  <button
                    key={`${quickReplies.messageId}:${option}`}
                    type="button"
                    disabled={busy}
                    data-stagger="true"
                    style={{ "--chip-index": index } as CSSProperties}
                    // Garde le clavier ouvert si l'utilisateur écrivait : aucun blur.
                    onPointerDown={(event) => { if (composerEngagedRef.current) event.preventDefault(); }}
                    onClick={() => chooseQuickReply(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            {contractorFlow && (
              <ClaraContractorFlow
                ref={contractorFlowRef}
                say={(text) => sayClara(text)}
                addUser={addFlowUserMessage}
                onBusy={setBusy}
              />
            )}
            {!contractorFlow && audience === "contractor" && !quickReplies && !busy && !transitionPause && !qualificationStepRef.current && (
              <div className="home-clara-quick" role="group" aria-label="Choix entrepreneur" data-audience="contractor">
                {CONTRACTOR_SUGGESTIONS.map((option) => (
                  <button key={option.choice} type="button" onClick={() => void chooseContractorSuggestion(option.label, option.choice)}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {audience === "contractor" && !busy && !transitionPause && (
              <div className="home-clara-quick" role="group" aria-label="Retour au projet maison">
                <button
                  type="button"
                  data-testid="clara-back-to-home-project"
                  onClick={() => {
                    // Même conversation : le parcours entrepreneur est suspendu (jamais effacé)
                    // et le curseur maison reprend exactement la dernière question sans réponse.
                    setContractorFlow(false);
                    pauseActiveContractorFlow();
                    qualificationStepRef.current = null;
                    setAudience("homeowner");
                    setMode("PROJECT");
                    rememberClaraReferences({ current_intent: "PROJECT" });
                    trackCopilotEvent("clara_input_mode_changed", { surface: "home_clara_box", mode: "text", intent: "homeowner" });
                    const cursor = readHomeCursor();
                    if (cursor) {
                      void sayClara(cursor.text, cursor.options);
                    } else if (messagesRef.current.some((m) => m.role === "user")) {
                      void sayClara("Bien sûr. Continuons votre projet maison : dites-moi ce qui a changé ou ce que vous souhaitez préciser.");
                    } else {
                      void sayClara("Bien sûr. Décrivez-moi votre projet maison en quelques mots.");
                    }
                  }}
                >
                  Revenir à mon projet maison
                </button>
              </div>
            )}
            {transitionPause ? (
              <div className="home-clara-transition-pause" data-pulses={TRANSITION_PULSES} role="status" aria-label="Clara prépare la prochaine étape">
                <span>Clara</span><i /><i /><i />
              </div>
            ) : claraBreathing ? (
              <p className="home-clara-working" role="status">Clara écrit…</p>
            ) : busy && !claraTyping ? <p className="home-clara-working" role="status">{copy.working}</p> : null}

            {error && <p role="alert" className="home-clara-error">{error}</p>}
            {!online && <p role="status" className="home-clara-offline">Connexion interrompue. Votre message reste ici.</p>}
        {showIntentSuggestions && (
         <div className="home-clara-examples" aria-label="Intentions suggérées" data-suggestion-source={intentSuggestions[0]?.source ?? "default"}>
           {intentSuggestions.map((suggestion) => (
             <button
               key={`${suggestion.source}-${suggestion.label}`}
               type="button"
               disabled={busy}
               onClick={() => void chooseIntentSuggestion(suggestion)}
             >
               {suggestion.label}
             </button>
           ))}
        </div>
      )}
            <div ref={bottomAnchorRef} className="home-clara-bottom-anchor" aria-hidden="true" />
          </ConversationContent>
          <ConversationScrollButton title="Nouveau message" />
        </Conversation>

      <div className="home-clara-input-row" data-chat-row="composer">
      {mediaItems.length > 0 && (
        <ul className="home-clara-media" aria-label="Fichiers en cours">
          {mediaItems.map((item) => (
            <li key={item.id} className="home-clara-media-item" data-status={item.status}>
              {item.previewUrl && item.kind !== "document" ? (
                item.kind === "video"
                  ? <video src={item.previewUrl} muted playsInline preload="metadata" aria-hidden="true" />
                  : <img src={item.previewUrl} alt="" />
              ) : (
                <span className="home-clara-media-icon" aria-hidden="true"><FileText className="h-4 w-4" /></span>
              )}
              <div className="home-clara-media-body">
                 <p>{item.kind === "photo" ? "Photo ajoutée" : item.kind === "video" ? "Vidéo ajoutée" : (item.name || "Document ajouté")}</p>
                <span aria-live="polite">
                  {item.status === "uploading" && `Envoi ${Math.round(item.progress * 100)} %`}
                  {item.status === "analyzing" && "Analyse en cours…"}
                  {item.status === "queued" && "En attente"}
                   {item.status === "done" && "Ajouté ✓"}
                   {item.status === "failed" && (item.error || "Impossible d’ajouter ce fichier.")}
                </span>
                {(item.status === "uploading" || item.status === "analyzing") && (
                  <progress max={100} value={Math.round(item.progress * 100)} />
                )}
              </div>
              {item.status === "failed" && (
                <button type="button" onClick={() => retryMedia(item.id)} aria-label="Réessayer ce fichier">
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={() => removeMedia(item.id)} aria-label="Retirer ce fichier">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={composerRef} className="home-clara-composer">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label={copy.camera} onChange={(event) => { acceptDirectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
        <input ref={videoCameraRef} type="file" accept="video/*" capture="environment" className="hidden" aria-label="Prendre une vidéo" onChange={(event) => { acceptDirectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
        <input ref={photoLibraryRef} type="file" accept="image/*" multiple className="hidden" aria-label="Choisir une photo" onChange={(event) => { acceptDirectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
        <input ref={videoLibraryRef} type="file" accept="video/*" className="hidden" aria-label="Choisir une vidéo" onChange={(event) => { acceptDirectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
        <PromptInput
          accept="image/*,video/*,.pdf,.doc,.docx"
          multiple
          maxFiles={5}
          maxFileSize={50 * 1024 * 1024}
          onSubmit={submit}
          onError={() => setError("Impossible d’ajouter ce fichier. Choisir un autre fichier.")}
          className="home-clara-prompt"
          data-voice-listening={voiceActive ? "true" : undefined}
        >
          <PromptInputTextarea
            ref={textareaRef}
            aria-label={voiceActive ? copy.listening : conversationStarted ? copy.placeholderActive : copy.placeholder}
            placeholder={voiceActive ? copy.listening : conversationStarted ? copy.placeholderActive : copy.placeholder}
             rows={1}
             value={composerText}
             onChange={(event) => handleComposerChange(event.currentTarget.value)}
             onInput={(event) => {
               const field = event.currentTarget;
               field.style.height = "auto";
              field.style.height = `${Math.min(field.scrollHeight, 140)}px`;
              field.style.overflowY = field.scrollHeight > 140 ? "auto" : "hidden";
               keepComposerVisible();
             }}
             onFocus={handleComposerFocus}
             onBlur={() => { composerEngagedRef.current = false; setComposerFocused(false); }}
            className="home-clara-textarea text-foreground placeholder:text-muted-foreground"
          />
          <PromptInputFooter className="home-clara-controls">
            <PromptInputTools>
              <MediaMenu
                label={copy.attach}
                onTakePhoto={() => cameraRef.current?.click()}
                onChoosePhoto={() => photoLibraryRef.current?.click()}
                onTakeVideo={() => videoCameraRef.current?.click()}
                onChooseVideo={() => videoLibraryRef.current?.click()}
              />
              <PromptInputButton type="button" onClick={() => cameraRef.current?.click()} aria-label={copy.camera} title={copy.camera} className="home-clara-tool touch-manipulation rounded-full text-muted-foreground hover:text-foreground">
                <Camera className="h-5 w-5" />
              </PromptInputButton>
              <PromptInputButton
                type="button"
                onClick={() => void startVoice()}
                title={copy.voice}
                aria-label={copy.voice}
                data-voice-suggested={voiceGlow ? "true" : undefined}
                data-voice-listening={voiceActive ? "true" : undefined}
                className="home-clara-tool home-clara-mic rounded-full text-muted-foreground hover:text-foreground"
              >
                <Mic className="h-5 w-5" />
              </PromptInputButton>
              {voiceTip && (
                <span className="home-clara-voice-tip" role="note">{voiceTip}</span>
              )}
            </PromptInputTools>
            <ClaraSubmitButton busy={busy} hasText={composerText.trim().length > 0} label={copy.send} />
          </PromptInputFooter>
        </PromptInput>
      </div>
      </div>

      </div>
      {contextVisible && (
        <motion.div className="home-context-slot" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
          <Suspense fallback={<div className="home-clara-context"><Shimmer>Préparation…</Shimmer></div>}>
            <ClaraContextPanel mode={mode} quoteCount={quoteCount} statusText={contextStatus} />
          </Suspense>
        </motion.div>
      )}
    </section>
  );
}

function ClaraSubmitButton({ busy, hasText, label }: { busy: boolean; hasText: boolean; label: string }) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasText || attachments.files.length > 0;
  return (
    <PromptInputSubmit
      status={busy ? "submitted" : "ready"}
      disabled={busy || !canSubmit}
      aria-label={label}
      data-cta-canonical="home_alex"
      className="home-clara-submit rounded-full bg-primary text-primary-foreground shadow-glow hover:bg-primary-strong"
    >
      <ArrowUp className="h-5 w-5" />
    </PromptInputSubmit>
  );
}

interface MediaMenuProps {
  label: string;
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
  onTakeVideo: () => void;
  onChooseVideo: () => void;
}

/**
 * Menu média tactile : chaque choix ouvre son sélecteur natif directement
 * dans le même geste (pas de fermeture asynchrone ni d'infobulle), ce qui
 * évite les boutons « morts » sur Chrome Android et Safari iOS.
 */
function MediaMenu({ label, onTakePhoto, onChoosePhoto, onTakeVideo, onChooseVideo }: MediaMenuProps) {
  const attachments = usePromptInputAttachments();

  const items: Array<{ key: string; icon: typeof Camera; text: string; run: () => void }> = [
    { key: "cp", icon: ImageIcon, text: "Photo", run: onChoosePhoto },
    { key: "cv", icon: Video, text: "Vidéo", run: onChooseVideo },
    { key: "doc", icon: FileText, text: "Document", run: () => attachments.openFileDialog() },
    { key: "tp", icon: Camera, text: "Prendre une photo", run: onTakePhoto },
    { key: "tv", icon: Video, text: "Prendre une vidéo", run: onTakeVideo },
    { key: "quote", icon: FileText, text: "Importer une soumission", run: () => attachments.openFileDialog() },
    { key: "plan", icon: FileText, text: "Importer un plan", run: () => attachments.openFileDialog() },
  ];

  return (
    <PromptInputActionMenu>
      <PromptInputActionMenuTrigger aria-label={label} className="home-clara-tool rounded-full text-muted-foreground hover:text-foreground">
        <Plus className="h-5 w-5" />
      </PromptInputActionMenuTrigger>
      <PromptInputActionMenuContent side="top" sideOffset={8} collisionPadding={12} className="home-clara-media-menu w-56">
        {items.map(({ key, icon: Icon, text, run }) => (
            <PromptInputActionMenuItem key={key} onSelect={run} className="min-h-11 touch-manipulation gap-2">
              <Icon className="h-4 w-4" /> {text}
            </PromptInputActionMenuItem>
        ))}
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
  );
}
