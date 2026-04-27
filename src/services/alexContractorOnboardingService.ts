/**
 * alexContractorOnboardingService — Drives the in-chat contractor onboarding flow.
 *
 * Wires the Alex chat engine into the existing contractor backend:
 *  - enrich-business-profile (or fallback heuristic) → AIPP score
 *  - aipp-real-scan / aipp-v2-analyze → score normalization
 *  - create-contractor-checkout → Stripe session URL
 *
 * NEVER opens a contact form. NEVER says "on vous rappelle".
 */

import { supabase } from "@/integrations/supabase/client";
import type { ContractorIdentity, AippPreview } from "@/services/alexCopilotEngine";
import type { ContractorPlanSlug } from "@/config/contractorPlans";

export interface EnrichmentResult {
  preview: AippPreview;
  enriched: Record<string, any> | null;
}

const TOP_GAPS = [
  "votre visibilité locale",
  "la structure de votre fiche",
  "votre présence Google",
  "vos avis vérifiés",
  "votre signal RBQ/NEQ",
  "vos spécialités déclarées",
];

function pickTopGap(score: number): string {
  // Lower score → more obvious gaps; just pick deterministically by score bucket.
  const idx = Math.min(TOP_GAPS.length - 1, Math.floor((100 - score) / 18));
  return TOP_GAPS[idx];
}

/**
 * Run business enrichment + AIPP score.
 * Resilient to backend errors: always returns a preview the chat can use.
 */
export async function runContractorEnrichment(identity: ContractorIdentity): Promise<EnrichmentResult> {
  let enriched: Record<string, any> | null = null;
  let score: number | null = null;

  // Try enrichment edge function (best-effort)
  try {
    const { data, error } = await supabase.functions.invoke("enrich-business-profile", {
      body: {
        business_name: identity.businessName,
        phone: identity.phone,
        website: identity.website,
        rbq: identity.rbq,
        neq: identity.neq,
      },
    });
    if (!error && data) enriched = data;
  } catch (e) {
    console.warn("[contractor-onboarding] enrich failed:", e);
  }

  // Try AIPP scan (best-effort)
  try {
    const { data, error } = await supabase.functions.invoke("aipp-real-scan", {
      body: {
        business_name: identity.businessName,
        website: identity.website,
        phone: identity.phone,
        rbq: identity.rbq,
        neq: identity.neq,
      },
    });
    if (!error && data) {
      const raw = (data?.score ?? data?.aipp_score ?? data?.total_score) as number | undefined;
      if (typeof raw === "number" && !Number.isNaN(raw)) {
        score = Math.max(20, Math.min(95, Math.round(raw)));
      }
    }
  } catch (e) {
    console.warn("[contractor-onboarding] aipp scan failed:", e);
  }

  // Heuristic fallback so the chat always advances
  if (score == null) {
    let s = 45;
    if (identity.website) s += 12;
    if (identity.rbq) s += 10;
    if (identity.neq) s += 4;
    if (identity.phone) s += 5;
    if (identity.businessName) s += 6;
    score = Math.max(35, Math.min(78, s));
  }

  return {
    preview: { score, topGap: pickTopGap(score) },
    enriched,
  };
}

/**
 * Get the Stripe checkout URL for a contractor plan.
 * Returns `{ url }` on success, or `{ requiresAuth: true }` if user must sign in first.
 */
export async function getContractorCheckoutUrl(
  planCode: ContractorPlanSlug,
): Promise<{ url?: string; requiresAuth?: boolean; error?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      // Edge function will handle guest, but we can short-circuit and route to auth.
      return { requiresAuth: true };
    }

    const { data, error } = await supabase.functions.invoke("create-contractor-checkout", {
      body: { plan_code: planCode },
    });

    if (error) return { error: error.message };
    if (data?.url) return { url: data.url };
    return { error: "Aucune URL de paiement reçue." };
  } catch (e: any) {
    console.error("[contractor-onboarding] checkout failed:", e);
    return { error: e?.message || "Erreur de paiement." };
  }
}

/** Save the contractor onboarding draft locally + remotely if logged in. */
export async function persistContractorDraft(
  identity: ContractorIdentity,
  preview: AippPreview | null,
  objective: string | null,
  recommendedPlan: ContractorPlanSlug | null,
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return; // guest — chat memory only

    await supabase.from("contractor_activation_events" as any).insert({
      user_id: uid,
      event_type: "alex_chat_step",
      payload: {
        identity,
        aipp_preview: preview,
        objective,
        recommended_plan: recommendedPlan,
      },
    });
  } catch (e) {
    console.warn("[contractor-onboarding] persist failed (non-blocking):", e);
  }
}
