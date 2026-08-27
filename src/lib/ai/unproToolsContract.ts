/**
 * UNPRO — Internal typed tool contract for a future MCP / ChatGPT app.
 *
 * IMPORTANT: this is an INTERNAL interface layer only. It exposes NO public
 * endpoint and creates no new network surface. It exists so the future
 * MCP/ChatGPT integration can be wired to already-typed, already-reviewed
 * shapes without refactoring production code later.
 *
 * Implementations must always delegate to existing production edge functions /
 * RPCs — never duplicate matching, pricing or booking logic.
 */

export interface AnalyzeProjectInput {
  description: string;
  city?: string | null;
  property_type?: "residential" | "commercial" | null;
  photos?: string[];
}
export interface AnalyzeProjectResult {
  problem: string | null;
  trade: string | null;
  urgency: "low" | "medium" | "high" | "emergency";
  estimated_range_cad: { min: number; max: number } | null;
  confidence: number;
}

export interface MatchProsInput {
  trade: string;
  city: string;
  project_size?: "lt_2k" | "2k_10k" | "10k_50k" | "gt_50k" | "unknown";
  client_type?: "residential" | "commercial";
  language?: "fr" | "en";
  limit?: number;
}
export interface MatchedPro {
  contractor_id: string;
  business_name: string;
  city: string | null;
  trade: string | null;
  compatibility_score: number;
  recommendation_eligible: boolean;
  verification_status: string;
}

export interface GetProProfileInput {
  contractor_id: string;
}
export interface ProProfile extends MatchedPro {
  services: string[];
  territories: string[];
  languages: string[];
  credentials: string[];
  differentiators: string[];
  ai_profile_readiness: number;
  profile_completion: number;
}

export interface CheckAvailabilityInput {
  contractor_id: string;
  from?: string;
  to?: string;
}
export interface AvailabilityResult {
  contractor_id: string;
  next_available: string | null;
  slots: { start: string; end: string }[];
}

export interface BookAppointmentInput {
  contractor_id: string;
  slot_start: string;
  homeowner: { name: string; phone?: string; email?: string };
  project_summary: string;
}
export interface BookAppointmentResult {
  appointment_id: string;
  status: "requested" | "scheduled" | "declined";
}

/** The tool surface a future MCP server / ChatGPT app would expose. */
export interface UnproAiTools {
  analyze_project(input: AnalyzeProjectInput): Promise<AnalyzeProjectResult>;
  match_pros(input: MatchProsInput): Promise<MatchedPro[]>;
  get_pro_profile(input: GetProProfileInput): Promise<ProProfile | null>;
  check_availability(input: CheckAvailabilityInput): Promise<AvailabilityResult>;
  book_appointment(input: BookAppointmentInput): Promise<BookAppointmentResult>;
}

export const UNPRO_AI_TOOL_NAMES = [
  "analyze_project",
  "match_pros",
  "get_pro_profile",
  "check_availability",
  "book_appointment",
] as const;
export type UnproAiToolName = (typeof UNPRO_AI_TOOL_NAMES)[number];

/**
 * No implementation is bound yet on purpose: exposing a half-wired tool would
 * mean shipping fake functionality. When the MCP server is authorised, bind an
 * implementation here that calls the existing production functions.
 */
export const UNPRO_AI_TOOLS_IMPLEMENTATION: UnproAiTools | null = null;
