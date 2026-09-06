/**
 * UNPRO — Role Intent Service (canonical)
 *
 * P0 revenue fix: a contractor intent must NEVER silently become a homeowner.
 *
 * The selected role is persisted BEFORE auth starts (OAuth full-page redirect,
 * phone OTP, magic link) in both sessionStorage and localStorage so it survives
 * a new tab, a refresh, or the Supabase auth handshake clearing session storage.
 *
 * After auth it is applied idempotently to:
 *  - `user_roles.role` (strict `app_role` enum: homeowner | contractor | admin | partner | affiliate)
 *  - `profiles.account_type` (free-text, mirrors the canonical role)
 *  - a `contractors` stub row for contractor intents
 *
 * Legacy key `unpro_prelogin_role` is kept as the storage key for backward
 * compatibility with pages that already write it.
 */
import { supabase } from "@/integrations/supabase/client";

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

/** Persist the selected role BEFORE any auth redirect. */
export function saveRoleIntent(
  rawRole: string,
  extra: { propertyType?: string; returnPath?: string } = {},
): RoleIntentMeta | null {
  const role = toCanonicalRole(rawRole);
  if (!role) return null;
  const meta: RoleIntentMeta = {
    rawRole,
    role,
    accountType: toAccountType(rawRole),
    propertyType: extra.propertyType,
    returnPath: extra.returnPath,
    timestamp: Date.now(),
  };
  // Legacy key holds the raw role so existing readers keep working.
  writeBoth(ROLE_INTENT_KEY, rawRole);
  writeBoth(META_KEY, JSON.stringify(meta));
  return meta;
}

export function readRoleIntent(): RoleIntentMeta | null {
  const raw = readEither(META_KEY);
  if (raw) {
    try {
      const meta = JSON.parse(raw) as RoleIntentMeta;
      if (meta?.role && Date.now() - meta.timestamp <= TTL_MS) return meta;
    } catch { /* fall through */ }
  }
  // Legacy fallback: only the raw role key is present.
  const legacy = readEither(ROLE_INTENT_KEY);
  const role = toCanonicalRole(legacy);
  if (!legacy || !role) return null;
  return { rawRole: legacy, role, accountType: toAccountType(legacy), timestamp: Date.now() };
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

  const { error: roleErr } = await supabase
    .from("user_roles")
    .upsert({ user_id: user.id, role: intent.role as never }, { onConflict: "user_id,role" });

  if (roleErr) {
    console.error("[roleIntent] user_roles upsert failed", roleErr);
    return { role: intent.role, applied: false, error: roleErr.message };
  }

  try {
    await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          account_type: intent.accountType,
        } as never,
        { onConflict: "user_id", ignoreDuplicates: false },
      );
  } catch (e) {
    console.warn("[roleIntent] profile account_type upsert non-fatal", e);
  }

  if (intent.role === "contractor") {
    try {
      await supabase
        .from("contractors")
        .upsert({ user_id: user.id, email: user.email || "" } as never, { onConflict: "user_id" });
    } catch (e) {
      console.warn("[roleIntent] contractor stub non-fatal", e);
    }
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
