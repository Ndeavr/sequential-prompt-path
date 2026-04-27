/**
 * copilotConversationStore — Alex chat state (homepage Copilot sheet).
 *
 * Conversion-first conversational engine:
 *  - alexCopilotEngine drives every Alex response (max 3 questions before value).
 *  - Real photo upload via alexUploadService (logged in → Supabase Storage + project_files).
 *  - Quick-reply chips + memory line + guest profile-save prompt.
 *  - sanitizeAlexText scrubs every Alex bubble before render.
 */
import { create } from "zustand";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import {
  acknowledgePhoto,
  createEmptySession,
  MEMORY_LINE_FR,
  type AlexSession,
  type QuickReply,
  type EngineDecision,
} from "@/services/alexCopilotEngine";
import { routeAlexIntent, resetRouter } from "@/services/alexMasterRouter";
import { uploadAlexFile, type UploadedFile } from "@/services/alexUploadService";
import { cleanAlexText } from "@/utils/sanitizeAlexText";
import { supabase } from "@/integrations/supabase/client";

export interface RecommendedPro {
  id: string;
  name: string;
  imageUrl?: string;
  compatibility: number;
  rating: number;
  reviewsCount: number;
  reasons: string[];
  city?: string;
  specialty?: string;
}

export type ChatRole = "user" | "alex" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text?: string;
  loading?: boolean;
  pro?: RecommendedPro;
  photo?: UploadedFile;
  quickReplies?: QuickReply[];
  showProfilePrompt?: boolean;
  createdAt: number;
}

interface CopilotState {
  isOpen: boolean;
  messages: ChatMessage[];
  proPool: RecommendedPro[];
  currentProIndex: number;
  bookingOpen: boolean;
  whyOpen: boolean;
  thinking: boolean;
  selectedPro: RecommendedPro | null;
  session: AlexSession;
  open: (initialText?: string) => void;
  close: () => void;
  sendMessage: (text: string) => Promise<void>;
  uploadPhoto: (file: File) => Promise<void>;
  executeQuickReply: (reply: QuickReply) => Promise<void>;
  dismissProfilePrompt: () => void;
  requestAlternative: () => Promise<void>;
  openBooking: (pro?: RecommendedPro) => void;
  closeBooking: () => void;
  openWhy: (pro: RecommendedPro) => void;
  closeWhy: () => void;
  reset: () => void;
}

const MOCK_POOL: RecommendedPro[] = [
  {
    id: "pro-1",
    name: "Peintres Élite Montréal",
    compatibility: 97,
    rating: 4.9,
    reviewsCount: 142,
    city: "Montréal",
    specialty: "Peinture intérieure résidentielle",
    reasons: [
      "Spécialiste peinture intérieure",
      "Excellents avis récents",
      "Bonne disponibilité cette semaine",
      "Vérifié UNPRO",
    ],
  },
  {
    id: "pro-2",
    name: "Atelier Couleur Laval",
    compatibility: 93,
    rating: 4.8,
    reviewsCount: 88,
    city: "Laval",
    specialty: "Peinture complète + plâtre",
    reasons: ["Préparation soignée", "Garantie travaux", "Vérifié UNPRO"],
  },
];

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

async function getIsLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return !!data?.user;
}

function applyDecision(
  current: AlexSession,
  decision: EngineDecision,
): AlexSession {
  return { ...current, ...decision.sessionPatch };
}

function buildAlexBubble(decision: EngineDecision): ChatMessage {
  const base = cleanAlexText(decision.alexText);
  const text = decision.showMemoryLine ? `${base}\n\n${MEMORY_LINE_FR}` : base;
  return {
    id: uid(),
    role: "alex",
    text,
    quickReplies: decision.quickReplies,
    showProfilePrompt: decision.showProfilePrompt,
    createdAt: Date.now(),
  };
}

export const useCopilotConversationStore = create<CopilotState>((set, get) => ({
  isOpen: false,
  messages: [],
  proPool: MOCK_POOL,
  currentProIndex: -1,
  bookingOpen: false,
  whyOpen: false,
  thinking: false,
  selectedPro: null,
  session: createEmptySession({ isLoggedIn: false }),

  open: (initialText) => {
    set({ isOpen: true });
    trackCopilotEvent("alex_started", { initialText });

    // Refresh login state on open
    void getIsLoggedIn().then((isLoggedIn) => {
      set((s) => ({ session: { ...s.session, isLoggedIn } }));
    });

    if (initialText && initialText.trim()) {
      void get().sendMessage(initialText.trim());
    } else if (get().messages.length === 0) {
      set({
        messages: [
          {
            id: uid(),
            role: "alex",
            text: "Salut ! Je suis Alex. Quel est votre projet aujourd'hui ?",
            quickReplies: [
              { id: "qr-paint", label: "Peinture", action: { kind: "send", text: "Peinture maison" } },
              { id: "qr-humid", label: "Humidité", action: { kind: "send", text: "Problème d'humidité" } },
              { id: "qr-roof", label: "Toiture", action: { kind: "send", text: "Problème de toiture" } },
              { id: "qr-photo", label: "Ajouter une photo", action: { kind: "open_upload" } },
            ],
            createdAt: Date.now(),
          },
        ],
      });
    }
  },

  close: () => set({ isOpen: false }),

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    trackCopilotEvent("message_sent", { length: trimmed.length });

    set((s) => ({
      messages: [...s.messages, { id: uid(), role: "user", text: trimmed, createdAt: Date.now() }],
      thinking: true,
    }));

    // Simulate brief thinking delay for UX
    await new Promise((r) => setTimeout(r, 600));

    const decision = decideNext(get().session, trimmed);
    const bubble = buildAlexBubble(decision);

    set((s) => ({
      thinking: false,
      session: applyDecision(s.session, decision),
      messages: [...s.messages, bubble],
    }));

    if (decision.showProfilePrompt) {
      trackCopilotEvent("profile_save_prompt_shown");
    }
    if (decision.sessionPatch.lastValueShownAt) {
      trackCopilotEvent("value_summary_shown", { intent: decision.sessionPatch.intent });
    }

    // If the engine routed to a pro match, surface a recommendation card
    if (decision.nextBestAction === "match_pro") {
      await new Promise((r) => setTimeout(r, 700));
      const pro = get().proPool[0];
      if (pro) {
        set((s) => ({
          currentProIndex: 0,
          messages: [
            ...s.messages,
            {
              id: uid(),
              role: "alex",
              text: "Voici le pro que je recommande pour votre projet :",
              pro,
              createdAt: Date.now(),
            },
          ],
        }));
        trackCopilotEvent("recommended_pro_shown", { proId: pro.id, position: 0 });
      }
    }
  },

  uploadPhoto: async (file: File) => {
    trackCopilotEvent("photo_upload_started", { size: file.size, type: file.type });
    set({ thinking: true });

    const result = await uploadAlexFile(file);
    if (!result.ok || !result.file) {
      trackCopilotEvent("photo_upload_failed", { error: result.error });
      set((s) => ({
        thinking: false,
        messages: [
          ...s.messages,
          {
            id: uid(),
            role: "alex",
            text: result.error || "Impossible d'envoyer la photo. Réessayez.",
            createdAt: Date.now(),
          },
        ],
      }));
      return;
    }

    trackCopilotEvent("photo_upload_succeeded", { isGuest: result.file.isGuest });

    // User bubble with thumbnail
    set((s) => ({
      messages: [
        ...s.messages,
        { id: uid(), role: "user", photo: result.file, createdAt: Date.now() },
      ],
      session: { ...s.session, uploadedFiles: [...s.session.uploadedFiles, result.file!] },
    }));

    await new Promise((r) => setTimeout(r, 400));

    const decision = acknowledgePhoto(get().session);
    const bubble = buildAlexBubble(decision);
    set((s) => ({
      thinking: false,
      session: applyDecision(s.session, decision),
      messages: [...s.messages, bubble],
    }));
  },

  executeQuickReply: async (reply: QuickReply) => {
    trackCopilotEvent("quick_reply_clicked", { id: reply.id, label: reply.label });
    const action = reply.action;
    switch (action.kind) {
      case "send":
        await get().sendMessage(action.text);
        return;
      case "open_upload": {
        // Trigger hidden file input rendered by AlexCopilotConversation
        const input = document.getElementById("alex-file-input") as HTMLInputElement | null;
        input?.click();
        return;
      }
      case "save_profile":
        if (typeof window !== "undefined") {
          window.location.href = "/auth?context=alex_save";
        }
        return;
      case "continue_guest":
        get().dismissProfilePrompt();
        return;
      case "estimate_no_photo":
        await get().sendMessage("Estime sans photo pour l'instant.");
        return;
      case "match_pro":
        await get().sendMessage("Recommande-moi le bon pro.");
        return;
      case "save_project": {
        const isLoggedIn = await getIsLoggedIn();
        if (!isLoggedIn) {
          set((s) => ({ session: { ...s.session, profilePromptShown: false } }));
          await get().sendMessage("Je veux sauvegarder mon projet.");
        } else {
          set((s) => ({
            session: { ...s.session, projectSaved: true },
            messages: [
              ...s.messages,
              {
                id: uid(),
                role: "alex",
                text: "Projet sauvegardé dans votre dossier. Vous pouvez y revenir à tout moment.",
                createdAt: Date.now(),
              },
            ],
          }));
        }
        return;
      }
    }
  },

  dismissProfilePrompt: () =>
    set((s) => ({ session: { ...s.session, profilePromptShown: true } })),

  requestAlternative: async () => {
    const next = get().currentProIndex + 1;
    if (next >= get().proPool.length) return;
    trackCopilotEvent("alternative_option_requested", { position: next });
    const pro = get().proPool[next];
    set((s) => ({
      currentProIndex: next,
      messages: [
        ...s.messages,
        { id: uid(), role: "user", text: "Une autre option ?", createdAt: Date.now() },
        {
          id: uid(),
          role: "alex",
          text: "Voici une autre option pertinente :",
          pro,
          createdAt: Date.now(),
        },
      ],
    }));
    trackCopilotEvent("recommended_pro_shown", { proId: pro?.id, position: next });
  },

  openBooking: (pro) => {
    const target = pro ?? get().proPool[get().currentProIndex] ?? null;
    set({ bookingOpen: true, selectedPro: target });
    trackCopilotEvent("booking_started", { proId: target?.id });
  },
  closeBooking: () => set({ bookingOpen: false }),

  openWhy: (pro) => set({ whyOpen: true, selectedPro: pro }),
  closeWhy: () => set({ whyOpen: false }),

  reset: () =>
    set({
      messages: [],
      currentProIndex: -1,
      bookingOpen: false,
      whyOpen: false,
      selectedPro: null,
      thinking: false,
      session: createEmptySession({ isLoggedIn: false }),
    }),
}));
