import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-\(\)\.]/g, "").replace(/^\+?1(?=\d{10}$)/, "");
}

function normalizeDomain(raw: string): string {
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase().trim();
}

function computeSniperPriority(input: {
  hasWebsite: boolean; hasPhone: boolean; hasEmail: boolean;
  categoryValueTier: string; territoryDemandTier: string;
  likelyAippWeakness: string; founderEligible: boolean; supplyNeedTier: string;
}) {
  let score = 0;
  const tierVal = (t: string, h: number, m: number, l: number) => t === "high" ? h : t === "medium" ? m : l;
  score += tierVal(input.categoryValueTier, 13, 8, 4);
  score += tierVal(input.territoryDemandTier, 12, 7, 3);
  if (input.hasWebsite) score += 6;
  if (input.hasPhone) score += 4;
  if (input.hasEmail) score += 5;
  score += tierVal(input.likelyAippWeakness, 25, 15, 6);
  if (input.founderEligible) score += 10;
  score += tierVal(input.supplyNeedTier, 10, 6, 2);
  return Math.min(score, 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { targetId } = await req.json();
    if (!targetId) return new Response(JSON.stringify({ error: "targetId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: target, error: loadErr } = await supabase.from("sniper_targets").select("*").eq("id", targetId).single();
    if (loadErr || !target) return new Response(JSON.stringify({ error: "target not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Normalize
    const phone = target.phone ? normalizePhone(target.phone) : null;
    const domain = target.website_url ? normalizeDomain(target.website_url) : target.domain;

    // Match contractor
    let contractorId = target.contractor_id;
    if (!contractorId) {
      const { data: matches } = await supabase.from("contractors").select("id")
        .or(`company_name.ilike.%${target.business_name}%${target.city ? `,city.eq.${target.city}` : ""}`)
        .limit(1);
      if (matches && matches.length > 0) contractorId = matches[0].id;
    }

    // Enrich signals
    let websiteFound = false;
    let httpsEnabled = false;
    if (domain) {
      try {
        const res = await fetch(`https://${domain}`, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000) });
        websiteFound = res.ok || res.status < 500;
        httpsEnabled = true;
      } catch {
        try {
          const res = await fetch(`http://${domain}`, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(5000) });
          websiteFound = res.ok || res.status < 500;
        } catch { /* no site */ }
      }
    }

    const hasWebsite = websiteFound || !!target.website_url;
    const hasPhone = !!phone;
    const hasEmail = !!target.email;

    // Score
    const priority = computeSniperPriority({
      hasWebsite, hasPhone, hasEmail,
      categoryValueTier: "medium",
      territoryDemandTier: "medium",
      likelyAippWeakness: hasWebsite ? "medium" : "high",
      founderEligible: target.founder_eligible || false,
      supplyNeedTier: "medium",
    });

    const revenueScore = hasWebsite ? 15 : 8;
    const readinessScore = (hasWebsite ? 6 : 0) + (hasPhone ? 4 : 0) + (hasEmail ? 5 : 0);
    const painScore = hasWebsite ? 15 : 25;
    const strategicScore = (target.founder_eligible ? 10 : 0) + 6;
    const contactScore = readinessScore;

    const channel = hasEmail && priority >= 80 ? "dual" :
                    hasEmail && priority >= 60 ? "email" :
                    hasPhone ? "sms" : "email";

    const { error: updateErr } = await supabase.from("sniper_targets").update({
      phone, domain,
      contractor_id: contractorId,
      enrichment_status: "enriched",
      sniper_priority_score: priority,
      revenue_potential_score: revenueScore,
      readiness_score: readinessScore,
      pain_upside_score: painScore,
      strategic_fit_score: strategicScore,
      contactability_score: contactScore,
      recommended_channel: channel,
      notes: { websiteFound, httpsEnabled, enrichedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq("id", targetId);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, targetId, priority, channel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
