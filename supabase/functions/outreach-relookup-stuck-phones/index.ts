// outreach-relookup-stuck-phones — Re-runs classification on leads stuck in
// `lookup_failed` / `pending_validation` / stale `lookup_unavailable`.
// Promotes valid E.164 QC numbers to sendable `lookup_unavailable` (tentative)
// so the outreach queue can pick them up.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateLead } from "../_shared/leadValidation.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await req.json().catch(() => ({} as any));
  const limit = Math.min(Number(body?.limit ?? 200), 500);

  const out = {
    rechecked: 0,
    promoted_to_valid: 0,
    still_unavailable: 0,
    real_invalid: 0,
    errors: [] as string[],
  };

  try {
    // Stale = >24h old lookup on `lookup_unavailable`
    const staleCutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const { data: leads, error } = await sb
      .from("contractor_leads")
      .select("id, company_name, phone, mobile_phone, do_not_contact, phone_validation_status, phone_lookup_at")
      .or(
        `phone_validation_status.eq.lookup_failed,phone_validation_status.eq.pending_validation,and(phone_validation_status.eq.lookup_unavailable,phone_lookup_at.lt.${staleCutoff})`,
      )
      .limit(limit);

    if (error) throw new Error(error.message);

    for (const lead of leads ?? []) {
      try {
        const r = await validateLead(sb, lead as any);
        out.rechecked++;
        if (r.validation_status === "valid") out.promoted_to_valid++;
        else if (r.phone_validation_status === "lookup_unavailable") out.still_unavailable++;
        else if (r.validation_status === "invalid_phone") out.real_invalid++;
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
