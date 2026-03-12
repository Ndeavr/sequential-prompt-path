import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MARKET_AVERAGES: Record<string, { low: number; high: number }> = {
  toiture: { low: 140000, high: 220000 },
  roof: { low: 140000, high: 220000 },
  fenêtres: { low: 80000, high: 160000 },
  windows: { low: 80000, high: 160000 },
  maçonnerie: { low: 60000, high: 130000 },
  masonry: { low: 60000, high: 130000 },
  ascenseur: { low: 100000, high: 250000 },
  elevator: { low: 100000, high: 250000 },
  plomberie: { low: 40000, high: 120000 },
  plumbing: { low: 40000, high: 120000 },
  membrane_stationnement: { low: 150000, high: 350000 },
  parking_membrane: { low: 150000, high: 350000 },
  électricité: { low: 30000, high: 90000 },
  electrical: { low: 30000, high: 90000 },
  balcons: { low: 50000, high: 150000 },
  balconies: { low: 50000, high: 150000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { document_text, syndicate_id, property_id, unit_count } = await req.json();

    if (!document_text || document_text.length < 100) {
      return new Response(JSON.stringify({ error: "document_text is required (min 100 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate to ~80k chars for model context
    const truncated = document_text.slice(0, 80000);

    const systemPrompt = `Tu es un analyste expert en études de fonds de prévoyance de copropriétés au Québec.

Analyse le texte extrait d'une étude de fonds de prévoyance et retourne une analyse structurée.

Règles:
- Extrais TOUS les composantes du bâtiment mentionnées avec leur durée de vie restante et coût estimé de remplacement
- Identifie le solde actuel du fonds, la contribution annuelle recommandée et tout déficit
- Identifie les alertes de risque (composantes urgentes, sous-financement)
- Calcule un score de santé du fonds sur 100
- Résume les recommandations principales
- Réponds en français`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyse cette étude de fonds de prévoyance:\n\n${truncated}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "reserve_fund_analysis",
              description: "Return the structured analysis of a reserve fund study",
              parameters: {
                type: "object",
                properties: {
                  components: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Component name in French" },
                        remaining_life_years: { type: "number", description: "Estimated remaining life in years" },
                        estimated_cost: { type: "number", description: "Estimated replacement cost in CAD" },
                        replacement_year: { type: "number", description: "Estimated year of replacement" },
                        urgency: { type: "string", enum: ["low", "medium", "high", "emergency"] },
                        notes: { type: "string", description: "Additional notes about the component" },
                      },
                      required: ["name", "remaining_life_years", "estimated_cost", "urgency"],
                      additionalProperties: false,
                    },
                  },
                  reserve_fund: {
                    type: "object",
                    properties: {
                      current_balance: { type: "number", description: "Current reserve fund balance in CAD" },
                      recommended_balance: { type: "number", description: "Recommended reserve fund balance" },
                      annual_contribution: { type: "number", description: "Current annual contribution" },
                      recommended_contribution: { type: "number", description: "Recommended annual contribution" },
                      deficit: { type: "number", description: "Deficit amount (0 if none)" },
                      health_score: { type: "number", description: "Fund health score 0-100" },
                      health_status: { type: "string", enum: ["healthy", "adequate", "underfunded", "critical"] },
                    },
                    required: ["current_balance", "recommended_balance", "deficit", "health_score", "health_status"],
                    additionalProperties: false,
                  },
                  risk_alerts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string", enum: ["warning", "critical"] },
                        title: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["severity", "title", "description"],
                      additionalProperties: false,
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key recommendations from the study",
                  },
                  summary: { type: "string", description: "One-paragraph executive summary in French" },
                  total_projected_costs_25y: { type: "number", description: "Total projected costs over 25 years" },
                },
                required: ["components", "reserve_fund", "risk_alerts", "recommendations", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "reserve_fund_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured analysis");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    // Market comparison - detect anomalies
    const marketComparisons: any[] = [];
    for (const comp of analysis.components || []) {
      const normalizedName = comp.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      for (const [key, range] of Object.entries(MARKET_AVERAGES)) {
        const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalizedName.includes(normalizedKey)) {
          const ratio = comp.estimated_cost / range.high;
          let status = "normal";
          if (ratio > 1.25) status = "overestimated";
          else if (ratio < 0.7) status = "underestimated";
          
          marketComparisons.push({
            component: comp.name,
            study_cost: comp.estimated_cost,
            market_low: range.low,
            market_high: range.high,
            status,
            deviation_percent: Math.round((ratio - 1) * 100),
          });
          break;
        }
      }
    }

    analysis.market_comparisons = marketComparisons;

    // Calculate cost per unit if unit_count provided
    if (unit_count && unit_count > 0) {
      analysis.cost_per_unit = {};
      for (const comp of analysis.components || []) {
        analysis.cost_per_unit[comp.name] = Math.round(comp.estimated_cost / unit_count);
      }
      if (analysis.reserve_fund?.deficit) {
        analysis.cost_per_unit._deficit = Math.round(analysis.reserve_fund.deficit / unit_count);
      }
    }

    // Persist to database
    if (syndicate_id && analysis.reserve_fund) {
      await supabase.from("syndicate_reserve_fund_snapshots").insert({
        syndicate_id,
        snapshot_date: new Date().toISOString().split("T")[0],
        total_balance: analysis.reserve_fund.current_balance || 0,
        annual_contribution: analysis.reserve_fund.annual_contribution || 0,
        recommended_contribution: analysis.reserve_fund.recommended_contribution || null,
        funding_ratio: analysis.reserve_fund.health_score ? analysis.reserve_fund.health_score / 100 : null,
        notes: `Analyse IA — Score: ${analysis.reserve_fund.health_score}/100 — ${analysis.reserve_fund.health_status}`,
      }).then(({ error }) => { if (error) console.error("Snapshot insert error:", error); });

      // Insert capex forecasts
      for (const comp of analysis.components || []) {
        if (comp.replacement_year) {
          await supabase.from("syndicate_capex_forecasts").insert({
            syndicate_id,
            component: comp.name,
            forecast_year: comp.replacement_year,
            estimated_cost: comp.estimated_cost,
            replacement_priority: comp.urgency === "emergency" ? "high" : comp.urgency,
            description: comp.notes || `Remplacement prévu — vie restante: ${comp.remaining_life_years} ans`,
          }).then(({ error }) => { if (error) console.error("Capex insert error:", error); });
        }
      }
    }

    if (property_id) {
      await supabase.from("property_events").insert({
        property_id,
        event_type: "document_ingested",
        title: "Étude du fonds de prévoyance analysée par IA",
        description: `Score santé: ${analysis.reserve_fund?.health_score}/100 — ${analysis.components?.length || 0} composantes identifiées`,
        event_date: new Date().toISOString(),
      }).then(({ error }) => { if (error) console.error("Event insert error:", error); });
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Analyze reserve fund error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
