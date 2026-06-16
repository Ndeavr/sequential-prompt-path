// UNPRO — validate-lead-phones worker.
// Runs every 5 minutes. Picks leads with phone_validation_status='pending_validation',
// runs Twilio Lookup, persists results. Caps cost at 100 lookups/run (~$0.80).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateAndPersistLeadPhone } from "../_shared/phoneValidation.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const out = { checked: 0, valid_mobile: 0, valid_voip: 0, landline: 0, invalid: 0, outside_qc: 0, lookup_failed: 0, errors: [] as string[] };

  try {
    const { data: leads, error } = await sb
      .from("contractor_leads")
      .select("id,phone,mobile_phone,phone_validation_status,phone_e164")
      .eq("phone_validation_status", "pending_validation")
      .or("phone.not.is.null,mobile_phone.not.is.null")
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (error) throw new Error(error.message);

    for (const lead of leads ?? []) {
      out.checked++;
      try {
        const r = await validateAndPersistLeadPhone(sb, lead as any);
        if (r.status === "valid_mobile") out.valid_mobile++;
        else if (r.status === "valid_voip") out.valid_voip++;
        else if (r.status === "landline") out.landline++;
        else if (r.status === "invalid_phone") out.invalid++;
        else if (r.status === "outside_quebec") out.outside_qc++;
        else out.lookup_failed++;

        // Re-fire curiosity enrollment for newly-valid leads
        if ((r.status === "valid_mobile" || r.status === "valid_voip")) {
          await sb.from("contractor_leads")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", lead.id)
            .eq("pipeline_status", "ready_for_outreach")
            .eq("funnel_type", "ai_score_curiosity");
        }
      } catch (e) {
        out.errors.push(`${lead.id}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    out.errors.push((e as Error).message);
  }

  return new Response(JSON.stringify({ ok: true, ...out }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
