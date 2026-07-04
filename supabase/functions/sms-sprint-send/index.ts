// Sends a controlled batch of sprint SMS. Blocks unless test SMS is delivered
// AND clicked, unless force=true (admin override).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";
import { renderVariant, type VariantKey } from "../_shared/smsSprintVariants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_BASE = Deno.env.get("PUBLIC_APP_URL") ?? "https://unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const batch = Math.min(Math.max(body.batch ?? 5, 1), 25);
    const force = body.force === true;
    const campaign_id = body.campaign_id ?? null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve campaign
    let cid = campaign_id;
    if (!cid) {
      const { data: c } = await supabase.from("sms_sprint_campaigns")
        .select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
      cid = c?.id ?? null;
    }
    if (!cid) throw new Error("no_campaign");

    // Gate: test must be delivered AND clicked (unless force)
    if (!force) {
      const { data: test } = await supabase
        .from("sms_sprint_test_runs")
        .select("delivered_at, link_clicked_at, status")
        .eq("campaign_id", cid)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!test) throw new Error("test_sms_required");
      if (!test.delivered_at && test.status !== "sent" && test.status !== "delivered") {
        throw new Error("test_sms_not_delivered");
      }
      if (!test.link_clicked_at) {
        throw new Error("test_sms_link_not_clicked");
      }
    }

    // Fetch queued qualified prospects that have no initial message yet
    const { data: prospects, error: pErr } = await supabase
      .from("sms_sprint_prospects")
      .select("id, company_name, owner_name, city, category, phone_e164, variant, tracking_slug")
      .eq("campaign_id", cid)
      .eq("qualification_status", "qualified")
      .order("created_at", { ascending: true })
      .limit(batch * 3);
    if (pErr) throw pErr;

    // Filter to those without an existing initial message
    const ids = (prospects ?? []).map((p) => p.id);
    const { data: existingMsgs } = await supabase
      .from("sms_sprint_messages")
      .select("sprint_prospect_id")
      .in("sprint_prospect_id", ids)
      .eq("phase", "initial");
    const already = new Set((existingMsgs ?? []).map((m) => m.sprint_prospect_id));
    const toSend = (prospects ?? []).filter((p) => !already.has(p.id) && p.phone_e164 && p.variant && p.tracking_slug).slice(0, batch);

    const results: any[] = [];
    for (const p of toSend) {
      const owner = (p.owner_name && p.owner_name.trim()) || p.company_name || "bonjour";
      const link = `${PUBLIC_BASE}/activer/${p.tracking_slug}`;
      const message = renderVariant(p.variant as VariantKey, {
        owner,
        city: p.city ?? "",
        category: p.category ?? "",
        link,
      });

      // Insert queued row first
      const { data: msgRow } = await supabase.from("sms_sprint_messages").insert({
        sprint_prospect_id: p.id,
        phase: "initial",
        body: message,
        status: "queued",
      }).select("id").single();

      try {
        const res = await sendSms({
          to: p.phone_e164!,
          body: message,
          message_type: "outreach",
          metadata: { sprint: true, slug: p.tracking_slug, variant: p.variant, campaign_id: cid },
        });
        await supabase.from("sms_sprint_messages").update({
          provider_id: res.twilio_sid,
          status: res.status,
          status_reason: res.error_message ?? null,
          sent_at: new Date().toISOString(),
        }).eq("id", msgRow!.id);
        results.push({ prospect_id: p.id, status: res.status, provider_id: res.twilio_sid, error: res.error_message ?? null });
      } catch (e) {
        const err = String((e as Error).message ?? e);
        await supabase.from("sms_sprint_messages").update({
          status: "failed",
          status_reason: err,
        }).eq("id", msgRow!.id);
        results.push({ prospect_id: p.id, status: "failed", error: err });
      }
    }

    // If first batch, mark campaign sending + timestamp
    await supabase.from("sms_sprint_campaigns").update({
      status: "sending",
      first_batch_sent_at: new Date().toISOString(),
    }).eq("id", cid).is("first_batch_sent_at", null);

    return new Response(JSON.stringify({
      ok: true, campaign_id: cid, sent: results.length, results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
