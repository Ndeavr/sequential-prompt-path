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

// Direct landing URLs that bypass tracking — sends must be blocked if found.
const BLOCKED_RAW_URL_RE = /https?:\/\/(?:app\.)?unpro\.ca\/(?:onboarding|signup|pro\/onboarding|pro\/signup|entrepreneur\/onboarding)\b/i;

// Reply CTA = explicit "répondez OUI" instruction. Required on every outreach message.
const REPLY_CTA_RE = /(répondez|repondez|reply).{0,40}\bOUI\b/i;

export function hasReplyCta(body: string): boolean {
  return !!body && REPLY_CTA_RE.test(body);
}

export function validateCta(body: string): { ok: boolean; cta_urls: string[]; has_tracked_cta: boolean; reason?: string } {
  const urls = extractUrls(body);
  if (urls.length === 0) return { ok: false, cta_urls: [], has_tracked_cta: false, reason: "missing_cta" };
  for (const u of urls) {
    if (BLOCKED_RAW_URL_RE.test(u) && !isTrackedUrl(u)) {
      return { ok: false, cta_urls: urls, has_tracked_cta: false, reason: "direct_onboarding_url_forbidden" };
    }
  }
  const has_tracked_cta = urls.some(isTrackedUrl);
  if (!has_tracked_cta) {
    return { ok: false, cta_urls: urls, has_tracked_cta: false, reason: "no_tracked_cta" };
  }
  return { ok: true, cta_urls: urls, has_tracked_cta };
}

/**
 * MANDATORY OUTREACH RULE — every email/SMS leaving the system MUST contain:
 *   1. a tracked CTA (unpro.ca/r/{id})
 *   2. a reply CTA ("Répondez … OUI")
 * Either missing → BLOCKED with reason=missing_cta.
 */
export function validateOutreachMessage(
  body: string,
  _channel: "email" | "sms",
): { ok: boolean; cta_urls: string[]; has_tracked_cta: boolean; has_reply_cta: boolean; reason?: string } {
  const cta = validateCta(body);
  const has_reply_cta = hasReplyCta(body);
  if (!cta.ok) return { ok: false, cta_urls: cta.cta_urls, has_tracked_cta: cta.has_tracked_cta, has_reply_cta, reason: cta.reason ?? "missing_cta" };
  if (!has_reply_cta) return { ok: false, cta_urls: cta.cta_urls, has_tracked_cta: cta.has_tracked_cta, has_reply_cta, reason: "missing_reply_cta" };
  return { ok: true, cta_urls: cta.cta_urls, has_tracked_cta: cta.has_tracked_cta, has_reply_cta };
}

// FR reply-as-conversion footer. Appended to every outreach email body.
export const REPLY_FOOTER_FR = `
<p style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#374151;font-size:14px;line-height:1.6;">
  Vous préférez ne pas cliquer ? Répondez simplement à ce courriel avec
  <strong style="background:#fef3c7;padding:2px 6px;border-radius:4px;">OUI</strong>
  et nous vous enverrons votre rapport gratuitement.
</p>`.trim();

export function withReplyFooter(html: string): string {
  if (!html) return html;
  if (hasReplyCta(html)) return html;
  return html + "\n" + REPLY_FOOTER_FR;
}

// SMS-safe reply line. Appended if SMS body lacks reply CTA.
export const SMS_REPLY_LINE = "Ou répondez OUI.";

export function withSmsReplyLine(body: string): string {
  if (!body) return body;
  if (hasReplyCta(body)) return body;
  return body.trimEnd() + "\n" + SMS_REPLY_LINE;
}

