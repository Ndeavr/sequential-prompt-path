/**
 * agent-ai-visibility
 * Calcule un score IA déterministe (0-100) et un insight FR, persiste dans ai_visibility_reports.
 */
import { corsHeaders, recordAgentRun } from "../_shared/agentRun.ts";

function scoreLead(lead: any): { score: number; strengths: string[]; weaknesses: string[]; summary: string } {
  const reviewCount = lead.metadata_json?.review_count ?? lead.metadata_json?.google_reviews ?? 0;
  const rating = lead.metadata_json?.google_rating ?? lead.metadata_json?.rating ?? 0;
  const hasWebsite = !!lead.website_url;
  const hasPhone = !!lead.phone;
  const aiPresence = lead.metadata_json?.ai_presence_score ?? 0;

  // Deterministic mix (0-100)
  const reviewSignal = Math.min(20, reviewCount / 30);            // strong if 600+
  const ratingSignal = rating >= 4.4 ? 15 : rating >= 4.0 ? 8 : 0;
  const webSignal = hasWebsite ? 15 : 0;
  const phoneSignal = hasPhone ? 5 : 0;
  const aiSignal = Math.min(25, aiPresence);                       // 0-25
  const baseline = 10;
  const score = Math.round(Math.min(100, baseline + reviewSignal + ratingSignal + webSignal + phoneSignal + aiSignal));

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (reviewCount >= 200) strengths.push(`${reviewCount} avis (autorité forte)`);
  if (rating >= 4.4) strengths.push(`Note ${rating}★`);
  if (!hasWebsite) weaknesses.push("Pas de site web référençable");
  if (aiPresence < 10) weaknesses.push("Faible présence dans les moteurs IA génératifs");
  if (reviewCount > 200 && aiPresence < 10) {
    weaknesses.push("Vos avis ne sont pas convertis en signaux IA");
  }

  const trade = lead.trade ?? lead.category_primary ?? "votre métier";
  const city = lead.city ?? "votre territoire";

  let summary: string;
  if (reviewCount >= 200 && aiPresence < 15) {
    summary = `Fort sur les avis (${reviewCount}★), mais faible en positionnement IA. Vos compétiteurs dominent les requêtes "${trade} ${city}" dans les moteurs génératifs.`;
  } else if (aiPresence < 15) {
    summary = `Quand un propriétaire demande à l'IA quelle entreprise de ${trade} est recommandée à ${city}, votre nom ne ressort pas. UNPRO peut corriger ça en 14 jours.`;
  } else {
    summary = `Bonne base IA. Activation UNPRO accélérerait votre domination dans ${city}.`;
  }

  return { score, strengths, weaknesses, summary };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(body.limit ?? 25, 100);

  const result = await recordAgentRun("ai-visibility", async (db) => {
    const { data: leads } = await db
      .from("contractor_leads")
      .select("*")
      .eq("enrichment_status", "enriched")
      .in("score_status", ["pending", "stale"])
      .is("agent_paused_at", null)
      .limit(limit);

    let scored = 0;
    for (const lead of leads ?? []) {
      const r = scoreLead(lead);
      await db.from("ai_visibility_reports").insert({
        lead_id: lead.id,
        visibility_score: r.score,
        strengths: r.strengths,
        weaknesses: r.weaknesses,
        competitors: [],
        missing_entities: r.weaknesses,
        ai_summary: r.summary,
        trade: lead.trade ?? lead.category_primary,
        city: lead.city,
      });
      await db.from("contractor_leads").update({
        ai_visibility_score: r.score,
        score_status: "scored",
        last_agent_run_at: new Date().toISOString(),
      }).eq("id", lead.id);
      scored++;
    }
    return { scored, processed: leads?.length ?? 0 };
  });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: result.ok ? 200 : 500,
  });
});
