/**
 * UNPRO — Admin guard with retry, cache, and email allowlist fallback.
 * Prevents production lockouts from transient role-query timeouts.
 */
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_EMAILS = ["yturcotte@gmail.com"];
const CACHE_KEY = "unpro_admin_validated_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = { user_id: string; email: string | null; ts: number };

export function isAdminCached(userId: string): boolean {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.user_id !== userId) return false;
    if (Date.now() - entry.ts > CACHE_TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export function setAdminCached(userId: string, email: string | null) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ user_id: userId, email, ts: Date.now() } satisfies CacheEntry),
    );
  } catch {
    /* noop */
  }
}

export function clearAdminCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* noop */ }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export type AdminValidationResult =
  | { allowed: true; source: "cache" | "email" | "user_roles" | "profiles" }
  | { allowed: false; reason: "no_role" | "load_error"; detail?: string };

export async function validateAdmin(
  userId: string,
  email: string | null,
): Promise<AdminValidationResult> {
  // 1. Cache hit.
  if (isAdminCached(userId)) {
    return { allowed: true, source: "cache" };
  }

  // 2. Email allowlist fallback (always passes for known admins).
  const normalizedEmail = email?.toLowerCase().trim() ?? null;
  if (normalizedEmail && ADMIN_EMAILS.includes(normalizedEmail)) {
    setAdminCached(userId, email);
    return { allowed: true, source: "email" };
  }

  // 3. Query user_roles with retry (3 attempts, exponential backoff).
  let lastError: string | undefined;
  const delays = [0, 1000, 2000];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
    try {
      const { data, error } = await withTimeout(
        supabase.from("user_roles").select("role").eq("user_id", userId),
        8000,
      );
      if (error) {
        lastError = error.message;
        continue;
      }
      const isAdminRow = (data ?? []).some((r: any) => r.role === "admin");
      if (isAdminRow) {
        setAdminCached(userId, email);
        return { allowed: true, source: "user_roles" };
      }
      // No admin row found — try profiles fallback before denying.
      break;
    } catch (e: any) {
      lastError = String(e?.message ?? e);
    }
  }

  // 4. profiles.role fallback (best-effort).
  try {
    const { data, error } = await withTimeout(
      supabase.from("profiles").select("role").eq("user_id", userId).maybeSingle(),
      6000,
    );
    if (!error && (data as any)?.role === "admin") {
      setAdminCached(userId, email);
      return { allowed: true, source: "profiles" };
    }
  } catch (e: any) {
    lastError = lastError ?? String(e?.message ?? e);
  }

  if (lastError) {
    return { allowed: false, reason: "load_error", detail: lastError };
  }
  return { allowed: false, reason: "no_role" };
}
