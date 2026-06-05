/**
 * launch-agent-activation — PAID → ACTIVATED.
 * On the FIRST paid lead, flips launch_mode_state to first_customer_acquired
 * and disables Founder Mode.
 */
import { corsHeaders, adminClient, transitionLead, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const leadId = body.lead_id;
  if (!leadId) {
    return new Response(JSON.stringify({ error: "lead_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sb = adminClient();
  const { data: lead } = await sb.from("launch_leads").select("*").eq("id", leadId).maybeSingle();
  if (!lead) {
    return new Response(JSON.stringify({ error: "lead not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    await transitionLead(leadId, "ACTIVATED", {
      payload: {
        ...((lead as any).payload ?? {}),
        activation: { activated_at: new Date().toISOString() },
      },
    }, "launch-agent-activation");

    // Check if first customer
    const { data: state } = await sb.from("launch_mode_state").select("*").eq("id", true).maybeSingle();
    if (state && (state as any).mode !== "first_customer_acquired") {
      await sb.from("launch_mode_state").update({
        mode: "first_customer_acquired",
        founder_mode_enabled: false,
        first_customer_acquired_at: new Date().toISOString(),
        first_customer_contractor_id: (lead as any).contractor_id,
        first_customer_source: (lead as any).source_agent,
        first_customer_message_template: (lead as any).payload?.outreach?.message ?? null,
        first_customer_plan: (lead as any).payload?.checkout?.plan ?? null,
        first_customer_revenue_cents: (lead as any).revenue_impact_cents ?? null,
      }).eq("id", true);

      await logLaunchEvent({
        lead_id: leadId, agent: "launch-agent-activation",
        event: "first_customer_acquired",
        payload: { contractor: (lead as any).company_name, city: (lead as any).city },
      });

      await reportOutcome({
        operation: "launch.first_customer_acquired",
        outcome: "achieved",
        revenue_impact_cents: (lead as any).revenue_impact_cents ?? null,
        affected_record: leadId,
        next_action: "Mission accomplie. Optimiser sur base du chemin de conversion.",
      });
    }

    await reportOutcome({
      operation: "launch.activation.run",
      outcome: "achieved",
      revenue_impact_cents: (lead as any).revenue_impact_cents ?? null,
      affected_record: leadId,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await reportOutcome({
      operation: "launch.activation.run",
      outcome: "failed",
      failure_code: FailureCode.ACTIVATION_FAILED,
      affected_record: leadId,
      payload: { error: String(e) },
    });
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
