import { supabase } from "@/integrations/supabase/client";

export interface FounderEligibility {
  eligible: boolean;
  reason: string | null;
  cityRemaining: number | null;
}

export type FounderEligibilityTransport = (input: {
  p_city: string;
  p_category_slug: string;
}) => Promise<{ data: unknown; error: unknown | null }>;

const productionTransport: FounderEligibilityTransport = async (input) => {
  const { data, error } = await supabase.rpc("check_founder_eligibility", input);
  return { data, error };
};

function parseFounderEligibility(value: unknown): FounderEligibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { eligible: false, reason: "invalid_response", cityRemaining: null };
  }

  const payload = value as {
    eligible?: unknown;
    reason?: unknown;
    city_remaining?: unknown;
  };
  const eligible = payload.eligible === true;
  const reason = typeof payload.reason === "string" ? payload.reason : null;
  const cityRemaining =
    typeof payload.city_remaining === "number" && Number.isFinite(payload.city_remaining)
      ? payload.city_remaining
      : null;

  return {
    eligible,
    reason: eligible ? null : (reason ?? "not_eligible"),
    cityRemaining,
  };
}

/**
 * The database RPC remains the production authority for the founder-category
 * scope lock. The optional transport makes the client boundary testable
 * without issuing a network request.
 */
export async function checkFounderEligibility(
  city: string,
  categorySlug: string,
  transport: FounderEligibilityTransport = productionTransport,
): Promise<FounderEligibility> {
  const { data, error } = await transport({
    p_city: city,
    p_category_slug: categorySlug,
  });
  if (error) throw error;
  return parseFounderEligibility(data);
}
