/**
 * launch-agent-payment-monitor — scans recent Stripe checkout sessions for CHECKOUT_SENT leads.
 * On paid: → PAID, then triggers launch-agent-activation.
 */
import { corsHeaders, adminClient, transitionLead, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

async function listSessions(): Promise<any[]> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return [];
  const since = Math.floor((Date.now() - 24 * 3600 * 1000) / 1000);
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${since}`, {
    headers: { "Authorization": `Bearer ${key}` },
  });
  if (!r.ok) return [];
  const data = await r.json();
  return data.data ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = adminClient();
  const sessions = await listSessions();
  let paid = 0;
  for (const s of sessions) {
    if (s.payment_status !== "paid") continue;
    const leadId = s.metadata?.launch_lead_id;
    if (!leadId) continue;
    const { data: lead } = await sb.from("launch_leads").select("*").eq("id", leadId).maybeSingle();
    if (!lead || (lead as any).lead_status === "PAID" || (lead as any).lead_status === "ACTIVATED") continue;
    try {
      await transitionLead(leadId, "PAID", {
        revenue_impact_cents: s.amount_total ?? 0,
        payload: {
          ...((lead as any).payload ?? {}),
          payment: {
            session_id: s.id, amount: s.amount_total, currency: s.currency,
            customer: s.customer, paid_at: new Date().toISOString(),
          },
        },
      }, "launch-agent-payment-monitor");
      paid++;
      // Trigger activation
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/launch-agent-activation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ lead_id: leadId }),
      });
    } catch (e) {
      await logLaunchEvent({
        lead_id: leadId, agent: "launch-agent-payment-monitor",
        event: "paid_transition_failed", success: false, message: String(e),
      });
    }
  }

  await reportOutcome({
    operation: "launch.payment.run",
    outcome: paid > 0 ? "achieved" : "partial",
    revenue_impact_cents: paid > 0 ? null : 0,
    payload: { paid, scanned: sessions.length },
  });

  return new Response(JSON.stringify({ ok: true, paid }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
