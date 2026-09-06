/**
 * UNPRO — Role Intent Service (canonical)
 *
 * P0 revenue fix: a contractor intent must NEVER silently become a homeowner.
 *
 * The selected role is persisted BEFORE auth starts (OAuth full-page redirect,
 * phone OTP, magic link) in both sessionStorage and localStorage so it survives
 * a new tab, a refresh, or the Supabase auth handshake clearing session storage.
 *
 * After auth it is applied idempotently by the existing `matching-profile`
 * server function. Privileged roles are never accepted from browser intent.
 *
 * Legacy key `unpro_prelogin_role` is kept as the storage key for backward
 * compatibility with pages that already write it.
 */
import { supabase } from "@/integrations/supabase/client";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

export const ROLE_INTENT_KEY = "unpro_prelogin_role";
const META_KEY = "unpro_prelogin_role_meta";
const TTL_MS = 60 * 60 * 1000; // 1h

/** Canonical `app_role` enum values that exist in the database. */
export type CanonicalRole = "homeowner" | "contractor" | "admin" | "partner" | "affiliate";

/**
 * Map every marketing/UI role key onto a value the database actually accepts.
 * `condo_manager` / `property_manager` are NOT in the enum — they are stored as
 * homeowner roles and distinguished by `profiles.account_type`.
 */
const ROLE_MAP: Record<string, CanonicalRole> = {
  homeowner: "homeowner",
  owner: "homeowner",
  proprietaire: "homeowner",
  contractor: "contractor",
  service_business: "contractor",
  entrepreneur: "contractor",
  professional: "contractor",
  pro: "contractor",
  condo_manager: "homeowner",
  property_manager: "homeowner",
  gestionnaire: "homeowner",
  partner: "homeowner",
  partenaire: "homeowner",
  affiliate: "affiliate",
  affilie: "affiliate",
  ambassador: "homeowner",
  municipality: "homeowner",
  public_org: "homeowner",
  enterprise: "homeowner",
  admin: "admin",
};

/** Account type stored on the profile (keeps the finer-grained UI distinction). */
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  condo_manager: "property_manager",
  property_manager: "property_manager",
  gestionnaire: "property_manager",
};

export interface RoleIntentMeta {
  rawRole: string;
  role: CanonicalRole;
  accountType: string;
  propertyType?: string;
  returnPath?: string;
  token?: string;
  prospectId?: string;
  leadId?: string;
  affiliateRef?: string;
  campaignId?: string;
  onboardingStep?: string;
  businessName?: string;
  city?: string;
  trade?: string;
  attribution?: Record<string, string>;
  timestamp: number;
}

export function toCanonicalRole(raw: string | null | undefined): CanonicalRole | null {
  if (!raw) return null;
  return ROLE_MAP[raw.trim().toLowerCase()] ?? null;
}

export function toAccountType(raw: string): string {
  const key = raw.trim().toLowerCase();
  return ACCOUNT_TYPE_MAP[key] ?? (ROLE_MAP[key] ?? "homeowner");
}

function writeBoth(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* noop */ }
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}
function readEither(key: string): string | null {
  try { const v = sessionStorage.getItem(key); if (v) return v; } catch { /* noop */ }
  try { return localStorage.getItem(key); } catch { return null; }
  return null;
}
function clearBoth(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* noop */ }
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

/**
 * Referral code already captured on this device (affiliate entry `/:slug`,
 * `?ref=` link, QR). Read-only: the affiliate attribution itself is never
 * written or invented here.
 */
export function readCapturedAffiliateRef(): string | undefined {
  try {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const fromUrl = params.get("ref") || params.get("aff") || params.get("affiliate");
    if (fromUrl) return fromUrl;
  } catch { /* noop */ }
  try {
    const raw = localStorage.getItem("unpro_ref");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { refCode?: string } | null;
    return parsed?.refCode || undefined;
  } catch {
    return undefined;
  }
}

/** Persist the selected role BEFORE any auth redirect. */
export function saveRoleIntent(
  rawRole: string,
  extra: Omit<Partial<RoleIntentMeta>, "rawRole" | "role" | "accountType" | "timestamp"> = {},
): RoleIntentMeta | null {
  const role = toCanonicalRole(rawRole);
  if (!role) return null;
  const meta: RoleIntentMeta = {
    rawRole,
    role,
    accountType: toAccountType(rawRole),
    propertyType: extra.propertyType,
    returnPath: extra.returnPath,
    token: extra.token,
    prospectId: extra.prospectId,
    leadId: extra.leadId,
    // Never lose an affiliate attribution captured before the role choice.
    affiliateRef: extra.affiliateRef ?? readCapturedAffiliateRef(),

    campaignId: extra.campaignId,
    onboardingStep: extra.onboardingStep,
    businessName: extra.businessName,
    city: extra.city,
    trade: extra.trade,
    attribution: extra.attribution,
    timestamp: Date.now(),
  };
  // Legacy key holds the raw role so existing readers keep working.
  writeBoth(ROLE_INTENT_KEY, rawRole);
  writeBoth(META_KEY, JSON.stringify(meta));
  return meta;
}

export function readRoleIntent(): RoleIntentMeta | null {
  // The legacy raw key is the *last explicit choice* written by any page.
  // It always wins over an older meta blob so a newer selection is never
  // overridden by a stale one (e.g. Signup abandoned, then /role revisited).
  const legacy = readEither(ROLE_INTENT_KEY);
  const legacyRole = toCanonicalRole(legacy);

  const raw = readEither(META_KEY);
  if (raw) {
    try {
      const meta = JSON.parse(raw) as RoleIntentMeta;
      const fresh = meta?.role && Date.now() - meta.timestamp <= TTL_MS;
      if (fresh) {
        if (!legacyRole || legacyRole === meta.role) return meta;
        // Divergence: the raw key is newer/explicit — drop the stale meta.
        clearBoth(META_KEY);
      } else {
        clearBoth(META_KEY);
      }
    } catch {
      clearBoth(META_KEY);
    }
  }

  if (!legacy || !legacyRole) return null;
  return {
    rawRole: legacy,
    role: legacyRole,
    accountType: toAccountType(legacy),
    timestamp: Date.now(),
  };
}

export function clearRoleIntent() {
  clearBoth(ROLE_INTENT_KEY);
  clearBoth(META_KEY);
}

export interface ApplyRoleIntentResult {
  role: CanonicalRole | null;
  applied: boolean;
  error?: string;
}

/**
 * Apply the stored role intent to the freshly authenticated user.
 * Idempotent: safe on refresh, existing users, and repeated callbacks.
 * The intent is only cleared once the role row is confirmed.
 */
export async function applyRoleIntent(
  user: { id: string; email?: string | null },
  meta?: RoleIntentMeta | null,
): Promise<ApplyRoleIntentResult> {
  const intent = meta ?? readRoleIntent();
  if (!intent) return { role: null, applied: false };

  if (intent.role === "contractor") {
    const { data, error } = await supabase.functions.invoke("matching-profile", {
      body: {
        action: "activate_account",
        activation_token: intent.token ?? null,
        context: {
          prospect_id: intent.prospectId ?? null,
          lead_id: intent.leadId ?? null,
          affiliate_ref: intent.affiliateRef ?? null,
          campaign_id: intent.campaignId ?? null,
          onboarding_step: intent.onboardingStep ?? null,
          business_name: intent.businessName ?? null,
          city: intent.city ?? null,
          trade: intent.trade ?? null,
          utm: intent.attribution ?? {},
        },
      },
    });
    if (error || !(data as { ok?: boolean } | null)?.ok) {
      const message = error?.message || (data as { error?: string; reason?: string } | null)?.error ||
        (data as { reason?: string } | null)?.reason || "contractor_activation_failed";
      console.error("[roleIntent] secure contractor activation failed", message);
      return { role: intent.role, applied: false, error: message };
    }
    const result = data as { contractor_id?: string; business_name?: string; free_offer_accepted?: boolean; free_offer_id?: string };
    await logFunnelEvent({
      event_type: "contractor_profile_created",
      step: "role_intent",
      contractor_id: result.contractor_id ?? null,
      email: user.email ?? null,
      metadata: { return_path: intent.returnPath ?? null, business_name: result.business_name ?? null },
    });
    if (result.free_offer_accepted) {
      await logFunnelEvent({
        event_type: "free_offer_accepted",
        step: "role_intent",
        contractor_id: result.contractor_id ?? null,
        email: user.email ?? null,
        metadata: { offer_id: result.free_offer_id ?? null },
      });
    }
  } else if (intent.role === "homeowner") {
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      account_type: intent.accountType,
    } as never, { onConflict: "user_id", ignoreDuplicates: false });
    if (error) return { role: intent.role, applied: false, error: error.message };
  } else {
    return { role: intent.role, applied: false, error: "role_requires_server_approval" };
  }


  clearRoleIntent();
  return { role: intent.role, applied: true };
}

/** Post-auth destination for a canonical role, honouring an explicit return path. */
export function destinationForRole(role: CanonicalRole | null, returnPath?: string | null): string {
  if (returnPath && !/^\/(login|signup|auth\/callback|role)\b/.test(returnPath)) return returnPath;
  switch (role) {
    case "admin": return "/admin";
    case "contractor": return "/join/profile";
    case "partner": return "/partenaire/dashboard";
    case "affiliate": return "/affilies/dashboard";
    default: return "/dashboard";
  }
}
