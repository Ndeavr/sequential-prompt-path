/**
 * UNPRO — Send SMS to Prospect (refactored to use unified sender).
 * Routes every send through _shared/twilioSend.ts so we get audit trace,
 * test-number guard, opt-out check, normalization, and webhook-driven status.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSms } from "../_shared/twilioSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    const { prospect_id, phone, first_name, company_name, template } = await req.json();
    if (!phone) return json({ error: "phone required" }, 400);

    // Cooldown + opt-out at the prospect-record level (independent of global sms_opt_outs)
    if (prospect_id) {
      const { data: p } = await supabase
        .from("contractors_prospects")
        .select("sms_opted_out, sms_sent_at")
        .eq("id", prospect_id)
        .maybeSingle();
      if (p?.sms_opted_out) return json({ skipped: true, reason: "prospect_opted_out" }, 200);
      if (p?.sms_sent_at && Date.now() - new Date(p.sms_sent_at).getTime() < SEVEN_DAYS_MS) {
        return json({ skipped: true, reason: "cooldown" }, 200);
      }
    }

    const name = first_name || company_name || "entrepreneur";
    const biz = company_name || "";
    const messages: Record<string, string> = {
      intro: `Bonjour ${name} 👋\n\nC'est Alex d'UNPRO. On aide les entreprises comme ${biz} à recevoir des rendez-vous qualifiés avec des propriétaires dans votre secteur.\n\nÇa vous intéresse?\n\nAlex d'UNPRO\nunpro.ca`,
      followup: `Bonjour ${name},\n\nPetit suivi — on a toujours des propriétaires qui cherchent vos services.\n\nRépondez OUI pour en discuter.\n\nAlex d'UNPRO`,
      value: `${name}, les entrepreneurs UNPRO reçoivent en moyenne 12 rendez-vous qualifiés par mois.\n\nunpro.ca\n\nAlex d'UNPRO`,
    };
    const body = messages[template || "intro"] || messages.intro;

    const result = await sendSms({
      to: phone,
      body,
      message_type: "outreach",
      template_key: `prospect_${template || "intro"}`,
      lead_id: prospect_id,
      metadata: { body, prospect_id, company_name, first_name },
    });

    if (result.status === "sending" && prospect_id) {
      await supabase.from("contractors_prospects").update({
        sms_sent_at: new Date().toISOString(),
        sms_message_sid: result.twilio_sid,
        sms_status: "sent",
        sms_queue_status: "sent",
      } as any).eq("id", prospect_id);
    } else if (prospect_id && (result.status === "failed" || result.status === "invalid_phone" || result.status === "blocked" || result.status === "opted_out")) {
      await supabase.from("contractors_prospects").update({
        sms_status: result.status,
        sms_queue_status: "failed",
      } as any).eq("id", prospect_id);
    }

    return json({ success: result.status === "sending", ...result });
  } catch (err) {
    console.error("send-sms-prospect error", err);
    return json({ error: String(err) }, 500);
  }
});
