import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Compute funnel metrics from deep_link_events
    const [scansRes, viewsRes, ctasRes, authsRes, completionsRes] = await Promise.all([
      supabase.from("deep_link_events").select("deep_link_id, metadata", { count: "exact" }).eq("event_type", "qr_scanned"),
      supabase.from("deep_link_events").select("deep_link_id, metadata", { count: "exact" }).eq("event_type", "landing_viewed"),
      supabase.from("deep_link_events").select("deep_link_id, metadata", { count: "exact" }).eq("event_type", "cta_clicked"),
      supabase.from("deep_link_events").select("deep_link_id, metadata", { count: "exact" }).eq("event_type", "auth_completed"),
      supabase.from("deep_link_events").select("deep_link_id, metadata", { count: "exact" }).eq("event_type", "feature_completed"),
    ]);

    const totalScans = scansRes.count || 0;
    const totalViews = viewsRes.count || 0;
    const totalCtas = ctasRes.count || 0;
    const totalAuths = authsRes.count || 0;
    const totalCompletions = completionsRes.count || 0;

    const scanToViewRate = totalScans > 0 ? totalViews / totalScans : 0;
    const viewToCtaRate = totalViews > 0 ? totalCtas / totalViews : 0;
    const ctaToAuthRate = totalCtas > 0 ? totalAuths / totalCtas : 0;
    const authToCompletionRate = totalAuths > 0 ? totalCompletions / totalAuths : 0;

    // 2. Generate insights using AI
    const funnelSummary = `
Funnel Metrics:
- Scans: ${totalScans}
- Landing Views: ${totalViews} (scan→view: ${(scanToViewRate * 100).toFixed(1)}%)
- CTA Clicks: ${totalCtas} (view→CTA: ${(viewToCtaRate * 100).toFixed(1)}%)
- Auth Completed: ${totalAuths} (CTA→auth: ${(ctaToAuthRate * 100).toFixed(1)}%)
- Feature Completed: ${totalCompletions} (auth→completion: ${(authToCompletionRate * 100).toFixed(1)}%)
`;

    let aiInsights: any[] = [];

    if (LOVABLE_API_KEY && totalScans > 0) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a growth optimization AI for UNPRO, a home renovation platform. Analyze funnel data and return structured insights. Always respond in French.`,
              },
              {
                role: "user",
                content: `Analyze this funnel data and generate optimization insights:\n${funnelSummary}\nReturn actionable insights.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_insights",
                  description: "Generate optimization insights from funnel analysis",
                  parameters: {
                    type: "object",
                    properties: {
                      insights: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            insight_type: { type: "string", enum: ["landing_weak", "auth_friction", "high_performer", "placement_underperforming", "reward_opportunity", "scaling_opportunity"] },
                            metric_type: { type: "string" },
                            metric_value: { type: "number" },
                            confidence_score: { type: "number" },
                            description: { type: "string" },
                            suggested_action: { type: "string", enum: ["increase_reward", "decrease_reward", "boost_placement_visibility", "change_bundle_order", "switch_default_feature", "enable_ab_test"] },
                          },
                          required: ["insight_type", "metric_type", "metric_value", "confidence_score", "description", "suggested_action"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["insights"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "generate_insights" } },
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            aiInsights = parsed.insights || [];
          }
        }
      } catch (e) {
        console.error("AI insight generation failed:", e);
      }
    }

    // 3. Fallback: rule-based insights if AI didn't produce results
    if (aiInsights.length === 0 && totalScans > 5) {
      if (viewToCtaRate < 0.15) {
        aiInsights.push({
          insight_type: "landing_weak",
          metric_type: "view_to_cta_rate",
          metric_value: viewToCtaRate,
          confidence_score: 0.8,
          description: "Taux de CTA faible — le landing page ne convertit pas assez",
          suggested_action: "enable_ab_test",
        });
      }
      if (ctaToAuthRate < 0.3) {
        aiInsights.push({
          insight_type: "auth_friction",
          metric_type: "cta_to_auth_rate",
          metric_value: ctaToAuthRate,
          confidence_score: 0.75,
          description: "Friction d'authentification — beaucoup abandonnent au login",
          suggested_action: "boost_placement_visibility",
        });
      }
      if (authToCompletionRate > 0.5) {
        aiInsights.push({
          insight_type: "high_performer",
          metric_type: "auth_to_completion_rate",
          metric_value: authToCompletionRate,
          confidence_score: 0.9,
          description: "Excellent taux de complétion — candidat au scaling",
          suggested_action: "decrease_reward",
        });
      }
      if (authToCompletionRate < 0.2 && totalAuths > 3) {
        aiInsights.push({
          insight_type: "reward_opportunity",
          metric_type: "auth_to_completion_rate",
          metric_value: authToCompletionRate,
          confidence_score: 0.7,
          description: "Faible complétion — augmenter les récompenses pourrait aider",
          suggested_action: "increase_reward",
        });
      }
    }

    // 4. Store insights and create actions
    const storedInsights: any[] = [];
    for (const ins of aiInsights) {
      const { data: insightRow } = await supabase.from("optimization_insights").insert({
        feature: null,
        city: null,
        role: null,
        metric_type: ins.metric_type,
        metric_value: ins.metric_value,
        insight_type: ins.insight_type,
        confidence_score: ins.confidence_score,
      }).select().single();

      if (insightRow) {
        storedInsights.push({ ...insightRow, description: ins.description });

        // Create pending action
        await supabase.from("optimization_actions").insert({
          insight_id: insightRow.id,
          action_type: ins.suggested_action,
          old_value: {},
          new_value: { description: ins.description },
          status: "pending",
        });

        // MVP auto-action: increase_reward if confidence high enough
        if (ins.suggested_action === "increase_reward" && ins.confidence_score >= 0.75) {
          // Find active reward rules and bump required_count down by 1 (making it easier)
          const { data: rules } = await supabase
            .from("reward_rules")
            .select("*")
            .eq("is_active", true)
            .order("priority", { ascending: false })
            .limit(1);

          if (rules?.length) {
            const rule = rules[0];
            const newCount = Math.max(1, rule.required_count - 1);
            if (newCount !== rule.required_count) {
              await supabase.from("reward_rules").update({ required_count: newCount }).eq("id", rule.id);
              await supabase.from("optimization_actions").update({
                status: "applied",
                applied_at: new Date().toISOString(),
                old_value: { required_count: rule.required_count },
                new_value: { required_count: newCount },
                target_rule_id: rule.id,
              }).eq("insight_id", insightRow.id);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      funnel: { totalScans, totalViews, totalCtas, totalAuths, totalCompletions, scanToViewRate, viewToCtaRate, ctaToAuthRate, authToCompletionRate },
      insights: storedInsights,
      insightCount: storedInsights.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("growth-optimizer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
