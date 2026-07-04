// Aggregator / lead-seller email suppression.
// Any prospect whose contact email lives on one of these domains must never
// be emailed, enriched, or personalized — they resell leads and are hostile
// to the UNPRO acquisition motion.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const AGGREGATOR_DOMAINS: ReadonlySet<string> = new Set([
  "renoassistance.ca",
  "soumissionrenovation.com",
  "soumissionsmaison.com",
  "bark.com",
  "bark.co.uk",
  "homestars.com",
  "trustedpros.ca",
  "renovationfind.com",
  "renovationquotes.com",
]);

let cache: { at: number; set: Set<string> } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function loadSuppressionDomains(): Promise<Set<string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.set;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const merged = new Set<string>(AGGREGATOR_DOMAINS);
  if (url && key) {
    try {
      const supa = createClient(url, key);
      const { data } = await supa
        .from("acquisition_suppression_domains")
        .select("domain")
        .eq("active", true);
      for (const row of data ?? []) merged.add(String(row.domain).toLowerCase());
    } catch (_) { /* fall back to hardcoded */ }
  }
  cache = { at: Date.now(), set: merged };
  return merged;
}

export function extractEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export async function isAggregatorEmail(email: string | null | undefined): Promise<boolean> {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  const set = await loadSuppressionDomains();
  return set.has(domain);
}

// Synchronous variant using only the hardcoded set (safe for hot paths).
export function isAggregatorEmailSync(email: string | null | undefined): boolean {
  const domain = extractEmailDomain(email);
  if (!domain) return false;
  return AGGREGATOR_DOMAINS.has(domain);
}
