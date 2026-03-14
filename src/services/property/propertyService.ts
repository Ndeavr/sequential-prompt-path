/**
 * UNPRO — Property Service
 * Central service for property CRUD, lookup, slug generation, and public page data.
 */
import { supabase } from "@/integrations/supabase/client";
import { normalizeAddress, generateSlug, buildFullAddress } from "@/lib/addressNormalizer";

export type PropertyPublicStatus =
  | "estimated"
  | "passeport_disponible"
  | "passeport_actif"
  | "maison_certifiee"
  | "travaux_en_cours"
  | "private";

export interface PropertyCreateInput {
  streetNumber: string;
  streetName: string;
  unit?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country?: string;
  propertyType?: string;
  yearBuilt?: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Fetch a property by its public slug. Returns public-safe fields only.
 */
export async function fetchPropertyBySlug(slug: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("id, address, city, province, postal_code, property_type, year_built, slug, public_status, estimated_score, street_number, street_name, unit, neighborhood, full_address, latitude, longitude, photo_url, created_at")
    .eq("slug", slug)
    .neq("public_status", "private")
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Fetch a property by ID (for authenticated owners).
 */
export async function fetchPropertyById(id: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Look up a property by normalized address to avoid duplicates.
 */
export async function findPropertyByAddress(address: string) {
  const normalized = normalizeAddress(address);
  const { data, error } = await supabase
    .from("properties")
    .select("id, slug, address, city, public_status, claimed_by")
    .eq("normalized_address", normalized)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create a new property with slug generation and normalization.
 */
export async function createProperty(input: PropertyCreateInput, userId: string) {
  const fullAddress = buildFullAddress({
    streetNumber: input.streetNumber,
    streetName: input.streetName,
    unit: input.unit,
    city: input.city,
    province: input.province || "QC",
    postalCode: input.postalCode,
  });

  const normalized = normalizeAddress(fullAddress);
  const slug = generateSlug({
    streetNumber: input.streetNumber,
    streetName: input.streetName,
    city: input.city,
    province: input.province || "QC",
  });

  // Check for existing property with same normalized address
  const existing = await findPropertyByAddress(fullAddress);
  if (existing) {
    return { property: existing, created: false };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({
      address: fullAddress,
      street_number: input.streetNumber,
      street_name: input.streetName,
      unit: input.unit,
      city: input.city,
      province: input.province || "QC",
      postal_code: input.postalCode,
      country: input.country || "CA",
      full_address: fullAddress,
      normalized_address: normalized,
      slug,
      property_type: input.propertyType,
      year_built: input.yearBuilt,
      latitude: input.latitude,
      longitude: input.longitude,
      user_id: userId,
      public_status: "estimated",
    })
    .select()
    .single();

  if (error) throw error;
  return { property: data, created: true };
}

/**
 * Claim an existing property for a user.
 */
export async function claimProperty(propertyId: string, userId: string) {
  const { data, error } = await supabase
    .from("properties")
    .update({
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
      public_status: "passeport_disponible",
    })
    .eq("id", propertyId)
    .is("claimed_by", null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get the public status label in French.
 */
export function getStatusLabel(status: PropertyPublicStatus | string | null): {
  label: string;
  color: "default" | "secondary" | "destructive" | "outline";
  icon: string;
} {
  switch (status) {
    case "estimated":
      return { label: "Score estimé", color: "secondary", icon: "BarChart3" };
    case "passeport_disponible":
      return { label: "Passeport disponible", color: "outline", icon: "FileCheck" };
    case "passeport_actif":
      return { label: "Passeport actif", color: "default", icon: "ShieldCheck" };
    case "maison_certifiee":
      return { label: "Maison certifiée", color: "default", icon: "Award" };
    case "travaux_en_cours":
      return { label: "Travaux en cours", color: "secondary", icon: "Hammer" };
    default:
      return { label: "Score estimé", color: "secondary", icon: "BarChart3" };
  }
}
