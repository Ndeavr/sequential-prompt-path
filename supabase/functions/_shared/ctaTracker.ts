// PROTECTED — CTA tracker helper. Every outreach URL MUST go through /r/{id}.
// Provides: createTrackedLink, wrapAllUrls, extractUrls, validateCta.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TRACKER_BASE = "https://unpro.ca/r/";
const INTERNAL_HOST_RE = /^https?:\/\/(?:[a-z0-9-]+\.)*unpro\.ca\b/i;
const URL_RE = /https?:\/\/[^\s<>"')]+/g;

function shortId(len = 10): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export type TrackCtx = {
  prospect_id?: string | null;
  contractor_id?: string | null;
  profile_id?: string | null;
  campaign?: string | null;
  channel?: string | null;
  metadata?: Record<string, unknown>;
};

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _sb;
}

export async function createTrackedLink(destination_url: string, ctx: TrackCtx = {}): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = shortId(10);
    const { error } = await sb().from("acquisition_tracking_links").insert({
      id,
      destination_url,
      prospect_id: ctx.prospect_id ?? null,
      contractor_id: ctx.contractor_id ?? null,
      profile_id: ctx.profile_id ?? null,
      campaign: ctx.campaign ?? null,
      channel: ctx.channel ?? "email",
      metadata: ctx.metadata ?? {},
    });
    if (!error) return `${TRACKER_BASE}${id}`;
    if (!String(error.message).includes("duplicate")) throw new Error(`tracker_insert_failed: ${error.message}`);
  }
  throw new Error("tracker_insert_failed_collision");
}

export function extractUrls(body: string): string[] {
  if (!body) return [];
  const matches = body.match(URL_RE) ?? [];
  return Array.from(new Set(matches.map((u) => u.replace(/[.,;:!?)]+$/, ""))));
}

export function isTrackedUrl(u: string): boolean {
  return u.startsWith(TRACKER_BASE) || /\/r\/[a-z0-9]{6,}/i.test(u);
}

/** Replace every internal (unpro.ca) URL in `body` with a tracked /r/{id}. External URLs untouched. */
export async function wrapAllUrls(body: string, ctx: TrackCtx = {}): Promise<{ body: string; cta_urls: string[]; has_tracked_cta: boolean }> {
  if (!body) return { body, cta_urls: [], has_tracked_cta: false };
  const found = extractUrls(body);
  const tracked: string[] = [];
  let out = body;
  for (const url of found) {
    if (isTrackedUrl(url)) { tracked.push(url); continue; }
    if (!INTERNAL_HOST_RE.test(url)) continue; // skip external
    try {
      const t = await createTrackedLink(url, ctx);
      // Replace all occurrences of the raw URL
      out = out.split(url).join(t);
      tracked.push(t);
    } catch (e) {
      console.error("[ctaTracker] wrap failed", url, e);
    }
  }
  return { body: out, cta_urls: tracked, has_tracked_cta: tracked.some(isTrackedUrl) };
}

export function validateCta(body: string): { ok: boolean; cta_urls: string[]; has_tracked_cta: boolean; reason?: string } {
  const urls = extractUrls(body);
  if (urls.length === 0) return { ok: false, cta_urls: [], has_tracked_cta: false, reason: "missing_cta" };
  const has_tracked_cta = urls.some(isTrackedUrl);
  return { ok: true, cta_urls: urls, has_tracked_cta };
}
