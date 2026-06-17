/**
 * Alex V3 — Deterministic Qualification Scoring Engine
 * Output 0-100. Hard-gate matching at score >= 70 AND required dimensions present.
 */
import type { QualificationGraph } from "./qualificationGraph";

export interface ScoreBreakdown {
  property: number;
  problem: number;
  urgency: number;
  property_type: number;
  photos: number;
  quotes: number;
  budget: number;
  compatibility: number;
  total: number;
  missing: string[];
  ready_for_match: boolean;
}

export function scoreGraph(g: QualificationGraph): ScoreBreakdown {
  const property = g.property.confirmed && g.property.address ? 25 : 0;
  const problem = g.problem.category ? (g.problem.sub_type ? 20 : 10) : 0;
  const urgency = g.urgency ? 15 : 0;
  const property_type = g.property.type ? 10 : 0;
  const photos = g.photos.uploaded_ids.length > 0 ? 10 : 0;
  const quotes = g.quotes.uploaded_ids.length > 0 ? 10 : (g.quotes.received === false ? 5 : 0);
  const budget = g.budget && g.budget !== "unknown" ? 5 : 0;
  const compatibility = Object.values(g.compatibility).filter(Boolean).length > 0 ? 5 : 0;

  const total = property + problem + urgency + property_type + photos + quotes + budget + compatibility;

  const missing: string[] = [];
  if (!property) missing.push("property_address");
  if (!g.problem.category) missing.push("problem_category");
  if (!g.problem.sub_type) missing.push("problem_sub_type");
  if (!urgency) missing.push("urgency");
  if (!property_type) missing.push("property_type");

  const ready_for_match =
    !!g.property.confirmed &&
    !!g.problem.category &&
    !!g.problem.sub_type &&
    !!g.urgency &&
    total >= 70;

  return { property, problem, urgency, property_type, photos, quotes, budget, compatibility, total, missing, ready_for_match };
}
