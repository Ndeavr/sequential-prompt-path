/**
 * UNPRO — Verification Extrapolation Orchestrator
 * Calls verify-extrapolate edge function and streams sub-results back.
 */
import { supabase } from "@/integrations/supabase/client";
import type { BusinessSearchResult } from "@/components/contractor/BusinessNameSearch";

export type StepStatus = "ok" | "empty" | "error";

export interface RbqResult {
  status: StepStatus;
  candidates?: any[];
  best?: any;
  rbq_number?: string | null;
  registered_name?: string | null;
  rbq_status?: string;
  subcategories?: string[];
  error?: string;
}

export interface NeqResult {
  status: StepStatus;
  neq?: string;
  legal_name?: string | null;
  neq_status?: string;
  registration_date?: string | null;
  registered_address?: string | null;
  error?: string;
}

export interface ReviewsResult {
  status: StepStatus;
  rating?: number;
  review_count?: number;
  sentiment?: "excellent" | "positive" | "mixed" | "negative";
  volume_tier?: "high" | "medium" | "low" | "very_low";
  red_flags?: string[];
}

export interface ExtrapolationOutput {
  rbq: RbqResult;
  neq: NeqResult;
  reviews: ReviewsResult;
}

export async function runExtrapolation(
  pick: BusinessSearchResult,
): Promise<ExtrapolationOutput> {
  const { data, error } = await supabase.functions.invoke("verify-extrapolate", {
    body: {
      business_name: pick.business_name,
      city: pick.city || undefined,
      phone: pick.phone || undefined,
      website: pick.website || undefined,
      place_id: pick.place_id,
      rating: pick.rating || undefined,
      review_count: pick.review_count || undefined,
    },
  });
  if (error || !data?.ok) {
    return {
      rbq: { status: "error", error: error?.message ?? "Erreur" },
      neq: { status: "error", error: error?.message ?? "Erreur" },
      reviews: { status: "error" },
    };
  }
  return { rbq: data.rbq, neq: data.neq, reviews: data.reviews };
}

/** Compute simple verdict from sub-results + Google data. */
export function computeVerdict(pick: BusinessSearchResult, out: ExtrapolationOutput): {
  verdict: "succes" | "attention" | "non_succes" | "se_tenir_loin";
  headline: string;
  short: string;
} {
  const rbqOk = out.rbq.status === "ok" && (out.rbq.rbq_status === "valid" || out.rbq.rbq_status === "unknown");
  const neqOk = out.neq.status === "ok" && out.neq.neq_status === "active";
  const reviewsBad = out.reviews.status === "ok" && (out.reviews.sentiment === "negative" || (out.reviews.red_flags?.length ?? 0) >= 2);
  const reviewsGood = out.reviews.status === "ok" && (out.reviews.sentiment === "excellent" || out.reviews.sentiment === "positive");

  if (reviewsBad && !rbqOk && !neqOk) {
    return { verdict: "se_tenir_loin", headline: "À éviter", short: "Signaux multiples défavorables : registres incertains et avis négatifs." };
  }
  if (rbqOk && neqOk && reviewsGood) {
    return { verdict: "succes", headline: "Entreprise fiable", short: "Identité cohérente, licence RBQ valide et bons avis publics." };
  }
  if (rbqOk && reviewsGood) {
    return { verdict: "succes", headline: "Profil solide", short: `Licence RBQ confirmée${out.neq.status === "ok" ? " et entreprise enregistrée" : ""} avec des avis positifs.` };
  }
  if (out.rbq.status === "error" && out.neq.status === "error") {
    return { verdict: "attention", headline: "Vérification partielle", short: "Les registres publics n'ont pas répondu — fiez-vous aux signaux Google et demandez des preuves." };
  }
  return {
    verdict: "attention",
    headline: "Vérification à compléter",
    short: "Certains éléments sont confirmés, d'autres restent incertains. Demandez le numéro RBQ et le NEQ avant de signer.",
  };
}
