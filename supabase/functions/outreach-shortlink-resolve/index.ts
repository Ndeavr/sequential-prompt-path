// UNPRO — Short link resolver for /r/:token
// Order of lookup (highest → lowest priority):
//   1) acquisition_tracking_links.id       → 302 destination_url  (SMS/email outreach CTA)
//   2) outreach_messages.short_link_token  → legacy landing_token path
//
// GET-only semantics:
//  - Never consumes/invalidates the token.
//  - Skips ALL side-effects (counter update, event log, funnel bump) for bots,
//    prefetch, HEAD/OPTIONS and link-preview scanners. The URL is still resolved.
//  - Marking a token "used" is the job of downstream activation flows, not this resolver.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Best-effort bot / prefetch classifier. Never blocks the redirect — only
// suppresses side-effects so a link-preview crawler cannot "consume" a link.
function isBotOrPrefetch(req: Request, hintFromClient?: boolean): boolean {
  if (hintFromClient) return true;
  const purpose = (req.headers.get("purpose") || req.headers.get("sec-purpose") || "").toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview")) return true;
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true;
  return /unpro-qa|bot|crawler|spider|preview|slackbot|discordbot|whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegrambot|skypeuripreview|embedly|quora link preview|pinterest|redditbot|applebot|bingpreview|google-inspection|googlebot|petalbot|semrushbot|ahrefsbot|dotbot|okhttp|python-requests|curl|wget|headless/i.test(ua);
}

function maskDest(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = typeof body?.token === "string" ? body.token.trim() : undefined;
    const bot = isBotOrPrefetch(req, body?.prefetch === true);
    if (!token) return json({ error: "missing_token" }, 400);

    // Basic sanity: alphanumeric, dash/underscore, 6-64 chars.
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) {
      return json({ error: "invalid_token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const nowIso = new Date().toISOString();
    const ua = req.headers.get("user-agent");
    const referer = req.headers.get("referer");

    // 1) Canonical outreach tracking link ---------------------------------
    const { data: link } = await supabase
      .from("acquisition_tracking_links")
      .select("id, destination_url, prospect_id, contractor_id, profile_id, channel, campaign, click_count, first_click_at")
      .eq("id", token)
      .maybeSingle();

    if (link?.destination_url) {
      if (!bot) {
        // Non-destructive counter bump (never consumes).
        supabase
          .from("acquisition_tracking_links")
          .update({
            click_count: (link.click_count ?? 0) + 1,
            first_click_at: link.first_click_at ?? nowIso,
            last_click_at: nowIso,
          })
          .eq("id", token)
          .then(() => {}, (e) => console.error("[shortlink] counter", e));

        logAcquisitionEvent({
          prospect_id: link.prospect_id,
          contractor_id: link.contractor_id,
          profile_id: link.profile_id,
          tracking_id: token,
          channel: (link.channel as any) || "web",
          event_type: "clicked",
          provider: "app",
          provider_event_id: `${token}:${nowIso}`,
          source_table: "acquisition_tracking_links",
          source_row_id: token,
          metadata: { user_agent: ua, referer, campaign: link.campaign, dest: maskDest(link.destination_url) },
        }).catch(() => {});
      }
      return json({
        redirect_url: link.destination_url,
        source: "tracking_link",
        prospect_id: link.prospect_id ?? null,
        bot,
      });
    }

    // 2) Legacy outreach_messages fallback --------------------------------
    const { data: msg } = await supabase
      .from("outreach_messages")
      .select("id, prospect_id, campaign_id, clicked_at")
      .eq("short_link_token", token)
      .maybeSingle();

    if (msg) {
      let landingToken: string | null = null;
      if (msg.prospect_id) {
        const { data: p } = await supabase
          .from("prospects")
          .select("landing_token, funnel_status")
          .eq("id", msg.prospect_id)
          .maybeSingle();
        landingToken = p?.landing_token ?? null;

        if (!bot) {
          const upstream = ["scraped","needs_validation","ready_to_contact","sms_queued","sms_sent","sms_delivered"];
          if (p && upstream.includes(p.funnel_status ?? "scraped")) {
            supabase.from("prospects").update({ funnel_status: "sms_clicked" }).eq("id", msg.prospect_id)
              .then(() => {}, (e) => console.error("[shortlink] funnel bump", e));
          }
        }
      }

      if (!bot && !msg.clicked_at) {
        supabase.from("outreach_messages").update({ clicked_at: nowIso }).eq("id", msg.id)
          .then(() => {}, (e) => console.error("[shortlink] clicked_at", e));
      }
      if (!bot) {
        supabase.from("outreach_click_events").insert({
          prospect_id: msg.prospect_id,
          campaign_id: msg.campaign_id,
          message_id: msg.id,
          clicked_at: nowIso,
          user_agent: ua,
        } as never).then(() => {}, () => {});
      }

      return json({
        redirect_url: landingToken ? `/invitation/${landingToken}` : null,
        landing_token: landingToken,
        source: "outreach_message",
        bot,
      });
    }

    // 3) Unknown token — log without leaking anything
    if (!bot) {
      logAcquisitionEvent({
        channel: "web",
        event_type: "failed",
        provider: "app",
        source_table: "acquisition_tracking_links",
        source_row_id: token.slice(0, 4) + "…",
        metadata: { reason: "token_not_found", user_agent: ua, referer },
      }).catch(() => {});
    }
    return json({ error: "not_found" }, 404);
  } catch (e: any) {
    console.error("[outreach-shortlink-resolve]", e?.message || e);
    return json({ error: "internal_error" }, 500);
  }
});
