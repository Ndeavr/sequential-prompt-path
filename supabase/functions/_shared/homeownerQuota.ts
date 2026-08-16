/**
 * UNPRO — Homeowner monthly quota helper (server-side, authoritative).
 *
 * The catalog (`plans` + `plan_features`) is the ONLY source of limits.
 * -1 = unlimited. Never hardcode a homeowner limit in an edge function.
 *
 * Usage pattern:
 *   1. `checkHomeownerQuota` BEFORE doing expensive work (fast refusal)
 *   2. `consumeHomeownerQuota` AFTER the operation really succeeded
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type HomeownerFeature = "quote_analysis_monthly" | "ai_design_monthly";

export interface QuotaResult {
  allowed: boolean;
  unlimited: boolean;
  limit: number | null;
  used: number;
  remaining: number;
  planCode: string;
  upgradeTarget: string | null;
  replayed?: boolean;
}

const UPGRADE_LABEL: Record<string, string> = {
  home_plus: "Plus",
  home_signature: "Gold",
};

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Resolve the caller's user id from the Authorization header (null when guest). */
export async function getUserId(req: Request, supa: SupabaseClient): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const { data } = await supa.auth.getUser(auth.replace("Bearer ", ""));
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

function normalize(raw: Record<string, unknown> | null, fallbackPlan = "home_decouverte"): QuotaResult {
  const limit = (raw?.limit ?? null) as number | null;
  return {
    allowed: !!raw?.allowed,
    unlimited: !!raw?.unlimited || limit === -1,
    limit,
    used: Number(raw?.used ?? 0),
    remaining: Number(raw?.remaining ?? 0),
    planCode: String(raw?.plan_code ?? fallbackPlan),
    upgradeTarget: (raw?.upgrade_target ?? null) as string | null,
    replayed: !!raw?.replayed,
  };
}

/** Non-consuming check: is there room left this month? */
export async function checkHomeownerQuota(
  supa: SupabaseClient,
  userId: string,
  feature: HomeownerFeature,
): Promise<QuotaResult> {
  const { data, error } = await supa.rpc("homeowner_usage_snapshot", { _user_id: userId });
  if (error) {
    console.error("[homeownerQuota] snapshot failed", error.message);
    // Fail open: never block a paying flow on an infra hiccup.
    return { allowed: true, unlimited: true, limit: null, used: 0, remaining: -1, planCode: "unknown", upgradeTarget: null };
  }
  const snap = (data ?? {}) as Record<string, number | string>;
  const limit = Number(
    feature === "ai_design_monthly" ? snap.ai_design_limit ?? -1 : snap.quote_analysis_limit ?? -1,
  );
  const used = Number(
    feature === "ai_design_monthly" ? snap.ai_design_used ?? 0 : snap.quote_analysis_used ?? 0,
  );
  const unlimited = limit === -1 || Number.isNaN(limit);
  return {
    allowed: unlimited || used < limit,
    unlimited,
    limit: unlimited ? -1 : limit,
    used,
    remaining: unlimited ? -1 : Math.max(limit - used, 0),
    planCode: String(snap.plan_code ?? "home_decouverte"),
    upgradeTarget: null,
  };
}

/** Consume one credit. Idempotent when the same key is replayed. */
export async function consumeHomeownerQuota(
  supa: SupabaseClient,
  userId: string,
  feature: HomeownerFeature,
  idempotencyKey?: string,
): Promise<QuotaResult> {
  const { data, error } = await supa.rpc("homeowner_consume_quota", {
    _user_id: userId,
    _feature_key: feature,
    _idempotency_key: idempotencyKey ?? null,
  });
  if (error) {
    console.error("[homeownerQuota] consume failed", error.message);
    return { allowed: true, unlimited: true, limit: null, used: 0, remaining: -1, planCode: "unknown", upgradeTarget: null };
  }
  return normalize((data ?? null) as Record<string, unknown> | null);
}

/** Canonical 429 body — the UI turns this into an upgrade CTA. */
export function quotaBlockedResponse(
  quota: QuotaResult,
  feature: HomeownerFeature,
  corsHeaders: Record<string, string>,
): Response {
  const target = quota.upgradeTarget ?? (quota.planCode === "home_plus" ? "home_signature" : "home_plus");
  const label = UPGRADE_LABEL[target] ?? "Plus";
  const message = feature === "ai_design_monthly"
    ? `Vous avez utilisé vos designs IA du mois. Passez à ${label} pour en obtenir plus.`
    : `Vous avez utilisé votre analyse de soumissions du mois. Passez à ${label} pour des analyses illimitées.`;

  return new Response(
    JSON.stringify({
      error: "Limite atteinte",
      quota_exceeded: true,
      feature,
      plan_code: quota.planCode,
      limit: quota.limit,
      used: quota.used,
      upgrade_target: target,
      upgrade_label: label,
      message,
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
