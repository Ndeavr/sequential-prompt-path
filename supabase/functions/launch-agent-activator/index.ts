/**
 * launch-agent-activator
 * Picks PAID leads, ensures a contractors row exists, marks it active,
 * transitions lead → ACTIVATED, sets activated_at and (if first ever)
 * flips launch_mode_state to first_customer_acquired.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  adminClient, corsHeaders, isLaunching, logLaunchEvent, transitionLead,
} from "../_shared/launch.ts";

const AGENT = "launch-agent-activator";
const BATCH = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!(await isLaunching())) {
      return new Response(JSON.stringify({ skipped: "not launching" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = adminClient();
    const { data: leads, error } = await sb
      .from("launch_leads")
      .select("*")
      .eq("lead_status", "PAID")
      .is("activated_at", null)
      .limit(BATCH);
    if (error) throw error;

    const results: any[] = [];
    for (const lead of leads ?? []) {
      try {
        let contractorId: string | null = lead.contractor_id;

        if (!contractorId) {
          // Ensure a minimal contractor row exists
          const { data: existing } = await sb
            .from("contractors")
            .select("id")
            .eq("company_name", lead.company_name)
            .maybeSingle();
          if (existing?.id) {
            contractorId = existing.id;
          } else {
            const { data: created, error: cErr } = await sb.from("contractors").insert({
              company_name: lead.company_name ?? "Entrepreneur",
              phone: lead.phone,
              email: lead.email,
              city: lead.city,
              trade: lead.trade,
              is_active: true,
              source: "launch_mode",
            }).select("id").maybeSingle();
            if (cErr) throw cErr;
            contractorId = created?.id ?? null;
          }
        } else {
          await sb.from("contractors").update({ is_active: true }).eq("id", contractorId);
        }

        const now = new Date().toISOString();
        await sb.from("launch_leads").update({
          activated_at: now,
          contractor_id: contractorId,
        }).eq("id", lead.id);

        await transitionLead(lead.id, "ACTIVATED", {}, AGENT);
        await logLaunchEvent({
          lead_id: lead.id, contractor_id: contractorId, agent: AGENT,
          event: "activated", success: true,
          message: `Contractor ${contractorId} activated (${lead.recommended_plan})`,
          payload: { mrr_cents: lead.mrr_cents, plan: lead.recommended_plan },
        });

        // If first ever activation, flip launch_mode_state
        const { count } = await sb
          .from("launch_leads")
          .select("id", { count: "exact", head: true })
          .not("activated_at", "is", null);
        if ((count ?? 0) === 1) {
          await sb.from("launch_mode_state").update({
            mode: "first_customer_acquired",
            first_customer_contractor_id: contractorId,
            first_customer_acquired_at: now,
            first_customer_plan: lead.recommended_plan,
            first_customer_source: "launch_mode",
            first_customer_revenue_cents: lead.mrr_cents ?? 0,
          }).eq("id", true);
        }

        results.push({ lead_id: lead.id, contractor_id: contractorId, ok: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logLaunchEvent({ lead_id: lead.id, agent: AGENT, event: "failed", success: false, message: msg });
        results.push({ lead_id: lead.id, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logLaunchEvent({ agent: AGENT, event: "failed", success: false, message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
