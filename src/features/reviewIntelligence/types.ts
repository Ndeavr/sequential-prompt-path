/**
 * Review Intelligence™ — Types
 */

export type ReviewRequestStatus =
  | "pending"
  | "sent"
  | "opened"
  | "submitted"
  | "published"
  | "expired"
  | "failed";

export type StandoutTag =
  | "communication"
  | "professionalism"
  | "cleanliness"
  | "education"
  | "quality"
  | "respect"
  | "value"
  | "problem_solved";

export interface ReviewRequest {
  id: string;
  contractor_id: string;
  homeowner_name: string;
  phone: string | null;
  email: string | null;
  project_type: string | null;
  city: string | null;
  completion_date: string | null;
  token: string;
  status: ReviewRequestStatus;
  sequence_step: number;
  language: string;
  source: string;
  sent_at: string | null;
  opened_at: string | null;
  submitted_at: string | null;
  published_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface StructuredScores {
  communication?: number;
  professionalism?: number;
  cleanliness?: number;
  education?: number;
  quality?: number;
  respect?: number;
  value?: number;
  problem_solved?: number;
  punctuality?: number;
  trust?: number;
}

export interface ReviewV2 {
  id: string;
  request_id: string | null;
  contractor_id: string;
  rating: number;
  structured_scores: StructuredScores;
  standout_tags: StandoutTag[];
  raw_text: string | null;
  ai_generated_text: string | null;
  approved_text: string | null;
  voice_transcript: string | null;
  media_urls: string[];
  project_type: string | null;
  city: string | null;
  homeowner_name: string | null;
  google_publish_status: string;
  google_click_at: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewReputationScore {
  contractor_id: string;
  communication: number;
  professionalism: number;
  cleanliness: number;
  trust: number;
  quality: number;
  education: number;
  value: number;
  problem_solved: number;
  punctuality: number;
  ai_visibility_score: number;
  sample_size: number;
  top_dimensions: string[];
  updated_at: string;
}

export const STANDOUT_LABELS: Record<StandoutTag, { fr: string; en: string; emoji: string }> = {
  communication: { fr: "Communication", en: "Communication", emoji: "💬" },
  professionalism: { fr: "Professionnalisme", en: "Professionalism", emoji: "🎯" },
  cleanliness: { fr: "Propreté", en: "Cleanliness", emoji: "✨" },
  education: { fr: "Pédagogie", en: "Education", emoji: "🎓" },
  quality: { fr: "Qualité", en: "Quality", emoji: "🏆" },
  respect: { fr: "Respect", en: "Respect", emoji: "🤝" },
  value: { fr: "Valeur", en: "Value", emoji: "💎" },
  problem_solved: { fr: "Problème résolu", en: "Problem Solved", emoji: "🔧" },
};
