// UNPRO — Phase 3: public click tracker
// GET /engagement-track-click?t=<tracking_id>&msg=<provider_message_id>&ch=<channel>
// Records a click, updates the tracking link, logs the engagement event, then 302 redirects.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FALLBACK_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://unpro.ca";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const bytes = new TextEncoder().encode(ip + ":unpro");
  let h = 0;
  for (const b of bytes) h = (h * 31 + b) & 0xffffffff;
  return h.toString(16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t") ?? url.searchParams.get("tracking_id");
  const providerMsg = url.searchParams.get("msg");
  const channel = url.searchParams.get("ch") ?? "unknown";
  const explicitDest = url.searchParams.get("u");

  let destination = explicitDest || FALLBACK_URL;
  let contractorId: string | null = null;
  let prospectId: string | null = null;

  try {
    if (trackingId) {
      const { data: link } = await supabase
        .from("acquisition_tracking_links")
        .select("id, destination_url, contractor_id, prospect_id, channel, click_count")
        .eq("id", trackingId)
        .maybeSingle();

      if (link) {
        destination = link.destination_url || destination;
        contractorId = link.contractor_id;
        prospectId = link.prospect_id;

        await supabase
          .from("acquisition_tracking_links")
          .update({
            click_count: (link.click_count ?? 0) + 1,
            first_click_at: link.click_count ? undefined : new Date().toISOString(),
            last_click_at: new Date().toISOString(),
          })
          .eq("id", trackingId);
      }
    }

    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;

    await supabase.from("click_events").insert({
      tracking_id: trackingId,
      channel,
      provider: channel === "sms" ? "twilio" : channel === "email" ? "resend" : null,
      provider_message_id: providerMsg,
      destination_url: destination,
      user_agent: req.headers.get("user-agent"),
      referer: req.headers.get("referer"),
      ip_hash: hashIp(ip),
      source_table: "acquisition_tracking_links",
      source_row_id: trackingId,
      payload: Object.fromEntries(url.searchParams),
    });

    await supabase.rpc("record_engagement_event", {
      _event_type: "clicked",
      _channel: channel,
      _status: "clicked",
      _provider: channel === "sms" ? "twilio" : channel === "email" ? "resend" : null,
      _provider_message_id: providerMsg,
      _tracking_id: trackingId,
      _contractor_id: contractorId,
      _prospect_id: prospectId,
      _destination_url: destination,
      _source_table: "acquisition_tracking_links",
      _source_row_id: trackingId,
      _metadata: Object.fromEntries(url.searchParams),
    });

    // Mirror on original outreach log (best-effort)
    if (providerMsg) {
      if (channel === "email") {
        await supabase
          .from("acq_email_logs")
          .update({ status: "clicked", clicked_at: new Date().toISOString() })
          .eq("provider_message_id", providerMsg);
      } else if (channel === "sms") {
        await supabase
          .from("acq_sms_logs")
          .update({ status: "clicked" })
          .eq("provider_message_id", providerMsg);
      }
    }
  } catch (e) {
    console.error("[engagement-track-click]", e);
  }

  return new Response(null, {
    status: 302,
    headers: { ...cors, Location: destination, "Cache-Control": "no-store" },
  });
});
