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
import { DAILY_LIMIT_COPY, nextTorontoMidnightISO } from "./usagePolicyCopy.ts";

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
  /** 'monthly' = quota commercial du forfait, 'daily' = garde-fou anti-abus invisible. */
  blockedBy?: "monthly" | "daily" | null;
  dailyLimit?: number | null;
  dailyUsed?: number;
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
    blockedBy: (raw?.blocked_by ?? null) as "monthly" | "daily" | null,
    dailyLimit: (raw?.daily_limit ?? null) as number | null,
    dailyUsed: Number(raw?.daily_used ?? 0),
  };
}

/** Non-consuming check: monthly quota + invisible daily guardrail (most restrictive wins). */
export async function checkHomeownerQuota(
  supa: SupabaseClient,
  userId: string,
  feature: HomeownerFeature,
): Promise<QuotaResult> {
  const { data, error } = await supa.rpc("homeowner_quota_check", {
    _user_id: userId,
    _feature_key: feature,
  });
  if (error) {
    console.error("[homeownerQuota] check failed", error.message);
    // Fail open: never block a paying flow on an infra hiccup.
    return {
      allowed: true, unlimited: true, limit: null, used: 0, remaining: -1,
      planCode: "unknown", upgradeTarget: null, blockedBy: null,
    };
  }
  return normalize((data ?? null) as Record<string, unknown> | null);
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

/** Canonical 429 body. Monthly = upgrade CTA. Daily = premium "revenez demain" UX. */
export function quotaBlockedResponse(
  quota: QuotaResult,
  feature: HomeownerFeature,
  corsHeaders: Record<string, string>,
): Response {
  if (quota.blockedBy === "daily") {
    const copy = DAILY_LIMIT_COPY[feature];
    return new Response(
      JSON.stringify({
        error: copy.title,
        daily_limit_reached: true,
        feature,
        plan_code: quota.planCode,
        title: copy.title,
        body: copy.body,
        reassurance: copy.reassurance,
        cta_label: copy.ctaLabel,
        cta_href: copy.ctaHref,
        resets_at: nextTorontoMidnightISO(),
        message: `${copy.title} ${copy.body} ${copy.reassurance}`,
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

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
