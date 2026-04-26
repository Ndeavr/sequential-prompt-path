/**
 * copilotConversationStore — Zustand store for the Copilot homepage chat sheet.
 *
 * HARD RULE: Never expose more than one recommended pro at a time.
 * Alternative pros are revealed one-by-one on explicit user request.
 */
import { create } from "zustand";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

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
  open: (initialText?: string) => void;
  close: () => void;
  sendMessage: (text: string) => Promise<void>;
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
    name: "Assèchement Pro Laval",
    imageUrl: "",
    compatibility: 98,
    rating: 4.9,
    reviewsCount: 128,
    city: "Laval",
    specialty: "Humidité / sous-sol",
    reasons: [
      "Spécialiste humidité / sous-sol",
      "Excellents avis récents",
      "Intervient dans votre secteur",
      "Disponibilité rapide cette semaine",
      "Prix généralement compétitif",
      "Vérifié UNPRO",
    ],
  },
  {
    id: "pro-2",
    name: "Solutions Sous-Sol Québec",
    compatibility: 94,
    rating: 4.8,
    reviewsCount: 87,
    city: "Montréal",
    specialty: "Drain français + assèchement",
    reasons: [
      "10 ans d'expérience humidité",
      "Garantie complète sur travaux",
      "Bonne disponibilité",
      "Couvre votre secteur",
      "Vérifié UNPRO",
    ],
  },
  {
    id: "pro-3",
    name: "Habitat Sain Montréal",
    compatibility: 91,
    rating: 4.7,
    reviewsCount: 64,
    city: "Montréal",
    specialty: "Moisissure et qualité de l'air",
    reasons: [
      "Approche écologique",
      "Inspection détaillée incluse",
      "Avis 5 étoiles récents",
      "Vérifié UNPRO",
    ],
  },
];

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const useCopilotConversationStore = create<CopilotState>((set, get) => ({
  isOpen: false,
  messages: [],
  proPool: MOCK_POOL,
  currentProIndex: -1,
  bookingOpen: false,
  whyOpen: false,
  thinking: false,
  selectedPro: null,

  open: (initialText) => {
    set({ isOpen: true });
    trackCopilotEvent("alex_started", { initialText });
    if (initialText && initialText.trim()) {
      // fire & forget, non-blocking
      void get().sendMessage(initialText.trim());
    } else if (get().messages.length === 0) {
      set({
        messages: [
          {
            id: uid(),
            role: "alex",
            text: "Salut! Je suis Alex. Quel est votre projet aujourd'hui?",
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
      messages: [
        ...s.messages,
        { id: uid(), role: "user", text: trimmed, createdAt: Date.now() },
      ],
      thinking: true,
    }));

    // Alex thinking message
    const thinkingId = uid();
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: thinkingId,
          role: "alex",
          text:
            "Je comprends. J'analyse votre situation selon votre type de problème, votre secteur et la disponibilité locale.",
          loading: true,
          createdAt: Date.now(),
        },
      ],
    }));

    await new Promise((r) => setTimeout(r, 1500));

    const idx = 0;
    const pro = get().proPool[idx];
    set((s) => ({
      thinking: false,
      currentProIndex: idx,
      messages: s.messages
        .map((m) => (m.id === thinkingId ? { ...m, loading: false } : m))
        .concat({
          id: uid(),
          role: "alex",
          text: "Après analyse, je vous recommande:",
          pro,
          createdAt: Date.now(),
        }),
    }));
    trackCopilotEvent("recommended_pro_shown", { proId: pro?.id, position: idx });
  },

  requestAlternative: async () => {
    const next = get().currentProIndex + 1;
    if (next >= get().proPool.length) return;
    trackCopilotEvent("alternative_option_requested", { position: next });
    set((s) => ({
      thinking: true,
      messages: [
        ...s.messages,
        {
          id: uid(),
          role: "user",
          text: "Une autre option?",
          createdAt: Date.now(),
        },
        {
          id: uid(),
          role: "alex",
          text: "Voici une autre option pertinente:",
          loading: true,
          createdAt: Date.now(),
        },
      ],
    }));
    await new Promise((r) => setTimeout(r, 900));
    const pro = get().proPool[next];
    set((s) => ({
      thinking: false,
      currentProIndex: next,
      messages: s.messages
        .slice(0, -1)
        .concat({
          id: uid(),
          role: "alex",
          text: "Voici une autre option pertinente:",
          pro,
          createdAt: Date.now(),
        }),
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
    }),
}));
