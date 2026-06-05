/**
 * launch-agent-delivery-monitor — checks Twilio for delivery state on MESSAGED leads.
 * MESSAGED → DELIVERED on confirmation, → FAILED if undelivered/blocked.
 */
import { corsHeaders, adminClient, transitionLead, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

async function fetchTwilio(sid: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  if (!lovableKey || !twilioKey) return null;
  const r = await fetch(`https://connector-gateway.lovable.dev/twilio/Messages/${sid}.json`, {
    headers: { "Authorization": `Bearer ${lovableKey}`, "X-Connection-Api-Key": twilioKey },
  });
  if (!r.ok) return null;
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = adminClient();
  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();

  const { data: leads } = await sb
    .from("launch_leads")
    .select("*")
    .eq("lead_status", "MESSAGED")
    .gte("last_event_at", since)
    .limit(50);

  let delivered = 0, failed = 0, pending = 0;
  for (const lead of leads ?? []) {
    const sid = (lead as any).payload?.outreach?.sid;
    if (!sid) { pending++; continue; }
    const tw = await fetchTwilio(sid);
    if (!tw) { pending++; continue; }
    const status = String(tw.status ?? "").toLowerCase();
    if (status === "delivered" || status === "read") {
      await transitionLead((lead as any).id, "DELIVERED", {}, "launch-agent-delivery-monitor");
      delivered++;
    } else if (status === "failed" || status === "undelivered") {
      await sb.from("launch_leads").update({
        lead_status: "FAILED",
        failure_code: FailureCode.TWILIO_PROVIDER_ERROR,
        payload: { ...((lead as any).payload ?? {}), delivery: tw },
        last_event_at: new Date().toISOString(),
      }).eq("id", (lead as any).id);
      await logLaunchEvent({
        lead_id: (lead as any).id, agent: "launch-agent-delivery-monitor",
        event: "delivery_failed", success: false, message: status,
      });
      failed++;
    } else { pending++; }
  }

  await reportOutcome({
    operation: "launch.delivery.run",
    outcome: delivered > 0 ? "achieved" : "partial",
    payload: { delivered, failed, pending },
  });

  return new Response(JSON.stringify({ ok: true, delivered, failed, pending }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
