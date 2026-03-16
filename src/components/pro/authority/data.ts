/**
 * UNPRO Authority Score — Mock data & types
 */
import { Camera, MessageSquare, MapPin, ShieldCheck } from "lucide-react";

export const SCORE_TOTAL = 1000;
export const SCORE_CURRENT = 400;
export const SCORE_POTENTIAL = 620;

export interface ScoreFactor {
  key: string;
  label: string;
  value: number;
  max: number;
  color: string;
}

export const factors: ScoreFactor[] = [
  { key: "expertise", label: "Expertise", value: 160, max: 250, color: "hsl(234 89% 74%)" },
  { key: "activite", label: "Activité", value: 90, max: 150, color: "hsl(222 100% 65%)" },
  { key: "zone", label: "Zone desservie", value: 80, max: 150, color: "hsl(185 80% 55%)" },
  { key: "ia", label: "Priorité IA", value: 30, max: 200, color: "hsl(265 85% 68%)" },
  { key: "rarete", label: "Rareté", value: 25, max: 150, color: "hsl(38 85% 55%)" },
  { key: "credibilite", label: "Crédibilité", value: 15, max: 100, color: "hsl(152 69% 50%)" },
];

export const suggestions = [
  {
    points: 40,
    title: "Ajouter 5 photos de projets",
    desc: "Montrez vos réalisations réelles pour renforcer votre expertise.",
    icon: Camera,
  },
  {
    points: 30,
    title: "Répondre aux avis Google",
    desc: "Un profil actif inspire davantage confiance.",
    icon: MessageSquare,
  },
  {
    points: 50,
    title: "Compléter les villes desservies",
    desc: "Améliorez votre couverture et vos opportunités de correspondance.",
    icon: MapPin,
  },
  {
    points: 100,
    title: "Renforcer les preuves de crédibilité",
    desc: "Ajoutez licences, certifications, années d'expérience et éléments de confiance.",
    icon: ShieldCheck,
  },
];

export const historyData = [
  { month: "Jan", score: 280, type: "actual" },
  { month: "Fév", score: 310, type: "actual" },
  { month: "Mar", score: 355, type: "actual" },
  { month: "Avr", score: 400, type: "actual" },
  { month: "Proj.", score: 470, type: "projection" },
  { month: "Opt.", score: 620, type: "projection" },
];

export const projectionSteps = [
  { label: "Ajouter 5 photos de projets", points: 40 },
  { label: "Répondre aux avis Google", points: 30 },
  { label: "Compléter les villes desservies", points: 50 },
  { label: "Renforcer les preuves de crédibilité", points: 100 },
];

export const radarData = [
  { axis: "Expertise", value: 64 },
  { axis: "Activité", value: 60 },
  { axis: "Zone", value: 53 },
  { axis: "Priorité IA", value: 15 },
  { axis: "Rareté", value: 17 },
  { axis: "Crédibilité", value: 15 },
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
