/**
 * launch-agent-visibility — ENRICHED → SCORED.
 * Computes a lightweight AI visibility heuristic (no external calls in v1).
 * Stores score in payload so the closer can recommend the right plan.
 */
import { corsHeaders, adminClient, transitionLead, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

function scoreLead(lead: any): { score: number; rationale: string[] } {
  const enr = lead.payload?.enrichment ?? {};
  const reasons: string[] = [];
  let score = 50;
  if (!enr.website) { score -= 15; reasons.push("Pas de site web détecté"); }
  if (!enr.email) { score -= 10; reasons.push("Aucune adresse courriel publique"); }
  if (!enr.google_place_id) { score -= 10; reasons.push("Profil Google absent"); }
  const rating = Number(enr.rating ?? 0);
  const reviews = Number(enr.review_count ?? 0);
  if (reviews < 10) { score -= 10; reasons.push("Moins de 10 avis Google"); }
  else if (reviews > 50 && rating >= 4.5) { score += 10; reasons.push("Réputation Google forte"); }
  if (rating > 0 && rating < 4) { score -= 10; reasons.push("Note Google sous 4 étoiles"); }
  return { score: Math.max(0, Math.min(100, score)), rationale: reasons };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const batch = Math.min(Number(body.batch ?? 20), 50);
  const sb = adminClient();

  const { data: leads } = await sb
    .from("launch_leads")
    .select("*")
    .eq("lead_status", "ENRICHED")
    .order("last_event_at", { ascending: true })
    .limit(batch);

  let scored = 0, failed = 0;
  for (const lead of leads ?? []) {
    try {
      const { score, rationale } = scoreLead(lead);
      await transitionLead((lead as any).id, "SCORED", {
        payload: {
          ...((lead as any).payload ?? {}),
          visibility: { score, rationale, scored_at: new Date().toISOString() },
        },
      }, "launch-agent-visibility");
      scored++;
    } catch (e) {
      failed++;
      await logLaunchEvent({
        lead_id: (lead as any).id, agent: "launch-agent-visibility", event: "score_failed",
        success: false, message: String(e),
      });
    }
  }

  await reportOutcome({
    operation: "launch.visibility.run",
    outcome: scored > 0 ? "achieved" : "partial",
    failure_code: failed > 0 ? FailureCode.VISIBILITY_SCORE_FAILED : null,
    payload: { scored, failed },
  });

  return new Response(JSON.stringify({ ok: true, scored, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
