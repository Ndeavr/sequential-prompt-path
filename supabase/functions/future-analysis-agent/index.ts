/**
 * UNPRO — Vision IA 5 Ans
 * Edge function: future-analysis-agent
 *
 * Génère une projection 5 ans pour une entreprise importée :
 *  - 3 scénarios (no_change, natural_growth, unpro_optimized)
 *  - forces / faiblesses / opportunités
 *  - timeline 1/3/5 ans
 * Stocke dans company_future_analysis et logue l'outcome (reliability).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Signals {
  business_name?: string;
  city?: string;
  category?: string;
  reviews_count?: number;
  reviews_avg?: number;
  reviews_response_rate?: number;
  website_quality?: number;
  seo_local_score?: number;
  ai_visibility_score?: number;
  social_signals?: number;
  years_in_business?: number;
  territory_density?: number;
  local_competition?: number;
}

interface RequestBody {
  company_id?: string;
  contractor_id?: string;
  signals?: Signals;
  ab_variant_copy?: string;
  ab_variant_order?: string;
  ab_variant_cta?: string;
  ab_variant_sms?: string;
}

const SYSTEM_PROMPT = `Tu es l'analyste IA d'UNPRO. Tu produis des projections 5 ans pour des entreprises de services résidentiels au Québec.
- Français québécois, ton premium, factuel, jamais alarmiste.
- Aucune mention de "soumissions multiples", "réseau d'entrepreneurs", "trouvez un entrepreneur".
- Positionnement : registre intelligent RBQ, visibilité IA, autorité locale.
- Tu retournes STRICTEMENT du JSON valide selon le schéma demandé.`;

function buildUserPrompt(signals: Signals) {
  return `Analyse les signaux suivants et produis une projection 5 ans :
${JSON.stringify(signals, null, 2)}

Retourne UNIQUEMENT ce JSON :
{
  "current": { "score": 0-100, "visibility": 0-100, "authority": 0-100 },
  "scenarios": {
    "no_change": { "summary": "1-2 phrases", "risks": ["...","...","..."], "projection_5y": "1 phrase" },
    "natural_growth": { "summary": "1-2 phrases", "gains": ["+X% visibilité","+Y% demandes","..."], "projection_5y": "1 phrase" },
    "unpro_optimized": { "summary": "1-2 phrases", "gains": ["...","...","...","..."], "projection_5y": "1 phrase" }
  },
  "strengths": ["...","...","..."],
  "weaknesses": ["...","...","..."],
  "opportunities": ["...","...","..."],
  "timeline": {
    "now":  { "reputation": 0-100, "visibility": 0-100, "ai_recommendations": 0-100, "growth_potential": 0-100 },
    "y1":   { "reputation": 0-100, "visibility": 0-100, "ai_recommendations": 0-100, "growth_potential": 0-100 },
    "y3":   { "reputation": 0-100, "visibility": 0-100, "ai_recommendations": 0-100, "growth_potential": 0-100 },
    "y5":   { "reputation": 0-100, "visibility": 0-100, "ai_recommendations": 0-100, "growth_potential": 0-100 }
  }
}`;
}

function fallbackAnalysis(signals: Signals) {
  const base = Math.max(35, Math.min(80, (signals.reviews_count ?? 10) + 40));
  return {
    current: { score: base, visibility: Math.max(20, base - 15), authority: Math.max(25, base - 10) },
    scenarios: {
      no_change: {
        summary: "En maintenant votre trajectoire actuelle, votre entreprise conservera une croissance stable mais risque de perdre en visibilité face aux entreprises optimisées pour la recherche IA.",
        risks: ["Visibilité IA faible", "Dépendance aux références", "Croissance limitée"],
        projection_5y: "Stagnation progressive de la visibilité en ligne.",
      },
      natural_growth: {
        summary: "Si vous continuez à obtenir des avis et améliorer votre présence web, votre autorité locale progressera.",
        gains: ["+35 % visibilité", "+22 % demandes", "Meilleure autorité locale"],
        projection_5y: "Croissance organique solide mais limitée par la concurrence optimisée IA.",
      },
      unpro_optimized: {
        summary: "Si votre profil est activé et enrichi dans le registre intelligent UNPRO, l'IA vous recommande activement.",
        gains: [
          "Recommandations IA accrues",
          "Visibilité locale dominante",
          "Plus de rendez-vous qualifiés",
          "Moins de temps perdu en suivis inutiles",
        ],
        projection_5y: "Position d'autorité locale citée par les moteurs IA.",
      },
    },
    strengths: ["Réputation solide", "Ancienneté rassurante", "Taux d'avis positif"],
    weaknesses: ["Peu de contenu local", "Faible visibilité IA", "Réponses aux avis incomplètes"],
    opportunities: ["Optimisation profil IA", "Enrichissement du registre", "Activation territoire"],
    timeline: {
      now: { reputation: base, visibility: base - 15, ai_recommendations: base - 25, growth_potential: base - 10 },
      y1:  { reputation: base + 3, visibility: base - 10, ai_recommendations: base - 20, growth_potential: base - 5 },
      y3:  { reputation: base + 5, visibility: base - 5,  ai_recommendations: base - 15, growth_potential: base },
      y5:  { reputation: base + 8, visibility: base,      ai_recommendations: base - 10, growth_potential: base + 5 },
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signals = body.signals ?? {};
  const ai_model_used = "google/gemini-3-flash-preview";
  let analysis: any = null;
  let confidence_score = 0.9;
  let used_fallback = false;

  if (LOVABLE_API_KEY) {
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model: ai_model_used,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(signals) },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content ?? "{}";
        analysis = JSON.parse(text);
      } else {
        used_fallback = true;
        confidence_score = 0.4;
      }
    } catch (e) {
      console.error("AI call failed", e);
      used_fallback = true;
      confidence_score = 0.4;
    }
  } else {
    used_fallback = true;
    confidence_score = 0.4;
  }

  if (!analysis || !analysis.current) {
    analysis = fallbackAnalysis(signals);
    used_fallback = true;
    confidence_score = 0.4;
  }

  const insertPayload = {
    company_id: body.company_id ?? null,
    contractor_id: body.contractor_id ?? null,
    current_score: analysis.current?.score ?? null,
    current_visibility: analysis.current?.visibility ?? null,
    current_authority: analysis.current?.authority ?? null,
    scenario_no_change: analysis.scenarios?.no_change ?? {},
    scenario_growth: analysis.scenarios?.natural_growth ?? {},
    scenario_unpro: analysis.scenarios?.unpro_optimized ?? {},
    strengths: analysis.strengths ?? [],
    weaknesses: analysis.weaknesses ?? [],
    opportunities: analysis.opportunities ?? [],
    timeline_data: analysis.timeline ?? {},
    ab_variant_copy: body.ab_variant_copy ?? null,
    ab_variant_order: body.ab_variant_order ?? null,
    ab_variant_cta: body.ab_variant_cta ?? null,
    ab_variant_sms: body.ab_variant_sms ?? null,
    ai_model_used: used_fallback ? `${ai_model_used}+fallback` : ai_model_used,
    confidence_score,
  };

  const { data: inserted, error } = await supabase
    .from("company_future_analysis")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("insert error", error);
    return new Response(JSON.stringify({ error: "db_insert_failed", detail: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Best-effort outcome logging (production reliability)
  try {
    await supabase.from("platform_operation_outcomes").insert({
      operation: "future_analysis_agent",
      outcome: "success",
      detail: { used_fallback, confidence_score, company_id: body.company_id },
    });
  } catch { /* ignore */ }

  return new Response(JSON.stringify({ ok: true, analysis: inserted }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
