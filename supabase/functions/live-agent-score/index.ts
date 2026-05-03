// LIVE Agent — AIPP Scoring (deterministic 0-100)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function scoreProspect(p: any): { aipp: number; priority: number; confidence: number; breakdown: any } {
  const ex = p.raw_data?.extracted || {};
  const branding = p.raw_data?.branding;

  // Web presence /25
  let web = 0;
  if (p.website_url) web += 10;
  if (branding?.colors) web += 5;
  if (branding?.logo) web += 5;
  if (ex.description && ex.description.length > 80) web += 5;

  // Trust signals /25
  let trust = 0;
  if (p.rbq) trust += 12;
  if (p.neq) trust += 6;
  if (p.review_count && p.review_count > 5) trust += 4;
  if (p.review_rating && p.review_rating >= 4) trust += 3;

  // Contact completeness /25
  let contact = 0;
  if (p.phone) contact += 8;
  if (p.email) contact += 8;
  if (p.address || p.postal_code) contact += 5;
  if (p.city) contact += 4;

  // Service clarity /25
  let services = 0;
  const svcCount = (ex.services?.length || 0);
  if (svcCount >= 1) services += 8;
  if (svcCount >= 3) services += 7;
  if (svcCount >= 5) services += 5;
  if (ex.service_areas?.length >= 1) services += 5;

  const aipp = Math.min(100, web + trust + contact + services);

  // Priority: lower AIPP = higher need (better target)
  const priority = Math.round(100 - aipp + (p.email ? 15 : 0) + (p.phone ? 10 : 0));

  // Confidence based on data density
  let confidence = 0;
  if (p.website_url) confidence += 0.2;
  if (ex.business_name) confidence += 0.2;
  if (p.email || p.phone) confidence += 0.3;
  if (p.rbq || p.neq) confidence += 0.2;
  if (svcCount >= 2) confidence += 0.1;

  return {
    aipp,
    priority: Math.min(150, priority),
    confidence: Math.min(1, confidence),
    breakdown: { web, trust, contact, services },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { prospect_id, prospect_ids } = await req.json();
    const ids: string[] = prospect_ids || (prospect_id ? [prospect_id] : []);
    if (!ids.length) throw new Error("prospect_id or prospect_ids required");

    const { data: prospects, error } = await supabase.from("contractor_prospects")
      .select("*").in("id", ids);
    if (error) throw error;

    const results: any[] = [];
    for (const p of prospects || []) {
      const s = scoreProspect(p);
      await supabase.from("contractor_prospects").update({
        aipp_score: s.aipp,
        priority_score: s.priority,
        confidence_score: s.confidence,
        qualification_status: s.aipp < 60 ? "qualified" : "low_priority",
        raw_data: { ...(p.raw_data || {}), score_breakdown: s.breakdown, scored_at: new Date().toISOString() },
      }).eq("id", p.id);
      results.push({ id: p.id, business_name: p.business_name, ...s });
    }

    await supabase.from("live_agent_runs").insert({
      agent_name: "live-agent-score", agent_type: "scoring",
      input: { count: ids.length }, run_status: "completed",
      finished_at: new Date().toISOString(),
      output: { scored: results.length, avg_aipp: results.reduce((a, r) => a + r.aipp, 0) / (results.length || 1) },
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
