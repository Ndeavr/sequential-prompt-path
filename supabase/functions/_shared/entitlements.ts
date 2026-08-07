/**
 * UNPRO — Canonical server-side entitlement enforcement.
 *
 * Single source of truth: public.plans + public.plan_features, resolved through
 * public.contractor_feature_access(user_id, feature_key).
 *
 * Never duplicate plan limits in application code — read them from here.
 */

export interface EntitlementResult {
  allowed: boolean;
  plan_code: string | null;
  limit: number;
  unlimited: boolean;
  reason: string;
  teaser?: string | null;
  upgrade_target?: string | null;
  usage?: number;
}

export interface EntitlementCheckInput {
  userId: string;
  featureKey: string;
  contractorId?: string | null;
  /** Current period usage — when provided, the plan limit is enforced against it. */
  usage?: number;
  surface?: string;
  context?: Record<string, unknown>;
}

/**
 * Resolve a contractor entitlement and log every denial for diagnosis.
 * `client` must be a service-role Supabase client.
 */
export async function checkEntitlement(
  client: any,
  input: EntitlementCheckInput,
): Promise<EntitlementResult> {
  let result: EntitlementResult;

  const { data, error } = await client.rpc("contractor_feature_access", {
    _user_id: input.userId,
    _feature_key: input.featureKey,
  });

  if (error) {
    result = {
      allowed: false,
      plan_code: null,
      limit: 0,
      unlimited: false,
      reason: "entitlement_lookup_failed",
    };
  } else {
    result = {
      allowed: Boolean(data?.allowed),
      plan_code: data?.plan_code ?? null,
      limit: typeof data?.limit === "number" ? data.limit : -1,
      unlimited: Boolean(data?.unlimited),
      reason: data?.reason ?? "unknown",
      teaser: data?.teaser ?? null,
      upgrade_target: data?.upgrade_target ?? null,
    };
  }

  // Quantitative limit enforcement (usage-based features)
  if (result.allowed && typeof input.usage === "number" && !result.unlimited && result.limit >= 0) {
    result.usage = input.usage;
    if (input.usage >= result.limit) {
      result.allowed = false;
      result.reason = "limit_reached";
    }
  }

  if (!result.allowed) {
    try {
      await client.from("entitlement_denials").insert({
        user_id: input.userId,
        contractor_id: input.contractorId ?? null,
        feature_key: input.featureKey,
        plan_code: result.plan_code,
        reason: result.reason,
        limit_value: result.limit,
        current_usage: input.usage ?? null,
        surface: input.surface ?? null,
        context: input.context ?? {},
      });
    } catch (_e) {
      // logging must never block the request path
    }
  }

  return result;
}

/** Standard 402 payload the UI can turn into an upgrade prompt. */
export function entitlementDeniedResponse(
  result: EntitlementResult,
  corsHeaders: Record<string, string>,
): Response {
  const message =
    result.reason === "limit_reached"
      ? `Limite de votre plan atteinte (${result.limit}).`
      : result.reason === "no_active_subscription"
        ? "Aucun plan actif sur votre compte."
        : "Cette fonctionnalité n'est pas incluse dans votre plan.";

  return new Response(
    JSON.stringify({
      ok: false,
      error: "entitlement_denied",
      code: result.reason,
      message,
      teaser: result.teaser ?? null,
      plan_code: result.plan_code,
      limit: result.limit,
      usage: result.usage ?? null,
      upgrade_target: result.upgrade_target ?? null,
      upgrade_url: "/entrepreneur/tarifs",
      custom_plan_url: "/entrepreneur/devis-personnalise",
    }),
    { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
