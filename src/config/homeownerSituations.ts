/**
 * Homeowner Situations — the 8 entry points on the new Intelligence homepage.
 * Situations, NOT trades. Each card routes to either a dedicated page or opens
 * Alex with a pre-filled intent hint.
 */
import {
  Camera,
  FileSearch,
  ShieldCheck,
  Home,
  Hammer,
  AlertTriangle,
  Zap,
  Building2,
  type LucideIcon,
} from "lucide-react";

export type SituationAction =
  | { kind: "route"; href: string }
  | { kind: "alex"; intent: string; hint: string };

export interface HomeownerSituation {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string; // tailwind class for glow tint
  action: SituationAction;
}

export const HOMEOWNER_SITUATIONS: HomeownerSituation[] = [
  {
    id: "diagnostic",
    title: "Diagnostic visuel IA",
    subtitle: "Photo, vidéo ou capture — analyse en quelques secondes.",
    icon: Camera,
    accent: "from-sky-500/30 to-cyan-400/10",
    action: { kind: "route", href: "/diagnostic" },
  },
  {
    id: "quote",
    title: "Vérifier une soumission",
    subtitle: "L'IA détecte les manques, anomalies et risques cachés.",
    icon: FileSearch,
    accent: "from-violet-500/30 to-fuchsia-400/10",
    action: { kind: "route", href: "/compare" },
  },
  {
    id: "verify-pro",
    title: "Vérifier un entrepreneur",
    subtitle: "Réputation, conformité, AIPP — Alex valide pour vous.",
    icon: ShieldCheck,
    accent: "from-emerald-500/30 to-teal-400/10",
    action: {
      kind: "alex",
      intent: "verify_pro",
      hint: "Je veux vérifier un entrepreneur avant d'engager.",
    },
  },
  {
    id: "passeport",
    title: "Passeport Maison",
    subtitle: "Mémoire vivante de votre propriété, alertes proactives.",
    icon: Home,
    accent: "from-amber-500/30 to-orange-400/10",
    action: { kind: "route", href: "/passeport" },
  },
  {
    id: "reno",
    title: "Planifier une rénovation",
    subtitle: "Alex cadre le projet, budget et professionnels.",
    icon: Hammer,
    accent: "from-blue-500/30 to-indigo-400/10",
    action: {
      kind: "alex",
      intent: "plan_reno",
      hint: "Je planifie une rénovation.",
    },
  },
  {
    id: "urgent",
    title: "Problème urgent",
    subtitle: "Infiltration, panne, dégât — triage immédiat.",
    icon: AlertTriangle,
    accent: "from-red-500/35 to-rose-400/10",
    action: {
      kind: "alex",
      intent: "urgency",
      hint: "J'ai une situation urgente à la maison.",
    },
  },
  {
    id: "energy",
    title: "Économies d'énergie",
    subtitle: "Hydro élevé? Alex identifie les bons gestes.",
    icon: Zap,
    accent: "from-yellow-500/30 to-amber-400/10",
    action: {
      kind: "alex",
      intent: "energy",
      hint: "Je veux réduire ma facture d'énergie.",
    },
  },
  {
    id: "condo",
    title: "Condo / Loi 16",
    subtitle: "Conformité, fonds de prévoyance, interventions communes.",
    icon: Building2,
    accent: "from-slate-400/30 to-zinc-400/10",
    action: { kind: "route", href: "/condo" },
  },
];
