/**
 * UNPRO — Dynamic Pricing Engine + Command Center Types
 */

// ─── Types ───

export type LeadHeatLevel = "cold" | "warm" | "hot" | "on_fire";

export type PipelineStage =
  | "imported"
  | "enriched"
  | "ready"
  | "sent"
  | "engaged"
  | "audit_started"
  | "audit_completed"
  | "checkout_started"
  | "converted"
  | "lost";

export type RecommendedActionCode =
  | "send_first_touch"
  | "resend"
  | "call_now"
  | "sms_now"
  | "send_email"
  | "review_audit"
  | "push_checkout"
  | "pause";

export type CommandCenterLead = {
  id: string;
  businessName: string;
  city: string | null;
  category: string | null;
  stage: PipelineStage;
  sniperPriorityScore: number | null;
  heatScore: number | null;
  heatLevel: LeadHeatLevel;
  founderEligible: boolean;
  aippScore: number | null;
  lastActivityAt: string | null;
  lastActivityLabel: string | null;
  recommendedAction: RecommendedActionCode;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
};

export type PipelineColumn = {
  stage: PipelineStage;
  label: string;
  count: number;
  deltaVsYesterday: number;
  leads: CommandCenterLead[];
};

export type RepActionItem = {
  id: string;
  businessName: string;
  reason: string;
  action: RecommendedActionCode;
  urgency: "low" | "medium" | "high";
};

export type TerritoryGapRow = {
  city: string;
  category: string;
  activeCount: number;
  targetCount: number;
  gap: number;
  hotLeads: number;
  conversions: number;
  founderSlotsRemaining: number | null;
};

export type CampaignPerformanceRow = {
  campaignName: string;
  channel: string;
  city: string | null;
  category: string | null;
  sent: number;
  opens: number;
  clicks: number;
  pageViews: number;
  auditStarts: number;
  checkoutStarts: number;
  conversions: number;
  revenue: number;
};

export type CommandCenterKpis = {
  targetsImported: number;
  sent: number;
  engaged: number;
  auditsStarted: number;
  checkoutStarts: number;
  converted: number;
  revenue: number;
  revenuePer100Targets: number;
};

export type CommandCenterEvent = {
  id: string;
  label: string;
  businessName: string;
  eventType: string;
  timestamp: string;
};

export type CommandCenterViewModel = {
  kpis: CommandCenterKpis;
  hotLeads: CommandCenterLead[];
  pipeline: PipelineColumn[];
  repActions: RepActionItem[];
  territoryGaps: TerritoryGapRow[];
  campaignPerformance: CampaignPerformanceRow[];
  recentEvents: CommandCenterEvent[];
};

// ─── Pricing Types ───

export type PricingModifier = {
  key: string;
  label: string;
  amount: number;
  type: "increase" | "decrease" | "override";
};

export type PricingRecommendation = {
  recommendedPlan: "recrue" | "pro" | "premium" | "elite" | "signature";
  recommendedBilling: "monthly" | "annual" | "one_time_founder";
  basePrice: number;
  adjustedPrice: number;
  originalPrice?: number | null;
  founderPrice?: number | null;
  pricingModifiers: PricingModifier[];
  rationale: string[];
  urgencyLabel?: string | null;
  founderOfferVisible: boolean;
};

export type PlanCode = "recrue" | "pro" | "premium" | "elite" | "signature";

// ─── Base Pricing ───

export const BASE_PLAN_PRICES: Record<PlanCode, { monthly: number; annual: number; name: string }> = {
  recrue: { monthly: 149, annual: 1490, name: "Recrue" },
  pro: { monthly: 349, annual: 3490, name: "Pro" },
  premium: { monthly: 599, annual: 5990, name: "Premium" },
  elite: { monthly: 999, annual: 9990, name: "Élite" },
  signature: { monthly: 1799, annual: 17990, name: "Signature" },
};

export const FOUNDER_OFFERS: Partial<Record<string, number>> = {
  elite_founder_10y: 9900,
  signature_founder_10y: 19900,
  premium_founder_10y: 5900,
};

const PLAN_ORDER: PlanCode[] = ["recrue", "pro", "premium", "elite", "signature"];

// ─── Plan Recommendation ───

export type PlanRecommendationInput = {
  aippScore: number;
  averageJobValue: number;
  desiredAppointments: number;
  serviceAreaCount: number;
  goal: "visibility" | "appointments" | "conversion" | "territory" | "ai_presence";
};

export function recommendPlan(input: PlanRecommendationInput): PlanCode {
  if (
    input.goal === "territory" ||
    input.desiredAppointments >= 40 ||
    input.averageJobValue >= 12000 ||
    input.serviceAreaCount >= 5
  ) return "signature";

  if (input.desiredAppointments >= 20 || input.averageJobValue >= 6000) return "elite";

  if (
    input.aippScore >= 60 ||
    input.desiredAppointments >= 10 ||
    input.serviceAreaCount >= 2
  ) return "premium";

  if (
    input.aippScore >= 35 ||
    input.goal === "conversion" ||
    input.goal === "ai_presence"
  ) return "pro";

  return "recrue";
}

// ─── Adjusted Pricing ───

export function computeAdjustedPrice(basePrice: number, modifierPercents: number[]): number {
  const rawMultiplier = modifierPercents.reduce((acc, m) => acc + m, 1);
  const cappedMultiplier = Math.min(rawMultiplier, 1.25);
  return Math.round(basePrice * cappedMultiplier);
}

export type DynamicPricingInput = PlanRecommendationInput & {
  categoryModifier?: number;
  territoryModifier?: number;
  scarcityModifier?: number;
  founderEligible?: boolean;
  founderClusterStatus?: "open" | "warming" | "limited" | "locked";
  founderSlotsRemaining?: number;
  billingPreference?: "monthly" | "annual";
};

export function buildPricingRecommendation(input: DynamicPricingInput): PricingRecommendation {
  const plan = recommendPlan(input);
  const billing = input.billingPreference || (input.aippScore >= 60 ? "annual" : "monthly");
  const basePrice = BASE_PLAN_PRICES[plan][billing === "annual" ? "annual" : "monthly"];

  const modifiers: PricingModifier[] = [];
  const modPercents: number[] = [];

  if (input.categoryModifier && input.categoryModifier > 0) {
    modifiers.push({ key: "category", label: "Valeur de catégorie", amount: input.categoryModifier, type: "increase" });
    modPercents.push(input.categoryModifier);
  }
  if (input.territoryModifier && input.territoryModifier > 0) {
    modifiers.push({ key: "territory", label: "Demande territoriale", amount: input.territoryModifier, type: "increase" });
    modPercents.push(input.territoryModifier);
  }
  if (input.scarcityModifier && input.scarcityModifier > 0) {
    modifiers.push({ key: "scarcity", label: "Rareté du marché", amount: input.scarcityModifier, type: "increase" });
    modPercents.push(input.scarcityModifier);
  }

  const adjustedPrice = computeAdjustedPrice(basePrice, modPercents);

  // Rationale
  const rationale: string[] = [];
  if (input.aippScore < 40) rationale.push("Votre potentiel local est réel mais sous-exploité");
  else rationale.push("Vos signaux actuels justifient un plan de croissance réel");
  if (input.desiredAppointments >= 10) rationale.push("Votre volume cible dépasse un plan de base");
  if (input.territoryModifier && input.territoryModifier > 0) rationale.push("Votre territoire présente une bonne valeur");

  // Founder logic
  const founderVisible = !!(
    input.founderEligible &&
    input.founderClusterStatus &&
    ["open", "warming", "limited"].includes(input.founderClusterStatus)
  );

  let founderPrice: number | null = null;
  let urgencyLabel: string | null = null;

  if (founderVisible) {
    const founderKey = `${plan}_founder_10y`;
    founderPrice = FOUNDER_OFFERS[founderKey] || null;
    if (input.founderClusterStatus === "limited" && input.founderSlotsRemaining != null) {
      urgencyLabel = `Il reste ${input.founderSlotsRemaining} place${input.founderSlotsRemaining > 1 ? "s" : ""} fondatrice${input.founderSlotsRemaining > 1 ? "s" : ""}`;
    }
    if (founderPrice) {
      rationale.length = 0;
      rationale.push("Votre cluster est prioritaire");
      rationale.push("Votre profil est admissible à une position fondatrice");
      if (input.founderSlotsRemaining != null) {
        rationale.push(`${input.founderSlotsRemaining} place${input.founderSlotsRemaining > 1 ? "s" : ""} disponible${input.founderSlotsRemaining > 1 ? "s" : ""}`);
      }
    }
  }

  return {
    recommendedPlan: plan,
    recommendedBilling: founderVisible && founderPrice ? "one_time_founder" : billing,
    basePrice,
    adjustedPrice,
    originalPrice: adjustedPrice !== basePrice ? basePrice : null,
    founderPrice,
    pricingModifiers: modifiers,
    rationale: rationale.slice(0, 3),
    urgencyLabel,
    founderOfferVisible: founderVisible,
  };
}

// ─── Compare Plans ───

export function getComparePlans(recommended: PlanCode): PlanCode[] {
  const idx = PLAN_ORDER.indexOf(recommended);
  const lower = idx > 0 ? PLAN_ORDER[idx - 1] : null;
  const higher = idx < PLAN_ORDER.length - 1 ? PLAN_ORDER[idx + 1] : null;
  return [lower, recommended, higher].filter(Boolean) as PlanCode[];
}

// ─── Heat Level ───

export function getHeatLevel(score: number): LeadHeatLevel {
  if (score >= 70) return "on_fire";
  if (score >= 40) return "hot";
  if (score >= 20) return "warm";
  return "cold";
}

export function getHeatLabelFr(level: LeadHeatLevel): string {
  switch (level) {
    case "on_fire": return "Brûlant";
    case "hot": return "Chaud";
    case "warm": return "Tiède";
    case "cold": return "Froid";
  }
}

export function getHeatColor(level: LeadHeatLevel): string {
  switch (level) {
    case "on_fire": return "text-red-400";
    case "hot": return "text-orange-400";
    case "warm": return "text-yellow-400";
    case "cold": return "text-blue-400";
  }
}

// ─── Recommended Action Engine ───

export function getRecommendedAction(input: {
  heatScore: number;
  stage: string;
  founderEligible: boolean;
  checkoutStarted: boolean;
  auditCompleted: boolean;
  planViewed: boolean;
}): RecommendedActionCode {
  if (input.checkoutStarted && input.heatScore >= 60) return "call_now";
  if (input.auditCompleted && input.planViewed) return "sms_now";
  if (input.founderEligible && input.heatScore >= 40) return "call_now";
  if (input.stage === "engaged") return "review_audit";
  if (input.stage === "ready" || input.stage === "enriched") return "send_first_touch";
  if (input.stage === "sent") return "resend";
  return "send_email";
}

export function getActionLabelFr(action: RecommendedActionCode): string {
  switch (action) {
    case "call_now": return "Appeler";
    case "sms_now": return "SMS";
    case "send_email": return "Email";
    case "send_first_touch": return "Lancer";
    case "resend": return "Relancer";
    case "review_audit": return "Voir audit";
    case "push_checkout": return "Checkout";
    case "pause": return "Pause";
  }
}

// ─── Pipeline Stage Labels ───

export const PIPELINE_STAGES: { stage: PipelineStage; label: string }[] = [
  { stage: "imported", label: "Importés" },
  { stage: "enriched", label: "Enrichis" },
  { stage: "ready", label: "Prêts" },
  { stage: "sent", label: "Envoyés" },
  { stage: "engaged", label: "Engagés" },
  { stage: "audit_started", label: "Audit lancé" },
  { stage: "audit_completed", label: "Audit terminé" },
  { stage: "checkout_started", label: "Checkout" },
  { stage: "converted", label: "Convertis" },
  { stage: "lost", label: "Perdus" },
];

// ─── Event Labels ───

export function getEventLabelFr(eventType: string): string {
  const map: Record<string, string> = {
    page_view: "a vu sa page",
    identity_confirmed: "a confirmé son identité",
    audit_started: "a lancé son audit",
    audit_completed: "a terminé son audit",
    plan_viewed: "a vu son plan recommandé",
    checkout_started: "a démarré le checkout",
    conversion_completed: "s'est converti",
    email_opened: "a ouvert l'email",
    email_clicked: "a cliqué dans l'email",
    sms_clicked: "a cliqué le SMS",
  };
  return map[eventType] || eventType;
}

// ─── Stage Mapping from outreach_status ───

export function mapOutreachStatusToStage(status: string): PipelineStage {
  const map: Record<string, PipelineStage> = {
    not_started: "imported",
    enriching: "imported",
    enriched: "enriched",
    page_ready: "ready",
    message_ready: "ready",
    queued: "sent",
    sent: "sent",
    engaged: "engaged",
    audit_started: "audit_started",
    audit_completed: "audit_completed",
    checkout_started: "checkout_started",
    converted: "converted",
    lost: "lost",
    paused: "lost",
  };
  return map[status] || "imported";
}
