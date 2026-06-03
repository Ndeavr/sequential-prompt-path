/**
 * agent-enrich-leads
 * Prend les leads status=new/discovered et les enrichit via acq-enrich-prospect.
 */
import { corsHeaders, recordAgentRun } from "../_shared/agentRun.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(body.limit ?? 25, 100);

  const result = await recordAgentRun("enrich-leads", async (db) => {
    const { data: leads } = await db
      .from("contractor_leads")
      .select("id, company_name, website_url, city, category_primary")
      .in("enrichment_status", ["pending", "new"])
      .is("agent_paused_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    let enriched = 0; let failed = 0;
    for (const lead of leads ?? []) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/acq-enrich-prospect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ lead_id: lead.id }),
        });
        await db.from("contractor_leads")
          .update({ enrichment_status: "enriched", last_agent_run_at: new Date().toISOString() })
          .eq("id", lead.id);
        enriched++;
      } catch (_) {
        failed++;
        await db.from("contractor_leads")
          .update({ enrichment_status: "failed", last_agent_run_at: new Date().toISOString() })
          .eq("id", lead.id);
      }
    }
    return { processed: leads?.length ?? 0, enriched, failed };
  });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: result.ok ? 200 : 500,
  });
});
