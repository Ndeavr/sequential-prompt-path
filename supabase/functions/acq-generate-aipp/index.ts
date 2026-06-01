// acq-generate-aipp — generates AIPP profile + score for a prospect
import { svc, startRun, finishRun, log, cors } from "../_shared/acq-logger.ts";

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

interface Scores { trust: number; visibility: number; review: number; website: number; local: number; overall: number; }

function computeScores(p: any): Scores {
  let trust = 0, visibility = 0, review = 0, website = 0, local = 0;
  if (p.rbq) trust += 10;
  if (p.neq) trust += 10;
  if (p.review_count >= 20) trust += 5;
  if (p.email) trust += 5;
  trust = Math.min(20, trust);

  if (p.google_business_url) visibility += 8;
  if (p.website_url) visibility += 6;
  if (p.review_rating && p.review_rating >= 4) visibility += 6;
  visibility = Math.min(20, visibility);

  if (p.review_rating) review = Math.round((p.review_rating / 5) * 20);
  if (p.website_url) website = 15; else website = 0;
  if (p.city) local += 10;
  if (p.region) local += 10;
  local = Math.min(25, local);

  const overall = trust + visibility + review + website + local;
  return { trust, visibility, review, website, local, overall };
}

async function scoreOne(s: any, prospect_id: string) {
  const runId = await startRun(s, "aipp", { prospect_id });
  const { data: p } = await s.from("contractor_prospects").select("*").eq("id", prospect_id).maybeSingle();
  if (!p) {
    await log(s, runId, "aipp.load", "error", "Prospect introuvable", prospect_id);
    await finishRun(s, runId, { status: "failed" });
    return { prospect_id, ok: false, error: "not_found" };
  }
  const scores = computeScores(p);
  const slug = p.public_slug || `${slugify(p.business_name)}-${p.id.slice(0, 8)}`;
  const missing: string[] = [];
  if (!p.email) missing.push("email");
  if (!p.rbq) missing.push("RBQ");
  if (!p.neq) missing.push("NEQ");
  if (!p.website_url) missing.push("site web");
  if (!p.review_count || p.review_count < 10) missing.push("avis Google");
  const recommendations: string[] = [];
  if (scores.visibility < 12) recommendations.push("Optimiser fiche Google Business");
  if (scores.review < 12) recommendations.push("Solliciter plus d'avis clients");
  if (scores.website < 10) recommendations.push("Améliorer le site web pour l'indexation IA");
  if (!p.rbq) recommendations.push("Afficher numéro RBQ pour confiance accrue");
  const aiSummary = `${p.business_name} — ${p.trade || p.category_slug || "entrepreneur"} à ${p.city || "QC"}. Score IA ${scores.overall}/100.`;
  await s.from("contractor_prospects").update({
    aipp_status: "generated",
    aipp_score: scores.overall,
    public_slug: slug,
    updated_at: new Date().toISOString(),
  }).eq("id", prospect_id);
  try {
    await s.from("contractor_aipp_scores").upsert({
      prospect_id,
      trust_score: scores.trust,
      visibility_score: scores.visibility,
      review_score: scores.review,
      website_score: scores.website,
      local_authority_score: scores.local,
      overall_score: scores.overall,
      ai_summary: aiSummary,
      missing_data: missing,
      recommendations,
      public_slug: slug,
      generated_at: new Date().toISOString(),
    }, { onConflict: "prospect_id" });
  } catch (e) {
    await log(s, runId, "aipp.persist_scores", "warning", String(e), prospect_id);
  }
  await log(s, runId, "aipp.done", "success", `Score ${scores.overall}/100`, prospect_id, { scores, slug });
  await finishRun(s, runId, { status: "succeeded", total_items: 1, succeeded_count: 1 });
  return { prospect_id, ok: true, scores, slug, missing, recommendations, run_id: runId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  const body = await req.json().catch(() => ({}));
  const { prospect_id, batch, limit } = body ?? {};

  if (batch) {
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const { data: prospects } = await s
      .from("contractor_prospects")
      .select("id")
      .or("aipp_status.is.null,aipp_status.neq.generated")
      .limit(lim);
    const ids = (prospects ?? []).map((r: any) => r.id);
    const results = [];
    for (const id of ids) results.push(await scoreOne(s, id));
    return new Response(JSON.stringify({ ok: true, batch: true, processed: results.length, results }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!prospect_id) return new Response(JSON.stringify({ error: "prospect_id requis" }), { status: 400, headers: cors });
  const result = await scoreOne(s, prospect_id);
  return new Response(JSON.stringify(result), { headers: { ...cors, "Content-Type": "application/json" }, status: result.ok ? 200 : 404 });
});

/* legacy single-prospect inline (kept for reference, unreachable):


  const runId = await startRun(s, "aipp", { prospect_id });
  const { data: p } = await s.from("contractor_prospects").select("*").eq("id", prospect_id).maybeSingle();
  if (!p) {
    await log(s, runId, "aipp.load", "error", "Prospect introuvable", prospect_id);
    await finishRun(s, runId, { status: "failed" });
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: cors });
  }

  const scores = computeScores(p);
  const slug = p.public_slug || `${slugify(p.business_name)}-${p.id.slice(0, 8)}`;

  const missing: string[] = [];
  if (!p.email) missing.push("email");
  if (!p.rbq) missing.push("RBQ");
  if (!p.neq) missing.push("NEQ");
  if (!p.website_url) missing.push("site web");
  if (!p.review_count || p.review_count < 10) missing.push("avis Google");

  const recommendations: string[] = [];
  if (scores.visibility < 12) recommendations.push("Optimiser fiche Google Business");
  if (scores.review < 12) recommendations.push("Solliciter plus d'avis clients");
  if (scores.website < 10) recommendations.push("Améliorer le site web pour l'indexation IA");
  if (!p.rbq) recommendations.push("Afficher numéro RBQ pour confiance accrue");

  const aiSummary = `${p.business_name} — ${p.trade || p.category_slug || "entrepreneur"} à ${p.city || "QC"}. Score IA ${scores.overall}/100.`;

  await s.from("contractor_prospects").update({
    aipp_status: "generated",
    aipp_score: scores.overall,
    public_slug: slug,
    updated_at: new Date().toISOString(),
  }).eq("id", prospect_id);

  // Persist detailed scores to contractor_aipp_scores if table accepts
  try {
    await s.from("contractor_aipp_scores").upsert({
      prospect_id,
      trust_score: scores.trust,
      visibility_score: scores.visibility,
      review_score: scores.review,
      website_score: scores.website,
      local_authority_score: scores.local,
      overall_score: scores.overall,
      ai_summary: aiSummary,
      missing_data: missing,
      recommendations,
      public_slug: slug,
      generated_at: new Date().toISOString(),
    }, { onConflict: "prospect_id" });
  } catch (e) {
    await log(s, runId, "aipp.persist_scores", "warning", String(e), prospect_id);
  }

  await log(s, runId, "aipp.done", "success", `Score ${scores.overall}/100`, prospect_id, { scores, slug });
  await finishRun(s, runId, { status: "succeeded", total_items: 1, succeeded_count: 1 });

  return new Response(JSON.stringify({ ok: true, scores, slug, missing, recommendations, run_id: runId }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
