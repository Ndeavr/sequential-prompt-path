/**
 * UNPRO — Property Types
 * TypeScript types for the Property Passport ecosystem.
 * Aligned with actual Supabase schema.
 */

export interface Property {
  id: string;
  user_id: string;
  address: string;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  property_type: string | null;
  year_built: number | null;
  square_footage: number | null;
  lot_size: number | null;
  condition: string | null;
  photo_url: string | null;
  estimated_score: number | null;
  certification_status: string | null;
  neighborhood: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyScore {
  id: string;
  property_id: string;
  user_id: string;
  overall_score: number;
  component_scores: Record<string, number> | null;
  score_type: string;
  notes: string | null;
  calculated_at: string;
  created_at: string;
}

export interface PropertyEvent {
  id: string;
  property_id: string;
  user_id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string | null;
  cost: number | null;
  contractor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PropertyRecommendation {
  id: string;
  property_id: string;
  category: string;
  priority: string | null;
  title: string;
  description: string | null;
  recommended_timeline: string | null;
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  recommended_profession: string | null;
  reasoning: Record<string, unknown> | null;
  created_at: string | null;
}

export interface PropertyDocument {
  id: string;
  property_id: string;
  user_id: string;
  title: string;
  document_type: string;
  storage_path: string | null;
  file_url: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function scoreLabel(score?: number | null): string {
  if (score == null) return "Inconnu";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Bon";
  if (score >= 55) return "Moyen";
  if (score >= 40) return "À surveiller";
  return "Critique";
}

export function scoreColor(score?: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-blue-500";
  if (score >= 55) return "text-amber-500";
  if (score >= 40) return "text-orange-500";
  return "text-destructive";
}

export function formatCurrency(value?: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}
