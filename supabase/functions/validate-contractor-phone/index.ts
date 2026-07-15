/**
 * validate-contractor-phone
 * Normalize E.164 (CA only), call Twilio Lookup v2, set phone_validation_status + sms_eligible.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeCA(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prospect_id } = await req.json();
    if (!prospect_id) throw new Error("prospect_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prospect, error: fetchErr } = await supabase
      .from("verified_contractor_prospects")
      .select("id, phone_primary, phone_secondary")
      .eq("id", prospect_id)
      .single();
    if (fetchErr || !prospect) throw new Error(fetchErr?.message ?? "prospect not found");

    const raw = prospect.phone_primary || prospect.phone_secondary;
    if (!raw) throw new Error("no phone to validate");
    const e164 = normalizeCA(raw);
    if (!e164) {
      await supabase.from("verified_contractor_prospects").update({
        phone_validation_status: "invalid",
        sms_eligible: false,
      }).eq("id", prospect_id);
      return new Response(JSON.stringify({ ok: true, status: "invalid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (/555\d{4}$/.test(e164)) {
      await supabase.from("verified_contractor_prospects").update({
        phone_validation_status: "invalid",
        sms_eligible: false,
        outreach_failure_reason: "placeholder_555",
      }).eq("id", prospect_id);
      return new Response(JSON.stringify({ ok: true, status: "invalid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Twilio Lookup v2 via gateway
    const GATEWAY = "https://connector-gateway.lovable.dev/twilio";
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_KEY = Deno.env.get("TWILIO_API_KEY");
    let line_type = "unknown";
    let status = "unverified";

    if (LOVABLE_KEY && TWILIO_KEY) {
      const resp = await fetch(
        `${GATEWAY}/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence`,
        { headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "X-Connection-Api-Key": TWILIO_KEY } },
      );
      const body = await resp.text();
      if (resp.ok) {
        try {
          const j = JSON.parse(body);
          const t = j?.line_type_intelligence?.type as string | undefined;
          if (t === "mobile") { line_type = "mobile"; status = "valid_mobile"; }
          else if (t === "nonFixedVoip") { line_type = "voip"; status = "valid_sms_capable_voip"; }
          else if (t === "fixedVoip") { line_type = "voip"; status = "valid_sms_capable_voip"; }
          else if (t === "landline") { line_type = "landline"; status = "landline"; }
          else { line_type = "unknown"; status = "unverified"; }
        } catch { /* leave unverified */ }
      } else {
        console.error(`Twilio Lookup ${resp.status}: ${body}`);
      }
    }

    const sms_eligible = status === "valid_mobile" || status === "valid_sms_capable_voip";
    await supabase.from("verified_contractor_prospects").update({
      phone_e164: e164,
      phone_line_type: line_type,
      phone_validation_status: status,
      sms_eligible,
      last_enriched_at: new Date().toISOString(),
    }).eq("id", prospect_id);

    return new Response(JSON.stringify({ ok: true, e164, status, sms_eligible }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
