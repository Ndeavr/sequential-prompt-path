/**
 * UNPRO — Cross-device role intent (server-side, opaque, single-use)
 *
 * P0: a magic link can be opened in another browser or on another device, where
 * localStorage/sessionStorage are empty. The public role choice must survive.
 *
 * Design:
 *  - Before sending the magic link we mint a short opaque token and store the
 *    intent SERVER-SIDE (`public.auth_role_intents`), keyed by sha256(token) and
 *    bound to sha256(normalized email), with a TTL and single-use semantics.
 *  - Only the opaque token travels in `emailRedirectTo` (`?ri=`). No email,
 *    no role, no metadata in the URL.
 *  - After the session exists we consume it server-side; the server re-checks
 *    the authenticated user's email, TTL and single use.
 *  - Only self-assignable public roles are ever accepted (homeowner/contractor).
 */
import { supabase } from "@/integrations/supabase/client";
import { toAccountType, toCanonicalRole, type RoleIntentMeta } from "@/services/auth/roleIntent";

export const INTENT_TOKEN_PARAM = "ri";
const TOKEN_STASH_KEY = "unpro_role_intent_token";

/** Roles a public, unauthenticated visitor is allowed to self-assign. */
export const SELF_ASSIGNABLE_ROLES = ["homeowner", "contractor"] as const;
export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

export function isSelfAssignableRole(role: string | null | undefined): role is SelfAssignableRole {
  return !!role && (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

/**
 * Map a UI role key onto a self-assignable role + account type.
 * Privileged roles (admin/affiliate/partner) are refused outright.
 */
export function resolvePublicRoleSelection(
  rawRole: string | null | undefined,
): { role: SelfAssignableRole; accountType: string } | null {
  const canonical = toCanonicalRole(rawRole ?? null);
  if (!canonical || !isSelfAssignableRole(canonical)) return null;
  const accountType = toAccountType(rawRole as string);
  const safeAccountType =
    accountType === "property_manager" || accountType === "contractor" || accountType === "homeowner"
      ? accountType
      : canonical;
  return { role: canonical, accountType: safeAccountType };
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function isSafeReturnPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!/^\/[^/]/.test(path)) return false;
  return !/^\/(login|signup|logout|auth\/callback|role)(\/|\?|$)/.test(path);
}

/**
 * Mint a server-side intent and return the opaque token to append to the
 * magic-link redirect. Returns null when there is nothing legitimate to carry.
 */
export async function issueRoleIntentToken(
  email: string,
  intent: RoleIntentMeta | null,
): Promise<string | null> {
  if (!intent) return null;
  const selection = resolvePublicRoleSelection(intent.rawRole ?? intent.role);
  if (!selection) return null;

  const token = randomToken();
  const { data, error } = await supabase.rpc("create_auth_role_intent", {
    _token: token,
    _email: email.trim().toLowerCase(),
    _role: selection.role,
    _account_type: selection.accountType,
    _return_path: isSafeReturnPath(intent.returnPath) ? intent.returnPath : null,
    _affiliate_ref: intent.affiliateRef ?? null,
    _metadata: {
      activation_token: intent.token ?? null,
      prospect_id: intent.prospectId ?? null,
      lead_id: intent.leadId ?? null,
      campaign_id: intent.campaignId ?? null,
      onboarding_step: intent.onboardingStep ?? null,
      business_name: intent.businessName ?? null,
      city: intent.city ?? null,
      trade: intent.trade ?? null,
      utm: intent.attribution ?? {},
    },
  } as never);

  if (error || !(data as { ok?: boolean } | null)?.ok) {
    console.warn("[crossDeviceRoleIntent] mint failed", error?.message ?? data);
    return null;
  }
  return token;
}

/** Append the opaque token to a redirect URL. */
export function withIntentToken(url: string, token: string | null): string {
  if (!token) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${INTENT_TOKEN_PARAM}=${encodeURIComponent(token)}`;
}

/**
 * Read the token from the current URL (magic-link landing) and stash it so a
 * refresh or an internal redirect does not lose it.
 */
export function readIntentTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get(INTENT_TOKEN_PARAM);
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get(INTENT_TOKEN_PARAM);
    const token = fromQuery || fromHash;
    if (token) {
      try { sessionStorage.setItem(TOKEN_STASH_KEY, token); } catch { /* noop */ }
      return token;
    }
    return sessionStorage.getItem(TOKEN_STASH_KEY);
  } catch {
    return null;
  }
}

export function clearStashedIntentToken() {
  try { sessionStorage.removeItem(TOKEN_STASH_KEY); } catch { /* noop */ }
}

export interface ServerRoleIntent {
  role: SelfAssignableRole;
  accountType: string;
  returnPath: string | null;
  affiliateRef: string | null;
  metadata: Record<string, unknown>;
  token: string;
}

/** Consume the server-side intent for the authenticated user. */
export async function consumeRoleIntentToken(
  token: string,
): Promise<{ intent: ServerRoleIntent | null; reason?: string }> {
  const { data, error } = await supabase.rpc("consume_auth_role_intent", { _token: token } as never);
  if (error) return { intent: null, reason: error.message };
  const payload = data as {
    ok?: boolean; reason?: string; role?: string; account_type?: string;
    return_path?: string | null; affiliate_ref?: string | null; metadata?: Record<string, unknown>;
  } | null;
  if (!payload?.ok) return { intent: null, reason: payload?.reason ?? "intent_unavailable" };
  if (!isSelfAssignableRole(payload.role)) return { intent: null, reason: "role_not_self_assignable" };
  return {
    intent: {
      role: payload.role,
      accountType: payload.account_type ?? payload.role,
      returnPath: isSafeReturnPath(payload.return_path) ? payload.return_path : null,
      affiliateRef: payload.affiliate_ref ?? null,
      metadata: payload.metadata ?? {},
      token,
    },
  };
}

/** Put a consumed intent back in play when applying it failed. */
export async function releaseRoleIntentToken(token: string): Promise<void> {
  try {
    await supabase.rpc("release_auth_role_intent", { _token: token } as never);
  } catch { /* noop */ }
}

/** Convert a server intent into the local meta shape used by applyRoleIntent. */
export function serverIntentToMeta(intent: ServerRoleIntent): RoleIntentMeta {
  const meta = intent.metadata ?? {};
  const str = (k: string) => {
    const v = meta[k];
    return typeof v === "string" && v.trim() ? v : undefined;
  };
  return {
    rawRole: intent.role,
    role: intent.role,
    accountType: intent.accountType,
    returnPath: intent.returnPath ?? undefined,
    token: str("activation_token"),
    prospectId: str("prospect_id"),
    leadId: str("lead_id"),
    affiliateRef: intent.affiliateRef ?? undefined,
    campaignId: str("campaign_id"),
    onboardingStep: str("onboarding_step"),
    businessName: str("business_name"),
    city: str("city"),
    trade: str("trade"),
    attribution: (meta.utm as Record<string, string>) ?? undefined,
    timestamp: Date.now(),
  };
}
