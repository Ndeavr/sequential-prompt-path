/**
 * recommendationsBySurface — returns the top recommendations for a UNPRO surface.
 * Pure deterministic, registry + engine driven.
 */
import { SMART_CONTEXT_REGISTRY } from "./registry";
import { recommend } from "@/services/smartRecommendationEngine";
import type { SmartContextEntry, SmartContextRuntime } from "./types";

export type SmartSurface = "plans" | "dashboard" | "profile" | "automation" | "territory";

const SURFACE_FIELDS: Record<SmartSurface, string[]> = {
  plans: [
    "plan.tier",
    "plan.appointments_per_month",
    "plan.exclusivity",
    "plan.upsell_xl",
    "access.xl_projects",
  ],
  dashboard: [
    "dashboard.acceptance_rate",
    "dashboard.response_time",
    "dashboard.conversion_rate",
    "dashboard.projected_revenue",
    "dashboard.aipp_score",
    "dashboard.profile_views",
  ],
  profile: [
    "profile.photos_before_after",
    "profile.bio_length",
    "profile.services_offered",
    "profile.certifications",
    "profile.years_experience",
    "profile.languages",
    "profile.verification",
  ],
  automation: [
    "automation.auto_accept_bookings",
    "operations.calendar_sync",
    "automation.sms_followup",
    "automation.review_request",
    "automation.no_show_protection",
    "automation.quote_auto_send",
    "automation.smart_pricing",
  ],
  territory: ["territory.radius_km", "territory.cities"],
};

const KIND_WEIGHT: Record<string, number> = {
  capacity_warning: 5,
  upgrade: 4,
  opportunity: 3,
  recommended: 2,
  visibility: 2,
  high_demand: 2,
  not_recommended: 1,
};

export interface SurfaceRecommendation {
  entry: SmartContextEntry;
  recommendation: ReturnType<typeof recommend>;
  weight: number;
}

export function getRecommendationsForSurface(
  surface: SmartSurface,
  ctx: SmartContextRuntime = {},
  limit = 3,
): SurfaceRecommendation[] {
  const ids = SURFACE_FIELDS[surface] ?? [];
  const out: SurfaceRecommendation[] = [];
  for (const id of ids) {
    const entry = SMART_CONTEXT_REGISTRY[id];
    if (!entry) continue;
    const r = recommend(id, ctx) ?? entry.recommendation ?? null;
    if (!r) continue;
    const weight = KIND_WEIGHT[r.kind] ?? 0;
    out.push({ entry, recommendation: r, weight });
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, limit);
}

export function listSurfaceFields(surface: SmartSurface): string[] {
  return SURFACE_FIELDS[surface] ?? [];
}

export function listAllSurfaces(): SmartSurface[] {
  return Object.keys(SURFACE_FIELDS) as SmartSurface[];
}
