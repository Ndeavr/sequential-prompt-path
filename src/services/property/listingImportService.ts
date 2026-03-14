/**
 * UNPRO — Listing Import Service
 * Handles importing real estate listings to create/enrich property passports.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ListingImportResult {
  id: string;
  property_id: string | null;
  source_url: string;
  source_platform: string | null;
  import_status: string;
  extracted_data: Record<string, unknown>;
  mapped_fields: Record<string, unknown>;
  confidence_score: number;
  created_at: string;
}

/**
 * Detect platform from URL.
 */
export function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes("centris.ca")) return "centris";
  if (lower.includes("realtor.ca")) return "realtor";
  if (lower.includes("remax.ca") || lower.includes("remax.")) return "remax";
  if (lower.includes("sutton.com")) return "sutton";
  if (lower.includes("royallepage.ca")) return "royallepage";
  if (lower.includes("duproprio.com")) return "duproprio";
  if (lower.includes("kijiji.ca")) return "kijiji";
  return "other";
}

/**
 * Submit a listing URL for import.
 */
export async function submitListingImport(
  sourceUrl: string,
  userId: string
): Promise<ListingImportResult> {
  const platform = detectPlatform(sourceUrl);

  const { data, error } = await supabase
    .from("listing_imports")
    .insert({
      source_url: sourceUrl,
      source_platform: platform,
      submitted_by: userId,
      import_status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ListingImportResult;
}

/**
 * Get listing imports for the current user.
 */
export async function getUserListingImports(userId: string) {
  const { data, error } = await supabase
    .from("listing_imports")
    .select("*")
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

/**
 * Map extracted listing data to property fields.
 */
export function mapListingToPropertyFields(extracted: Record<string, unknown>): Record<string, unknown> {
  return {
    address: extracted.address || null,
    city: extracted.city || null,
    province: extracted.province || "QC",
    postal_code: extracted.postal_code || null,
    property_type: extracted.property_type || null,
    year_built: extracted.year_built || null,
    square_footage: extracted.square_footage || null,
    lot_size: extracted.lot_size || null,
    bedrooms: extracted.bedrooms || null,
    bathrooms: extracted.bathrooms || null,
    price: extracted.price || null,
    description: extracted.description || null,
  };
}

/**
 * Get certification status labels in French.
 */
export function getCertificationLabel(status: string): {
  label: string;
  description: string;
  color: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "not_eligible":
      return { label: "Non éligible", description: "Le passeport doit être complété davantage", color: "secondary" };
    case "eligible":
      return { label: "Éligible", description: "Votre propriété peut être soumise pour certification", color: "outline" };
    case "in_review":
      return { label: "En révision", description: "Un expert vérifie les informations soumises", color: "secondary" };
    case "certified":
      return { label: "Maison certifiée UnPRO", description: "Certifiée par UnPRO — données vérifiées", color: "default" };
    case "expired":
      return { label: "Certification expirée", description: "La certification doit être renouvelée", color: "destructive" };
    default:
      return { label: "Non éligible", description: "Le passeport doit être complété davantage", color: "secondary" };
  }
}
