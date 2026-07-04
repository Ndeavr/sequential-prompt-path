// Sends 24h and 48h follow-ups. Safe to call repeatedly; idempotent per phase.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";
import { renderFollowup } from "../_shared/smsSprintVariants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_BASE = Deno.env.get("PUBLIC_APP_URL") ?? "https://unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch initial-sent messages older than 24h
    const now = Date.now();
    const cutoff24 = new Date(now - 24 * 3600 * 1000).toISOString();
    const cutoff48 = new Date(now - 48 * 3600 * 1000).toISOString();

    const { data: sent } = await supabase
      .from("sms_sprint_messages")
      .select("id, sprint_prospect_id, sent_at, phase")
      .eq("phase", "initial")
      .in("status", ["sent", "delivered"])
      .lt("sent_at", cutoff24);

    const sentResults: any[] = [];
    for (const row of sent ?? []) {
      const { data: p } = await supabase
        .from("sms_sprint_prospects")
        .select("id, company_name, owner_name, city, category, phone_e164, tracking_slug, activation_status")
        .eq("id", row.sprint_prospect_id).maybeSingle();
      if (!p || !p.phone_e164) continue;
      if (p.activation_status === "activated") continue;

      // Any click on this slug?
      const { data: clicks } = await supabase
        .from("sms_sprint_link_events")
        .select("id")
        .eq("tracking_slug", p.tracking_slug!)
        .eq("event", "click").limit(1);

      const has_click = (clicks ?? []).length > 0;
      const eligibleFor48 = !has_click && row.sent_at! < cutoff48;
      const phase: "followup_24h" | "followup_48h" = eligibleFor48 ? "followup_48h" : "followup_24h";

      // If 24h phase, require they clicked (per brief: clicked but no payment).
      if (phase === "followup_24h" && !has_click) continue;

      // Idempotency: skip if that phase already exists
      const { data: exists } = await supabase
        .from("sms_sprint_messages").select("id")
        .eq("sprint_prospect_id", p.id).eq("phase", phase).maybeSingle();
      if (exists) continue;

      const owner = (p.owner_name && p.owner_name.trim()) || p.company_name || "bonjour";
      const link = `${PUBLIC_BASE}/activer/${p.tracking_slug}`;
      const body = renderFollowup(phase, {
        owner, city: p.city ?? "", category: p.category ?? "", link,
      });

      const { data: msg } = await supabase.from("sms_sprint_messages").insert({
        sprint_prospect_id: p.id, phase, body, status: "queued",
      }).select("id").single();

      try {
        const res = await sendSms({
          to: p.phone_e164,
          body,
          message_type: "reengagement",
          metadata: { sprint_followup: phase, slug: p.tracking_slug },
        });
        await supabase.from("sms_sprint_messages").update({
          provider_id: res.twilio_sid,
          status: res.status,
          status_reason: res.error_message ?? null,
          sent_at: new Date().toISOString(),
        }).eq("id", msg!.id);
        sentResults.push({ prospect_id: p.id, phase, status: res.status });
      } catch (e) {
        await supabase.from("sms_sprint_messages").update({
          status: "failed", status_reason: String((e as Error).message ?? e),
        }).eq("id", msg!.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentResults.length, results: sentResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
