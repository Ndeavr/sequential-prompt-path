import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Rule-based prediction engine ──
interface LeadSignals {
  urgency_level: string;
  budget_range: string;
  timeline: string;
  property_type: string;
  source: string;
  city_slug: string;
  trade_slug: string;
  contact_preference: string;
  has_description: boolean;
  referral_source: string;
}

function predictFromRules(s: LeadSignals) {
  const reasoning: string[] = [];
  let quality = 50;
  let closeProb = 0.30;
  let showProb = 0.70;
  let abandonProb = 0.20;
  let timeToDays = 14;
  let contractValue = 3000;
  let routingPriority = 5;
  let pricingSensitivity = "medium";
  let bestOffer = "standard";
  let nextAction = "contact";

  // ── Urgency signals ──
  if (s.urgency_level === "urgent" || s.urgency_level === "emergency") {
    quality += 20; closeProb += 0.15; showProb += 0.10; timeToDays = 3;
    abandonProb -= 0.10; contractValue *= 1.3; routingPriority = 1;
    pricingSensitivity = "low"; bestOffer = "priority";
    reasoning.push("Urgence élevée → forte probabilité de fermeture rapide");
  } else if (s.urgency_level === "soon") {
    quality += 10; closeProb += 0.05; timeToDays = 7;
    reasoning.push("Urgence modérée → délai court");
  } else {
    reasoning.push("Urgence normale → délai standard");
  }

  // ── Budget signals ──
  const budgetMap: Record<string, number> = {
    "less_than_5k": 3000, "5k_10k": 7500, "10k_25k": 17500,
    "25k_50k": 37500, "50k_100k": 75000, "100k_plus": 150000,
    "unknown": 5000,
  };
  const matchedBudget = Object.entries(budgetMap).find(([k]) => s.budget_range?.includes(k));
  if (matchedBudget) {
    contractValue = matchedBudget[1];
    if (matchedBudget[1] >= 25000) {
      quality += 10; pricingSensitivity = "low";
      reasoning.push(`Budget élevé (${s.budget_range}) → haute valeur`);
    }
  }

  // ── Timeline ──
  if (s.timeline === "asap" || s.timeline === "this_week") {
    quality += 10; closeProb += 0.10; timeToDays = Math.min(timeToDays, 5);
    reasoning.push("Timeline immédiat → lead chaud");
  } else if (s.timeline === "this_month") {
    quality += 5;
    reasoning.push("Timeline ce mois → lead tiède");
  } else if (s.timeline === "flexible" || s.timeline === "next_quarter") {
    quality -= 5; abandonProb += 0.10; timeToDays = Math.max(timeToDays, 30);
    reasoning.push("Timeline flexible → risque d'abandon plus élevé");
  }

  // ── Source quality ──
  if (s.source === "referral" || s.referral_source) {
    quality += 15; closeProb += 0.15; showProb += 0.10;
    reasoning.push("Source référence → qualité supérieure");
  } else if (s.source === "seo" || s.source === "organic") {
    quality += 5;
    reasoning.push("Source organique → intention modérée");
  } else if (s.source === "ads") {
    quality += 3; pricingSensitivity = "high";
    reasoning.push("Source publicité → sensibilité prix plus élevée");
  }

  // ── Description richness ──
  if (s.has_description) {
    quality += 5; closeProb += 0.05;
    reasoning.push("Description détaillée → engagement supérieur");
  }

  // ── Contact preference ──
  if (s.contact_preference === "phone") {
    showProb += 0.10; closeProb += 0.05;
    reasoning.push("Préfère téléphone → engagement direct");
    nextAction = "call";
  } else if (s.contact_preference === "email") {
    nextAction = "email_intro";
  }

  // ── Property type ──
  if (s.property_type === "commercial" || s.property_type === "multi_unit") {
    contractValue *= 1.5; quality += 5;
    reasoning.push("Propriété commerciale/multi → valeur augmentée");
  }

  // ── Clamp values ──
  quality = Math.max(0, Math.min(100, quality));
  closeProb = Math.max(0.05, Math.min(0.95, closeProb));
  showProb = Math.max(0.30, Math.min(0.98, showProb));
  abandonProb = Math.max(0.02, Math.min(0.80, abandonProb));
  const profitValue = Math.round(contractValue * 0.22);
  const confidence = quality >= 70 ? 0.80 : quality >= 50 ? 0.65 : 0.45;

  // ── Routing priority ──
  if (quality >= 80) routingPriority = 1;
  else if (quality >= 60) routingPriority = 3;
  else if (quality >= 40) routingPriority = 5;
  else routingPriority = 8;

  // ── Risk scores ──
  const noShowRisk = Math.round((1 - showProb) * 100);
  const priceObjectionRisk = pricingSensitivity === "high" ? 70 : pricingSensitivity === "medium" ? 40 : 15;
  const competitorLossRisk = s.source === "ads" ? 55 : s.source === "referral" ? 15 : 35;
  const scopeCreepRisk = !s.has_description ? 50 : 25;
  const delayRisk = timeToDays > 21 ? 60 : timeToDays > 10 ? 35 : 15;
  const overallRisk = Math.round((noShowRisk + priceObjectionRisk + competitorLossRisk + scopeCreepRisk + delayRisk) / 5);
  const riskLevel = overallRisk >= 60 ? "high" : overallRisk >= 35 ? "medium" : "low";

  return {
    prediction: {
      predicted_contract_value: Math.round(contractValue),
      predicted_profit_value: profitValue,
      predicted_close_probability: Math.round(closeProb * 100) / 100,
      predicted_show_probability: Math.round(showProb * 100) / 100,
      predicted_time_to_close_days: timeToDays,
      predicted_abandon_probability: Math.round(abandonProb * 100) / 100,
      predicted_lead_quality_score: quality,
      predicted_routing_priority: routingPriority,
      predicted_pricing_sensitivity: pricingSensitivity,
      predicted_best_offer_type: bestOffer,
      predicted_next_best_action: nextAction,
      confidence_score: confidence,
      reasoning_json: reasoning,
      model_version: "v1_rules",
    },
    risk: {
      no_show_risk: noShowRisk,
      price_objection_risk: priceObjectionRisk,
      competitor_loss_risk: competitorLossRisk,
      scope_creep_risk: scopeCreepRisk,
      delay_risk: delayRisk,
      overall_risk_score: overallRisk,
      risk_level: riskLevel,
      mitigation_suggestions: [
        noShowRisk > 40 ? "Confirmer RDV par SMS 24h avant" : null,
        priceObjectionRisk > 50 ? "Présenter une offre à la carte flexible" : null,
        competitorLossRisk > 40 ? "Contacter dans les 2h" : null,
        scopeCreepRisk > 40 ? "Clarifier la portée du projet avant visite" : null,
        delayRisk > 40 ? "Envoyer un rappel automatique hebdomadaire" : null,
      ].filter(Boolean),
    },
    nextAction,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { lead_id } = await req.json();
    if (!lead_id) throw new Error("lead_id required");

    const { data: lead, error: leadErr } = await supabase
      .from("market_leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    if (leadErr) throw leadErr;

    const signals: LeadSignals = {
      urgency_level: lead.urgency_level || "normal",
      budget_range: lead.budget_range || "unknown",
      timeline: lead.timeline || "flexible",
      property_type: lead.property_type || "residential",
      source: lead.source || "organic",
      city_slug: lead.city_slug || "",
      trade_slug: lead.trade_slug || "",
      contact_preference: lead.contact_preference || "email",
      has_description: !!(lead.description && lead.description.length > 20),
      referral_source: lead.referral_source || "",
    };

    const { prediction, risk, nextAction } = predictFromRules(signals);

    // Insert prediction
    const { error: predErr } = await supabase
      .from("market_lead_predictions")
      .insert({ lead_id, ...prediction });
    if (predErr) throw predErr;

    // Insert risk scores
    const { error: riskErr } = await supabase
      .from("market_lead_risk_scores")
      .insert({ lead_id, ...risk });
    if (riskErr) throw riskErr;

    // Generate next best action
    const actionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/market-generate-next-action`;
    await fetch(actionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ lead_id, next_action: nextAction, quality_score: prediction.predicted_lead_quality_score }),
    });

    // Update lead status
    await supabase.from("market_leads").update({ status: "scored" }).eq("id", lead_id);

    return new Response(JSON.stringify({ success: true, prediction, risk }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
