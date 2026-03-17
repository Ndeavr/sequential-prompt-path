/**
 * UNPRO — Growth Flywheel Connector
 * Wires together existing modules into the autonomous growth loop.
 * 
 * Loop: Problem Graph → SEO Pages → Visitors → Insights → Design AI → 
 *       Project Creation → Matching → Completed Projects → 
 *       Transformation Feed → Authority Score → More SEO Content
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Flywheel Event Types ────────────────────────────────────────
export type FlywheelSignal =
  | "seo_page_viewed"           // Visitor lands on SEO page
  | "design_started_from_seo"   // Design AI opened from SEO context
  | "design_completed"          // Design version generated
  | "project_created_from_design" // Design → Project conversion
  | "contractor_matched"        // Matching engine assigned contractor
  | "project_completed"         // Work done
  | "transformation_published"  // Before/after published
  | "authority_score_updated"   // Score recalculated
  | "content_generated";        // New SEO content created

interface FlywheelEvent {
  signal: FlywheelSignal;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track a flywheel signal — fire-and-forget, non-blocking.
 * These events feed into the growth_events table for the dashboard.
 */
export function trackFlywheelSignal(event: FlywheelEvent) {
  supabase
    .from("growth_events")
    .insert([{
      event_type: event.signal,
      source_engine: "flywheel_connector",
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      title: formatSignalTitle(event),
      metadata: event.metadata ?? {},
      status: "auto_completed",
    }])
    .then(({ error }) => {
      if (error) console.warn("[Flywheel]", error.message);
    });
}

/**
 * Build Design AI URL with SEO page context pre-filled.
 * Used on SEO pages to connect visitors to the Design module.
 */
export function buildDesignUrl(context: {
  problemSlug?: string;
  roomType?: string;
  solutionStyle?: string;
  citySlug?: string;
}): string {
  const params = new URLSearchParams();
  if (context.problemSlug) params.set("context", context.problemSlug);
  if (context.roomType) params.set("room", context.roomType);
  if (context.solutionStyle) params.set("style", context.solutionStyle);
  if (context.citySlug) params.set("city", context.citySlug);
  return `/design?${params.toString()}`;
}

/**
 * Map a problem category to a Design AI room type for context bridging.
 */
export function problemToRoomType(problemCategory: string): string {
  const mapping: Record<string, string> = {
    toiture: "exterior",
    plomberie: "bathroom",
    electricite: "living_room",
    isolation: "attic",
    fondation: "basement",
    cuisine: "kitchen",
    salle_de_bain: "bathroom",
    sous_sol: "basement",
    fenetre: "living_room",
    chauffage: "living_room",
    climatisation: "living_room",
    peinture: "living_room",
    plancher: "living_room",
    terrasse: "exterior",
  };
  return mapping[problemCategory] ?? "living_room";
}

/**
 * Check if a project brief is ready for matching and trigger if so.
 * Called after design → project conversion.
 */
export async function checkAndTriggerMatching(projectId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, status, matching_status")
    .eq("id", projectId)
    .single();

  if (project && project.status === "active" && !project.matching_status) {
    await supabase
      .from("projects")
      .update({ matching_status: "pending" })
      .eq("id", projectId);

    trackFlywheelSignal({
      signal: "contractor_matched",
      entityType: "project",
      entityId: projectId,
      metadata: { triggered_by: "flywheel_auto" },
    });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────
function formatSignalTitle(event: FlywheelEvent): string {
  const titles: Record<FlywheelSignal, string> = {
    seo_page_viewed: "Page SEO consultée",
    design_started_from_seo: "Design AI lancé depuis SEO",
    design_completed: "Design AI complété",
    project_created_from_design: "Projet créé depuis Design",
    contractor_matched: "Entrepreneur matché",
    project_completed: "Projet complété",
    transformation_published: "Transformation publiée",
    authority_score_updated: "Score Authority mis à jour",
    content_generated: "Contenu SEO généré",
  };
  return titles[event.signal] ?? event.signal;
}
