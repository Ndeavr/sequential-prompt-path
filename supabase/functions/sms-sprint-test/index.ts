// Sends the internal founder test SMS to 5142499522 with a real tracking slug.
// Blocks contractor sends until this is delivered + link clicked.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_PHONE = "+15142499522";
const PUBLIC_BASE = Deno.env.get("PUBLIC_APP_URL") ?? "https://unpro.ca";

function makeSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return "t-" + Array.from(bytes).map((b) => b.toString(36)).join("").slice(0, 14);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const campaign_id = body.campaign_id ?? null;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure campaign exists
    let cid = campaign_id;
    if (!cid) {
      const { data: existing } = await supabase
        .from("sms_sprint_campaigns")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) cid = existing.id;
      else {
        const { data: created } = await supabase
          .from("sms_sprint_campaigns")
          .insert({ name: "SMS Founder Sprint", status: "test_pending" })
          .select("id")
          .single();
        cid = created?.id ?? null;
      }
    }

    const slug = makeSlug();
    const link = `${PUBLIC_BASE}/activer/${slug}`;
    const msg = `UNPRO test: Founder SMS flow active. This link should open the $1 contractor activation page: ${link}`;

    const { data: run } = await supabase
      .from("sms_sprint_test_runs")
      .insert({ campaign_id: cid, phone: TEST_PHONE, tracking_slug: slug, status: "queued" })
      .select("id")
      .single();

    const res = await sendSms({
      to: TEST_PHONE,
      body: msg,
      message_type: "test",
      strict_admin_override: true,
      metadata: { sprint_test: true, slug, campaign_id: cid },
    });

    await supabase
      .from("sms_sprint_test_runs")
      .update({
        provider_id: res.twilio_sid,
        status: res.status,
        status_reason: res.error_message ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", run?.id);

    if (cid) {
      await supabase.from("sms_sprint_campaigns")
        .update({ status: "test_pending" })
        .eq("id", cid);
    }

    return new Response(
      JSON.stringify({ ok: true, campaign_id: cid, test_run_id: run?.id, slug, link, provider_id: res.twilio_sid, status: res.status, error: res.error_message ?? null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
