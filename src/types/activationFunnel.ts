/**
 * UNPRO — Contractor Activation Funnel Types
 * 9-screen conversion funnel with Solo + Alex modes.
 */

export const ACTIVATION_SCREENS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type ActivationScreen = (typeof ACTIVATION_SCREENS)[number];

export const SCREEN_LABELS: Record<ActivationScreen, string> = {
  1: "Accueil",
  2: "Compte",
  3: "Analyse",
  4: "Score AIPP",
  5: "Profil",
  6: "Calendrier",
  7: "Plan",
  8: "Paiement",
  9: "Activation",
};

export const SCREEN_ROUTES: Record<ActivationScreen, string> = {
  1: "/entrepreneur/activer",
  2: "/entrepreneur/activer/compte",
  3: "/entrepreneur/activer/analyse",
  4: "/entrepreneur/activer/score",
  5: "/entrepreneur/activer/profil",
  6: "/entrepreneur/activer/calendrier",
  7: "/entrepreneur/activer/plan",
  8: "/entrepreneur/activer/paiement",
  9: "/entrepreneur/activer/succes",
};

export type FunnelMode = "solo" | "alex";
export type ImportStatus = "pending" | "running" | "completed" | "failed";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface AIPPSubscore {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  icon?: string;
}

export interface ActivationFunnelState {
  id?: string;
  user_id?: string;
  mode: FunnelMode;
  current_screen: ActivationScreen;
  business_name: string;
  phone: string;
  email: string;
  website: string;
  import_status: ImportStatus;
  imported_data: Record<string, unknown>;
  aipp_score: {
    overall: number;
    subscores: AIPPSubscore[];
    found_items: string[];
    missing_items: string[];
  } | null;
  checklist_state: Record<string, { completed: boolean; data?: unknown }>;
  selected_services: string[];
  selected_zones: string[];
  media_uploads: Array<{ url: string; type: string; confirmed: boolean }>;
  preferences: Record<string, unknown>;
  calendar_connected: boolean;
  selected_plan: string | null;
  billing_cycle: "monthly" | "yearly" | null;
  stripe_session_id: string | null;
  payment_status: PaymentStatus;
  completed_at: string | null;
}

export const DEFAULT_ACTIVATION_STATE: ActivationFunnelState = {
  mode: "solo",
  current_screen: 1,
  business_name: "",
  phone: "",
  email: "",
  website: "",
  import_status: "pending",
  imported_data: {},
  aipp_score: null,
  checklist_state: {},
  selected_services: [],
  selected_zones: [],
  media_uploads: [],
  preferences: {},
  calendar_connected: false,
  selected_plan: null,
  billing_cycle: null,
  stripe_session_id: null,
  payment_status: "pending",
  completed_at: null,
};

export interface ChecklistSection {
  key: string;
  title: string;
  estimatedMinutes: number;
  impactLabel: string;
  completionPercent: number;
}

export const IMPORT_STEPS = [
  { key: "website", label: "Analyse du site web" },
  { key: "google", label: "Profil Google Business" },
  { key: "logo", label: "Détection du logo" },
  { key: "reviews", label: "Extraction des avis" },
  { key: "zones", label: "Zones de service" },
  { key: "services", label: "Catégories de services" },
  { key: "rbq", label: "Licence RBQ et classes" },
  { key: "media", label: "Images et médias" },
  { key: "neq", label: "Registre NEQ" },
  { key: "score", label: "Calcul du score AIPP" },
] as const;
