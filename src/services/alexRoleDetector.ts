/**
 * AlexRoleDetector — Automatically detects user role from conversation signals
 * and adapts Alex's tone, flow, and UI accordingly.
 */

import { detectEntrepreneurIntent, ENTREPRENEUR_SIGNALS } from "@/services/alexEntrepreneurGuidanceEngine";
import { detectCondoManagerIntent, CONDO_SIGNALS } from "@/services/alexCondoManagerGuidanceEngine";

export type AlexUserRole = "homeowner" | "entrepreneur" | "condo_manager";

export interface RoleDetectionResult {
  role: AlexUserRole;
  confidence: number;
  signals: string[];
}

// ─── Homeowner signals ───
const HOMEOWNER_SIGNALS = [
  "ma maison", "mon toit", "fuite", "rénovation", "ma cuisine",
  "ma salle de bain", "problème", "réparation", "soumission",
  "j'ai besoin", "mon plancher", "humidité", "moisissure",
  "fenêtre", "porte", "chauffage", "climatisation", "drain",
  "fondation", "isolation", "peinture", "urgent",
];

export function detectUserRole(messages: string[]): RoleDetectionResult {
  const combined = messages.join(" ").toLowerCase();

  let entrepreneurScore = 0;
  let condoScore = 0;
  let homeownerScore = 0;
  const matchedSignals: string[] = [];

  ENTREPRENEUR_SIGNALS.forEach(s => {
    if (combined.includes(s)) { entrepreneurScore += 10; matchedSignals.push(s); }
  });

  CONDO_SIGNALS.forEach(s => {
    if (combined.includes(s)) { condoScore += 10; matchedSignals.push(s); }
  });

  HOMEOWNER_SIGNALS.forEach(s => {
    if (combined.includes(s)) { homeownerScore += 5; matchedSignals.push(s); }
  });

  // Default bias toward homeowner (primary persona)
  homeownerScore += 15;

  const total = entrepreneurScore + condoScore + homeownerScore || 1;

  if (entrepreneurScore > condoScore && entrepreneurScore > homeownerScore) {
    return { role: "entrepreneur", confidence: entrepreneurScore / total, signals: matchedSignals };
  }
  if (condoScore > entrepreneurScore && condoScore > homeownerScore) {
    return { role: "condo_manager", confidence: condoScore / total, signals: matchedSignals };
  }
  return { role: "homeowner", confidence: homeownerScore / total, signals: matchedSignals };
}

// ─── Tone configuration per role ───

export interface AlexToneConfig {
  style: string;
  greeting: string;
  quickReplies: string[];
  urgencyWords: string[];
}

const TONE_CONFIGS: Record<AlexUserRole, AlexToneConfig> = {
  homeowner: {
    style: "simple, rassurant, pédagogique",
    greeting: "Oui, je vous écoute.",
    quickReplies: ["Toiture", "Cuisine", "Plomberie", "Urgent", "Cette semaine"],
    urgencyWords: ["urgent", "fuite", "brisé", "inondation", "cassé"],
  },
  entrepreneur: {
    style: "ROI, croissance, efficacité, stratégique",
    greeting: "Bienvenue. Parlons de votre croissance.",
    quickReplies: ["Plus de clients", "Mon score AIPP", "Plans & prix", "Mon profil", "Rendez-vous"],
    urgencyWords: ["maintenant", "vite", "immédiatement", "cette semaine"],
  },
  condo_manager: {
    style: "structuré, rigoureux, conformité, planification",
    greeting: "Bonjour. Comment puis-je aider votre copropriété ?",
    quickReplies: ["Loi 16", "Entretien", "Documents", "Fonds de prévoyance", "Trouver un pro"],
    urgencyWords: ["urgence", "conformité", "échéance", "obligatoire"],
  },
};

export function getToneConfig(role: AlexUserRole): AlexToneConfig {
  return TONE_CONFIGS[role];
}

export function getGreetingForRole(role: AlexUserRole, firstName?: string): string {
  if (firstName) {
    const greetings: Record<AlexUserRole, string> = {
      homeowner: `Bonjour ${firstName}. Comment je peux vous aider ?`,
      entrepreneur: `Bonjour ${firstName}. Parlons de votre croissance.`,
      condo_manager: `Bonjour ${firstName}. Comment va votre copropriété ?`,
    };
    return greetings[role];
  }
  return TONE_CONFIGS[role].greeting;
}
