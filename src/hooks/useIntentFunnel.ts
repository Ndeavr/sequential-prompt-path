/**
 * useIntentFunnel — Intent detection, follow-up questions, DNA matching, ranking, booking slots.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──
export interface DetectedIntent {
  primary: string;
  secondary?: string;
  confidence: number;
  urgency: "low" | "medium" | "high" | "critical";
}

export interface FollowupQuestion {
  id: string;
  question: string;
  options?: string[];
  weight: number;
}

export interface DNABreakdown {
  service_fit: number;
  region: number;
  availability: number;
  reviews: number;
  language: number;
}

export interface MatchedContractor {
  id: string;
  business_name: string;
  score: number;
  breakdown: DNABreakdown;
  rank: number;
  specialty: string[];
  city: string;
  review_count: number;
  review_rating: number;
  verified: boolean;
  rbq?: string;
  neq?: string;
  avatar_url?: string;
}

export interface BookingSlot {
  id: string;
  date: string;
  time: string;
  slot_class: string;
  available: boolean;
}

// ── Mock Data ──
const MOCK_INTENTS: Record<string, DetectedIntent> = {
  default: { primary: "réparation_générale", secondary: "diagnostic", confidence: 0.72, urgency: "medium" },
  froid: { primary: "isolation", secondary: "chauffage", confidence: 0.91, urgency: "high" },
  humidité: { primary: "infiltration_eau", secondary: "ventilation", confidence: 0.88, urgency: "high" },
  toiture: { primary: "toiture", secondary: "inspection", confidence: 0.95, urgency: "medium" },
  urgence: { primary: "urgence_plomberie", secondary: "dégât_eau", confidence: 0.97, urgency: "critical" },
  isolation: { primary: "isolation", secondary: "économie_énergie", confidence: 0.93, urgency: "medium" },
  cuisine: { primary: "rénovation_cuisine", secondary: "design", confidence: 0.85, urgency: "low" },
};

const MOCK_QUESTIONS: Record<string, FollowupQuestion[]> = {
  isolation: [
    { id: "q1", question: "Quel type de propriété ?", options: ["Maison unifamiliale", "Condo", "Duplex", "Autre"], weight: 1.2 },
    { id: "q2", question: "Quelle zone est mal isolée ?", options: ["Grenier/combles", "Sous-sol", "Murs extérieurs", "Fenêtres"], weight: 1.5 },
    { id: "q3", question: "Superficie approximative ?", options: ["< 1000 pi²", "1000-2000 pi²", "2000-3000 pi²", "> 3000 pi²"], weight: 0.8 },
  ],
  toiture: [
    { id: "q1", question: "Quel est le problème principal ?", options: ["Fuite active", "Bardeaux abîmés", "Inspection préventive", "Remplacement complet"], weight: 1.5 },
    { id: "q2", question: "Âge approximatif de la toiture ?", options: ["< 10 ans", "10-20 ans", "20-30 ans", "> 30 ans"], weight: 1.0 },
    { id: "q3", question: "Type de revêtement actuel ?", options: ["Bardeaux d'asphalte", "Tôle/métal", "Membrane TPO", "Je ne sais pas"], weight: 0.7 },
  ],
  default: [
    { id: "q1", question: "Quel type de propriété ?", options: ["Maison unifamiliale", "Condo", "Duplex", "Autre"], weight: 1.0 },
    { id: "q2", question: "Dans quelle ville êtes-vous ?", options: ["Montréal", "Laval", "Longueuil", "Autre"], weight: 1.2 },
    { id: "q3", question: "C'est urgent ?", options: ["Oui, aujourd'hui", "Cette semaine", "Ce mois-ci", "Pas pressé"], weight: 1.3 },
  ],
};

const MOCK_CONTRACTORS: MatchedContractor[] = [
  {
    id: "c1", business_name: "Toiture Élite Laval", score: 94, rank: 1,
    breakdown: { service_fit: 0.95, region: 0.92, availability: 0.88, reviews: 0.96, language: 1.0 },
    specialty: ["toiture", "isolation"], city: "Laval", review_count: 127, review_rating: 4.8,
    verified: true, rbq: "5678-1234-01", neq: "1234567890",
  },
  {
    id: "c2", business_name: "Pro-Isolation Montréal", score: 87, rank: 2,
    breakdown: { service_fit: 0.90, region: 0.85, availability: 0.80, reviews: 0.90, language: 1.0 },
    specialty: ["isolation", "ventilation"], city: "Montréal", review_count: 89, review_rating: 4.6,
    verified: true, rbq: "9012-5678-01",
  },
  {
    id: "c3", business_name: "Services Résidentiels Rive-Nord", score: 79, rank: 3,
    breakdown: { service_fit: 0.82, region: 0.78, availability: 0.75, reviews: 0.82, language: 0.95 },
    specialty: ["rénovation", "plomberie"], city: "Terrebonne", review_count: 54, review_rating: 4.4,
    verified: false,
  },
];

const MOCK_SLOTS: BookingSlot[] = [
  { id: "s1", date: "2026-04-16", time: "09:00", slot_class: "morning", available: true },
  { id: "s2", date: "2026-04-16", time: "13:00", slot_class: "afternoon", available: true },
  { id: "s3", date: "2026-04-17", time: "10:00", slot_class: "morning", available: true },
  { id: "s4", date: "2026-04-17", time: "14:00", slot_class: "afternoon", available: false },
  { id: "s5", date: "2026-04-18", time: "09:00", slot_class: "morning", available: true },
  { id: "s6", date: "2026-04-18", time: "15:00", slot_class: "afternoon", available: true },
];

// ── Hooks ──

export function useDetectIntent() {
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<DetectedIntent | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const detect = useCallback(async (input: string, inputType: "text" | "voice" = "text") => {
    setLoading(true);
    try {
      const lower = input.toLowerCase();
      const matched = Object.entries(MOCK_INTENTS).find(([key]) => lower.includes(key));
      const detected = matched ? matched[1] : MOCK_INTENTS.default;

      // Try to create intent_session in DB
      let sid = `mock-${Date.now()}`;
      try {
        const { data: session } = await (supabase as any)
          .from("intent_sessions")
          .insert({ raw_input: input, detected_intent: detected.primary, confidence_score: detected.confidence, input_type: inputType })
          .select("id")
          .single();
        if (session?.id) sid = session.id;
      } catch { /* mock fallback */ }

      setIntent(detected);
      setSessionId(sid);
      return { intent: detected, sessionId: sid };
    } catch {
      const detected = MOCK_INTENTS.default;
      setIntent(detected);
      const sid = `mock-${Date.now()}`;
      setSessionId(sid);
      return { intent: detected, sessionId: sid };
    } finally {
      setLoading(false);
    }
  }, []);

  return { detect, intent, sessionId, loading };
}

export function useFollowupQuestions() {
  const getQuestions = useCallback((intentPrimary: string): FollowupQuestion[] => {
    return MOCK_QUESTIONS[intentPrimary] ?? MOCK_QUESTIONS.default;
  }, []);

  return { getQuestions };
}

export function useDNAMatchScore() {
  const [loading, setLoading] = useState(false);

  const computeScore = useCallback(async (
    _sessionId: string,
    _answers: Record<string, string>
  ): Promise<MatchedContractor[]> => {
    setLoading(true);
    // Mock: return pre-scored contractors
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    return MOCK_CONTRACTORS;
  }, []);

  return { computeScore, loading };
}

export function useRankContractors() {
  const rank = useCallback((contractors: MatchedContractor[], maxResults = 3): MatchedContractor[] => {
    return [...contractors]
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((c, i) => ({ ...c, rank: i + 1 }));
  }, []);

  return { rank };
}

export function useBookingSlots() {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<BookingSlot[]>([]);

  const fetchSlots = useCallback(async (_contractorId: string) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setSlots(MOCK_SLOTS);
    setLoading(false);
    return MOCK_SLOTS;
  }, []);

  const bookSlot = useCallback(async (
    contractorId: string,
    slotId: string,
    userId: string
  ) => {
    const slot = MOCK_SLOTS.find(s => s.id === slotId);
    if (!slot) throw new Error("Slot introuvable");

    const { error } = await supabase
      .from("booking_requests" as any)
      .insert({
        user_id: userId,
        contractor_id: contractorId,
        time_slot: `${slot.date}T${slot.time}:00`,
        status: "pending",
      } as any);

    if (error) throw error;
    return true;
  }, []);

  return { fetchSlots, bookSlot, slots, loading };
}
