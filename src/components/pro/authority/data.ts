/**
 * UNPRO Authority Score V2 — Updated data layer
 * Now uses 8 real performance dimensions instead of 6 vanity metrics.
 */
import type { AuthorityDimensions } from "@/services/authorityScoreV2";
import { DIMENSION_META, TIER_META } from "@/services/authorityScoreV2";
import { Camera, MessageSquare, MapPin, ShieldCheck, Zap, Clock, Users, Target } from "lucide-react";

export { DIMENSION_META, TIER_META };
export const SCORE_TOTAL = 100;

export interface ScoreFactorV2 {
  key: keyof AuthorityDimensions;
  label: string;
  value: number;
  weight: number;
  color: string;
}

export function dimensionsToFactors(dims: AuthorityDimensions): ScoreFactorV2[] {
  return (Object.keys(DIMENSION_META) as (keyof AuthorityDimensions)[]).map((key) => ({
    key,
    label: DIMENSION_META[key].label,
    value: dims[key],
    weight: DIMENSION_META[key].weight,
    color: DIMENSION_META[key].color,
  }));
}

export const suggestions = [
  {
    points: 8,
    title: "Compléter 3 projets sans annulation",
    desc: "Améliorez votre taux de complétion pour renforcer votre score de performance.",
    icon: Target,
  },
  {
    points: 6,
    title: "Obtenir 5 avis vérifiés",
    desc: "Les avis vérifiés récents ont un impact majeur sur la qualité perçue.",
    icon: MessageSquare,
  },
  {
    points: 5,
    title: "Répondre aux leads en moins de 30 min",
    desc: "La réactivité améliore directement votre score et votre priorité de matching.",
    icon: Clock,
  },
  {
    points: 4,
    title: "Collaborer avec des sous-traitants fiables",
    desc: "Renforcez votre réseau de partenaires pour améliorer votre score réseau.",
    icon: Users,
  },
];

export const sidebarItems = [
  { label: "Vue d'ensemble", icon: "LayoutDashboard", href: "/pro" },
  { label: "Authority Score", icon: "Zap", href: "/pro/authority-score", active: true },
  { label: "Visibilité", icon: "Eye", href: "/pro/aipp" },
  { label: "Recommandations Alex", icon: "Brain", href: "/pro/alex" },
  { label: "Rendez-vous", icon: "CalendarCheck", href: "/pro/appointments" },
  { label: "Profil public", icon: "User", href: "/pro/profile" },
  { label: "Crédibilité", icon: "ShieldCheck", href: "/pro/reviews" },
  { label: "Paramètres", icon: "Settings", href: "/pro/account" },
];
