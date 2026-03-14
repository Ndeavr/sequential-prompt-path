/**
 * UNPRO — Property Claim Service
 * Handles claim requests, status transitions, and verification prep.
 */
import { supabase } from "@/integrations/supabase/client";

export type ClaimStatus = "unclaimed" | "claim_pending" | "claimed" | "verification_required" | "rejected";

export interface ClaimRequest {
  propertyId: string;
  userId: string;
  verificationMethod?: "none" | "postal_mail" | "qr_panel" | "document_upload";
  notes?: string;
}

/**
 * Submit a claim request for a property.
 */
export async function submitClaim(req: ClaimRequest) {
  // Check property isn't already claimed
  const { data: property } = await supabase
    .from("properties")
    .select("id, claimed_by, claim_status")
    .eq("id", req.propertyId)
    .single();

  if (!property) throw new Error("Propriété introuvable.");
  if (property.claimed_by && property.claim_status === "claimed") {
    throw new Error("Cette propriété est déjà réclamée par un autre utilisateur.");
  }

  // Check for existing pending claim by this user
  const { data: existing } = await supabase
    .from("property_claims")
    .select("id")
    .eq("property_id", req.propertyId)
    .eq("user_id", req.userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    throw new Error("Vous avez déjà une demande de réclamation en cours.");
  }

  // Create the claim
  const { data: claim, error } = await supabase
    .from("property_claims")
    .insert({
      property_id: req.propertyId,
      user_id: req.userId,
      status: "pending",
      verification_method: req.verificationMethod || "none",
      notes: req.notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Update property status
  await supabase
    .from("properties")
    .update({ claim_status: "claim_pending" })
    .eq("id", req.propertyId);

  return claim;
}

/**
 * Get claims for a property.
 */
export async function getPropertyClaims(propertyId: string) {
  const { data, error } = await supabase
    .from("property_claims")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get claims for the current user.
 */
export async function getUserClaims(userId: string) {
  const { data, error } = await supabase
    .from("property_claims")
    .select("*, properties(id, address, city, slug, public_status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get claim status label in French.
 */
export function getClaimStatusLabel(status: ClaimStatus): { label: string; color: "default" | "secondary" | "destructive" | "outline" } {
  switch (status) {
    case "unclaimed": return { label: "Non réclamée", color: "outline" };
    case "claim_pending": return { label: "En attente", color: "secondary" };
    case "claimed": return { label: "Réclamée", color: "default" };
    case "verification_required": return { label: "Vérification requise", color: "secondary" };
    case "rejected": return { label: "Refusée", color: "destructive" };
    default: return { label: "Inconnu", color: "outline" };
  }
}
