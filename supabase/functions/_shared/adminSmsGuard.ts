/**
 * UNPRO — Admin-only SMS guard.
 * Monitoring/heartbeat/debug SMS must NEVER reach prospects or contractors.
 * Any body matching an ADMIN_ONLY_SMS_TAG requires the recipient to be
 * whitelisted in `public.admin_sms_recipients`.
 */

export const ADMIN_ONLY_SMS_TAGS = [
  "test système",
  "test systeme",
  "heartbeat",
  "monitoring",
  "debug",
  "worker check",
  "cron test",
];

export function isAdminOnlyBody(body: string): boolean {
  const b = (body ?? "").toLowerCase();
  return ADMIN_ONLY_SMS_TAGS.some((tag) => b.includes(tag));
}

function normalizePhone(p: string): string {
  return (p ?? "").replace(/[^\d+]/g, "");
}

export interface AdminGuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Assert an admin-only SMS is only sent to a whitelisted admin phone.
 * Pass the service-role Supabase client. Returns { allowed, reason }.
 */
export async function assertAdminOnlySms(
  admin: any,
  body: string,
  recipient: string,
): Promise<AdminGuardResult> {
  if (!isAdminOnlyBody(body)) return { allowed: true };
  const target = normalizePhone(recipient);
  if (!target) return { allowed: false, reason: "empty_recipient" };
  // Env-based fallback: the server-configured test destination is always trusted.
  const envDest = normalizePhone(
    (typeof Deno !== "undefined"
      ? (Deno.env.get("SMS_TEST_DESTINATION_NUMBER") ?? Deno.env.get("ADMIN_TEST_PHONE") ?? "")
      : ""),
  );
  if (envDest && envDest === target) return { allowed: true };
  const { data, error } = await admin
    .from("admin_sms_recipients")
    .select("phone")
    .limit(500);
  if (error) return { allowed: false, reason: `whitelist_read_error:${error.message}` };
  const set = new Set(((data ?? []) as { phone: string }[]).map((r) => normalizePhone(r.phone)));
  if (set.has(target)) return { allowed: true };
  return { allowed: false, reason: "recipient_not_in_admin_whitelist" };
}
