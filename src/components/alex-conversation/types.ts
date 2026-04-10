/**
 * Types for Alex Conversational Lite page
 */

export interface ConversationMessage {
  id: string;
  role: "user" | "alex" | "system";
  content: string;
  cardType?: InlineCardType;
  cardData?: any;
  timestamp: number;
}

export type InlineCardType =
  | "entrepreneur"
  | "availability"
  | "urgency"
  | "project_suggestion"
  | "profile_completion"
  | "login_prompt"
  | "quote_comparison"
  | "passport_maison"
  | "no_match";

export interface MockContractor {
  id: string;
  name: string;
  specialty: string;
  city: string;
  score: number;
  badges: string[];
  delayDays: number;
  avatarUrl?: string;
}

export interface MockSlot {
  id: string;
  contractorId: string;
  start: string;
  end: string;
  label: string;
}

export const MOCK_CONTRACTORS: MockContractor[] = [
  {
    id: "c1",
    name: "Rénovations Prestige Montréal",
    specialty: "Plomberie résidentielle",
    city: "Montréal",
    score: 92,
    badges: ["Certifié UNPRO", "Top 10%"],
    delayDays: 2,
  },
  {
    id: "c2",
    name: "Pro-Électrique Laval",
    specialty: "Électricité générale",
    city: "Laval",
    score: 87,
    badges: ["Vérifié", "Réponse rapide"],
    delayDays: 3,
  },
  {
    id: "c3",
    name: "Toitures Québec Plus",
    specialty: "Toiture et isolation",
    city: "Québec",
    score: 84,
    badges: ["Certifié RBQ"],
    delayDays: 5,
  },
];

export const MOCK_SLOTS: MockSlot[] = [
  { id: "s1", contractorId: "c1", start: "2026-04-14T09:00", end: "2026-04-14T10:00", label: "Lun 14 avr · 9h" },
  { id: "s2", contractorId: "c1", start: "2026-04-14T14:00", end: "2026-04-14T15:00", label: "Lun 14 avr · 14h" },
  { id: "s3", contractorId: "c1", start: "2026-04-15T10:00", end: "2026-04-15T11:00", label: "Mar 15 avr · 10h" },
  { id: "s4", contractorId: "c2", start: "2026-04-16T08:00", end: "2026-04-16T09:00", label: "Mer 16 avr · 8h" },
];
