// UNPRO — validate-lead-phones (full lead validation gate).
// Runs every 5 minutes. Picks leads in pending_validation, runs
// company + phone + dedupe validation, persists canonical statuses.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateLead } from "../_shared/leadValidation.ts";

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
  const out = {
    checked: 0,
    valid: 0,
    invalid_phone: 0,
    invalid_company: 0,
    outside_quebec: 0,
    duplicate: 0,
    needs_review: 0,
    errors: [] as string[],
  };

  try {
    const { data: leads, error } = await sb
      .from("contractor_leads")
      .select("id,company_name,phone,mobile_phone,do_not_contact")
      .eq("validation_status", "pending_validation")
      .order("created_at", { ascending: true })
      .limit(BATCH);
    if (error) throw new Error(error.message);

    for (const lead of leads ?? []) {
      out.checked++;
      try {
        const r = await validateLead(sb, lead as any);
        switch (r.validation_status) {
          case "valid": out.valid++; break;
          case "invalid_phone": out.invalid_phone++; break;
          case "invalid_company": out.invalid_company++; break;
          case "outside_quebec": out.outside_quebec++; break;
          case "duplicate": out.duplicate++; break;
          case "needs_review": out.needs_review++; break;
        }
        // Re-fire curiosity enrollment for newly-valid leads
        if (r.validation_status === "valid") {
          await sb.from("contractor_leads")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", lead.id)
            .eq("pipeline_status", "ready_for_outreach")
            .eq("funnel_type", "ai_score_curiosity");
        }
      } catch (e) {
        out.errors.push(`${(lead as any).id}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    out.errors.push((e as Error).message);
  }

  return new Response(JSON.stringify({ ok: true, ...out }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
