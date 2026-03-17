/**
 * UNPRO — Auto Campaign Generator
 * Analyzes performance data and generates new campaigns automatically.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Gather performance data
    const { data: events } = await supabase
      .from("deep_link_events")
      .select("event_type, metadata, created_at")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(1000);

    const { data: conversions } = await supabase
      .from("qualified_conversions")
      .select("conversion_type, is_qualified, created_at")
      .eq("is_qualified", true)
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(500);

    const { data: placements } = await supabase
      .from("qr_placements")
      .select("*")
      .eq("is_active", true)
      .limit(50);

    const { data: insights } = await supabase
      .from("optimization_insights")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    // 2. Ask AI to analyze and generate campaign suggestions
    const prompt = `Analyze this UNPRO growth data and suggest 3-5 new campaigns to generate.

Performance Data (last 7 days):
- Events: ${events?.length || 0} total
- Qualified conversions: ${conversions?.length || 0}
- Active placements: ${placements?.length || 0}
- Recent insights: ${JSON.stringify(insights?.slice(0, 5)?.map(i => ({ type: i.insight_type, feature: i.feature, city: i.city, metric: i.metric_value })))}

Available features: kitchen, home_score, booking, design, energy, maintenance
Available placement types: truck_wrap, condo_lobby, business_card, yard_sign, social_ad
Target cities: Montreal, Laval, Quebec, Longueuil, Gatineau

For each campaign suggest:
- name (French)
- type: expansion (geo), feature_boost, or placement_optimization
- target_city
- feature
- placement_type
- expected_lift_pct (estimated conversion lift)
- source_pattern (what data pattern triggered this)
- config with: headline, reward_boost_pct, bundle_order`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an AI growth strategist for UNPRO, a home renovation platform in Quebec. Return campaign suggestions." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_campaigns",
            description: "Generate campaign suggestions based on performance analysis",
            parameters: {
              type: "object",
              properties: {
                campaigns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string", enum: ["expansion", "feature_boost", "placement_optimization"] },
                      target_city: { type: "string" },
                      feature: { type: "string" },
                      placement_type: { type: "string" },
                      expected_lift_pct: { type: "number" },
                      source_pattern: { type: "object" },
                      config: { type: "object" },
                    },
                    required: ["name", "type", "target_city", "feature", "placement_type", "expected_lift_pct"],
                  },
                },
              },
              required: ["campaigns"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_campaigns" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let campaigns: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        campaigns = parsed.campaigns || [];
      } catch { campaigns = []; }
    }

    // 3. Insert auto campaigns
    let created = 0;
    for (const c of campaigns) {
      const { data: campaign, error } = await supabase.from("auto_campaigns").insert({
        name: c.name,
        source_pattern: c.source_pattern || {},
        target_city: c.target_city,
        feature: c.feature,
        placement_type: c.placement_type,
        status: "draft",
        expected_lift_pct: c.expected_lift_pct || 0,
      }).select("id").single();

      if (!error && campaign) {
        created++;
        // Create generation record
        await supabase.from("campaign_generations").insert({
          auto_campaign_id: campaign.id,
          generated_assets: c.config || {},
          rules_applied: [{ type: c.type, source: "ai_analysis" }],
          status: "pending",
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      campaignsGenerated: created,
      campaigns: campaigns.map(c => ({ name: c.name, type: c.type, city: c.target_city })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("campaign-generator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
