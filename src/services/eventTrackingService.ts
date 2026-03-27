/**
 * UNPRO — Platform Event Tracking Service
 * Reusable event tracking layer for observability.
 */
import { supabase } from "@/integrations/supabase/client";

export type EventCategory =
  | "search"
  | "property"
  | "auth"
  | "passport"
  | "score"
  | "grant"
  | "project"
  | "contractor"
  | "qr"
  | "contribution"
  | "seo"
  | "agent"
  | "map"
  | "matching"
  | "homepage_card"
  | "hero";

export interface TrackEventInput {
  eventType: string;
  category: EventCategory;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track a platform event. Fire-and-forget — never throws.
 */
export async function trackEvent(input: TrackEventInput, userId?: string) {
  try {
    await supabase.from("platform_events").insert([{
      event_type: input.eventType,
      event_category: input.category,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      user_id: userId || null,
      metadata: (input.metadata || {}) as any,
    }]);
  } catch {
    // Silent — observability should never break UX
  }
}

/**
 * Convenience helpers for common events.
 */
export const trackAddressSearch = (address: string, userId?: string) =>
  trackEvent({ eventType: "address_search", category: "search", metadata: { address } }, userId);

export const trackPropertyPageView = (propertyId: string, slug?: string, userId?: string) =>
  trackEvent({ eventType: "property_page_view", category: "property", entityType: "property", entityId: propertyId, metadata: { slug } }, userId);

export const trackClaimStart = (propertyId: string, userId: string) =>
  trackEvent({ eventType: "claim_start", category: "property", entityType: "property", entityId: propertyId }, userId);

export const trackClaimComplete = (propertyId: string, userId: string) =>
  trackEvent({ eventType: "claim_complete", category: "property", entityType: "property", entityId: propertyId }, userId);

export const trackPassportCompletion = (propertyId: string, pct: number, userId: string) =>
  trackEvent({ eventType: "passport_completion", category: "passport", entityType: "property", entityId: propertyId, metadata: { pct } }, userId);

export const trackScoreRecalculation = (propertyId: string, score: number, scoreType: string, userId?: string) =>
  trackEvent({ eventType: "score_recalculation", category: "score", entityType: "property", entityId: propertyId, metadata: { score, scoreType } }, userId);

export const trackGrantCheck = (propertyId: string, eligible: boolean, userId: string) =>
  trackEvent({ eventType: "grant_check", category: "grant", entityType: "property", entityId: propertyId, metadata: { eligible } }, userId);

export const trackProjectRequest = (projectId: string, category: string, userId: string) =>
  trackEvent({ eventType: "project_request", category: "project", entityType: "project", entityId: projectId, metadata: { category } }, userId);

export const trackContractorMatch = (projectId: string, contractorId: string, score: number, userId?: string) =>
  trackEvent({ eventType: "contractor_match", category: "matching", entityType: "project", entityId: projectId, metadata: { contractorId, score } }, userId);

export const trackQrScan = (qrId: string, qrType: string) =>
  trackEvent({ eventType: "qr_scan", category: "qr", entityType: "qr_code", entityId: qrId, metadata: { qrType } });

export const trackContributionApproval = (contributionId: string, approved: boolean, userId: string) =>
  trackEvent({ eventType: "contribution_approval", category: "contribution", entityType: "contribution", entityId: contributionId, metadata: { approved } }, userId);

export const trackSeoPageCreation = (pageType: string, slug: string) =>
  trackEvent({ eventType: "seo_page_creation", category: "seo", entityType: pageType, entityId: slug });

export const trackContractorPublicView = (contractorId: string) =>
  trackEvent({ eventType: "contractor_public_view", category: "contractor", entityType: "contractor", entityId: contractorId });
