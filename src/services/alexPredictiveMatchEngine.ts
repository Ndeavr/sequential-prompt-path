/**
 * AlexPredictiveMatchEngine — Real-time intent detection + predictive matching.
 * Starts matching before conversation ends.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Intent Detection ───

export type DetectedIntent =
  | "info_seek"
  | "exploration"
  | "high_intent_booking"
  | "price_sensitive"
  | "trust_needs_reassurance"
  | "no_match_recovery";

export interface IntentSignals {
  mentionedService?: string;
  mentionedCity?: string;
  mentionedUrgency?: boolean;
  mentionedBudget?: boolean;
  askedAboutPrice?: boolean;
  askedAboutTrust?: boolean;
  expressedReadiness?: boolean;
  messageCount: number;
}

export interface IntentResult {
  intent: DetectedIntent;
  confidence: number;
  urgency: number;
  trust: number;
  bookingReadiness: number;
  friction: number;
}

export function detectUserIntent(signals: IntentSignals): IntentResult {
  let intent: DetectedIntent = "info_seek";
  let confidence = 0.3;
  let urgency = 0;
  let trust = 0.5;
  let bookingReadiness = 0;
  let friction = 0.3;

  if (signals.expressedReadiness && signals.mentionedService) {
    intent = "high_intent_booking";
    confidence = 0.85;
    bookingReadiness = 0.8;
    friction = 0.1;
  } else if (signals.askedAboutPrice || signals.mentionedBudget) {
    intent = "price_sensitive";
    confidence = 0.7;
    bookingReadiness = 0.4;
    friction = 0.4;
  } else if (signals.askedAboutTrust) {
    intent = "trust_needs_reassurance";
    confidence = 0.7;
    trust = 0.3;
    friction = 0.5;
  } else if (signals.mentionedService && signals.mentionedCity) {
    intent = "exploration";
    confidence = 0.6;
    bookingReadiness = 0.5;
  }

  if (signals.mentionedUrgency) {
    urgency = 0.8;
    bookingReadiness = Math.min(1, bookingReadiness + 0.2);
  }

  if (signals.messageCount > 5) {
    confidence = Math.min(1, confidence + 0.1);
  }

  return { intent, confidence, urgency, trust, bookingReadiness, friction };
}

// ─── Predictive Match ───

export interface PredictiveMatch {
  contractorId: string;
  businessName: string;
  matchScore: number;
  availabilityScore: number;
  explanationSummary: string;
}

export async function buildPredictiveMatches(params: {
  serviceType?: string;
  city?: string;
  sessionId: string;
}): Promise<PredictiveMatch[]> {
  // Query contractors matching service + city
  const baseQuery = supabase
    .from("contractors")
    .select("id, business_name, specialty, city, aipp_score, admin_verified")
    .eq("status", "active")
    .order("aipp_score", { ascending: false })
    .limit(5);

  const { data: contractors } = params.city
    ? await baseQuery.ilike("city", `%${params.city}%`)
    : await baseQuery;
  if (!contractors?.length) return [];

  const matches: PredictiveMatch[] = contractors.map((c, i) => ({
    contractorId: c.id,
    businessName: c.business_name || "Professionnel",
    matchScore: Math.max(0.5, 1 - i * 0.1),
    availabilityScore: Math.random() * 0.4 + 0.6, // Mock availability
    explanationSummary: buildExplanation(c),
  }));

  // Persist top matches
  const inserts = matches.slice(0, 3).map((m) => ({
    session_id: params.sessionId,
    contractor_id: m.contractorId,
    match_score: m.matchScore,
    availability_score: m.availabilityScore,
    confidence_score: m.matchScore * 0.8,
    explanation_summary: m.explanationSummary,
  }));

  await (supabase.from("alex_predictive_matches") as any).insert(inserts);

  return matches;
}

function buildExplanation(contractor: any): string {
  const parts: string[] = [];
  if (contractor.admin_verified) parts.push("Vérifié par UnPRO");
  if (contractor.aipp_score && contractor.aipp_score >= 70) parts.push("Score AIPP élevé");
  if (contractor.city) parts.push(`Actif dans ${contractor.city}`);
  return parts.join(" · ") || "Professionnel disponible";
}

// ─── Score Booking Readiness ───

export function scoreBookingReadiness(intent: IntentResult, hasMatch: boolean): number {
  let score = intent.bookingReadiness;
  if (hasMatch) score = Math.min(1, score + 0.2);
  if (intent.urgency > 0.5) score = Math.min(1, score + 0.1);
  if (intent.friction > 0.5) score = Math.max(0, score - 0.15);
  return Math.round(score * 100) / 100;
}
