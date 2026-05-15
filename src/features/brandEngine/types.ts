/** UNPRO — Brand Engine types (Phase 1) */

export type BrandMarketPosition =
  | "luxury" | "premium" | "mainstream" | "budget" | "professional" | "commercial";

export type BrandSourceType =
  | "website" | "ocr" | "photo" | "review" | "alex_chat" | "manual" | "onboarding" | "social" | "seed";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  subcategory: string | null;
  country: string | null;
  premium_score: number;
  trust_score: number;
  market_position: BrandMarketPosition;
  logo_svg_url: string | null;
  logo_png_url: string | null;
  logo_grey_svg_url: string | null;
  logo_grey_png_url: string | null;
  website: string | null;
  description: string | null;
}

export interface ContractorBrandProfile {
  id: string;
  contractor_id: string;
  brand_id: string;
  confidence_score: number;
  source_type: BrandSourceType;
  is_primary_ecosystem: boolean;
  is_certified: boolean;
  detected_at: string;
  brand?: Brand;
}

export interface BrandScore {
  contractor_id: string;
  ecosystem_quality: number;
  premium_score: number;
  commercial_score: number;
  technical_score: number;
  luxury_score: number;
  budget_tier: string;
  brand_count: number;
  primary_ecosystem: string | null;
}
