/**
 * acquisition-queue-worker
 * Autonomous loop: enriches verified prospects into acquisition_queue,
 * advances FSM (new → verified → ready_sms/ready_email → contacted), and
 * launches SMS/email batches. Never blocks on individual failures.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FUNCTION_NAME = "acquisition-queue-worker";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  const requestId = crypto.randomUUID();
  return new Response(JSON.stringify({ function: FUNCTION_NAME, request_id: requestId, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    const events: Array<Record<string, unknown>> = [];

    // 1. Enqueue verified prospects that aren't in the queue yet
    const { data: newProspects } = await supabase
      .from("verified_contractor_prospects")
      .select("id, sms_eligibility_tier, verification_status")
      .eq("verification_status", "verified")
      .eq("outreach_status", "none")
      .limit(50);

    for (const p of newProspects ?? []) {
      const state = ["A", "B", "C"].includes(p.sms_eligibility_tier ?? "")
        ? "ready_sms"
        : p.sms_eligibility_tier === "D"
          ? "ready_email"
          : "verified";
      const { error } = await supabase.from("acquisition_queue").upsert({
        prospect_id: p.id, state, channel: state === "ready_sms" ? "sms" : state === "ready_email" ? "email" : null,
        next_action_at: new Date().toISOString(),
      }, { onConflict: "prospect_id", ignoreDuplicates: false });
      if (!error) events.push({ prospect_id: p.id, action: "enqueued", state });
    }

    // 2. Count ready-to-send
    const { count: readySms } = await supabase
      .from("acquisition_queue")
      .select("id", { count: "exact", head: true })
      .eq("state", "ready_sms");

    if (dryRun) {
      return jsonResponse({ ok: true, dry_run: true, events, ready_sms: readySms ?? 0 });
    }

    // 3. Trigger SMS batch if any ready
    let smsResult: any = null;
    if ((readySms ?? 0) > 0) {
      const r = await fetch(`${url}/functions/v1/send-verified-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ dry_run: false, limit: 10 }),
      });
      smsResult = await r.json().catch(() => ({}));

      // Mark queued prospects as contacted based on send results
      if (smsResult?.results) {
        for (const r of smsResult.results) {
          if (r.status === "sent") {
            await supabase.from("acquisition_queue")
              .update({ state: "contacted", attempt_count: 1, updated_at: new Date().toISOString() })
              .eq("prospect_id", r.id);
          } else if (r.status === "failed") {
            await supabase.from("acquisition_queue")
              .update({ state: "failed", last_error: String(r.error).slice(0, 500), updated_at: new Date().toISOString() })
              .eq("prospect_id", r.id);
            await supabase.from("acquisition_repair_log").insert({
              prospect_id: r.id, step: "sms_send", error: String(r.error).slice(0, 500),
              root_cause: "twilio_send_failed", repair_attempt: 1, repair_result: "failed",
            });
          }
        }
      }
    }

    return jsonResponse({
      ok: true,
      enqueued: events.length,
      ready_sms: readySms ?? 0,
      sms_result: smsResult,
    });
  } catch (e) {
    console.error(`${FUNCTION_NAME} failed`, e);
    return jsonResponse({ ok: false, message: (e as Error).message }, 500);
  }
});
