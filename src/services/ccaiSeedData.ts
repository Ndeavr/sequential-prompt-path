/**
 * UNPRO — CCAI Seed Data: 25 Alignment Questions (v2)
 * Matches the database seed exactly. Used as static fallback.
 */

export const CCAI_QUESTION_CODES = [
  "work_language",
  "documents_language",
  "quick_updates_language",
  "site_safety_language",
  "misunderstood_technical_terms",
  "group_meeting_language",
  "client_role",
  "site_visit_frequency",
  "minor_field_decisions",
  "mid_project_changes",
  "material_finish_selection",
  "project_size",
  "occupied_home",
  "morning_start_time",
  "daily_cleanup_expectation",
  "noise_tolerance",
  "priority",
  "hidden_issue_response",
  "conflict_handling",
  "reference_checks",
  "payment_schedule",
  "after_hours_contact",
  "relationship_style",
  "meet_subcontractors",
  "completion_definition",
] as const;

export type CCAIQuestionCode = (typeof CCAI_QUESTION_CODES)[number];

export const CCAI_CATEGORIES = [
  "language_communication",
  "involvement_complexity",
  "scale_environment",
  "trust_values",
  "professional_boundaries",
] as const;
