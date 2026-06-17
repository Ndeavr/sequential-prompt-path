/**
 * Alex V3 — Universal Qualification Graph
 * Single source-of-truth structure for a homeowner project qualification session.
 */

export type Urgency = "urgent" | "30d" | "3m" | "year" | "planning" | null;
export type BudgetBand = "unknown" | "<5k" | "5-15k" | "15-50k" | "50k+" | null;
export type PropertyType = "house" | "condo" | "duplex" | "multiplex" | "cottage" | null;

export interface QualificationGraph {
  homeowner: {
    user_id: string | null;
    language: "fr" | "en";
    name: string | null;
  };
  property: {
    address: string | null;
    city: string | null;
    postal_code: string | null;
    property_id: string | null;
    type: PropertyType;
    confirmed: boolean;
  };
  problem: {
    category: string | null;       // e.g. "roofing", "foundation"
    sub_type: string | null;       // e.g. "leak", "crack"
    description: string | null;
  };
  urgency: Urgency;
  budget: BudgetBand;
  quotes: {
    received: boolean | null;
    count: number;
    uploaded_ids: string[];
  };
  photos: {
    requested: boolean;
    uploaded_ids: string[];
  };
  compatibility: {
    schedule: string | null;
    permit_required: boolean | null;
    condo_board: boolean | null;
    emergency: boolean | null;
  };
  project_context: Record<string, unknown>;
  score: number;                  // 0-100
  missing_dimensions: string[];
  ready_for_match: boolean;
  matching_confidence: number | null;
}

export function createEmptyGraph(language: "fr" | "en" = "fr"): QualificationGraph {
  return {
    homeowner: { user_id: null, language, name: null },
    property: { address: null, city: null, postal_code: null, property_id: null, type: null, confirmed: false },
    problem: { category: null, sub_type: null, description: null },
    urgency: null,
    budget: null,
    quotes: { received: null, count: 0, uploaded_ids: [] },
    photos: { requested: false, uploaded_ids: [] },
    compatibility: { schedule: null, permit_required: null, condo_board: null, emergency: null },
    project_context: {},
    score: 0,
    missing_dimensions: [],
    ready_for_match: false,
    matching_confidence: null,
  };
}

/** Merge a partial extraction into the graph (deep, non-destructive). */
export function mergeGraph(base: QualificationGraph, patch: Partial<QualificationGraph>): QualificationGraph {
  return {
    ...base,
    homeowner: { ...base.homeowner, ...(patch.homeowner ?? {}) },
    property: { ...base.property, ...(patch.property ?? {}) },
    problem: { ...base.problem, ...(patch.problem ?? {}) },
    urgency: patch.urgency ?? base.urgency,
    budget: patch.budget ?? base.budget,
    quotes: { ...base.quotes, ...(patch.quotes ?? {}) },
    photos: { ...base.photos, ...(patch.photos ?? {}) },
    compatibility: { ...base.compatibility, ...(patch.compatibility ?? {}) },
    project_context: { ...base.project_context, ...(patch.project_context ?? {}) },
    score: patch.score ?? base.score,
    missing_dimensions: patch.missing_dimensions ?? base.missing_dimensions,
    ready_for_match: patch.ready_for_match ?? base.ready_for_match,
    matching_confidence: patch.matching_confidence ?? base.matching_confidence,
  };
}
