/**
 * UNPRO — Property Autopilot Engine
 * Evaluates rules against properties and triggers actions automatically.
 * Actions: suggest_solution, recommend_contractors, trigger_booking, notify_user, create_seo_content
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "evaluate";

    if (action === "evaluate") {
      // 1. Get active rules
      const { data: rules } = await supabase
        .from("autopilot_rules")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: true });

      if (!rules?.length) {
        return new Response(JSON.stringify({ eventsCreated: 0, message: "No active rules" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Get properties with basic info
      const { data: properties } = await supabase
        .from("properties")
        .select("id, user_id, address, city, property_type, year_built, square_footage, home_score, created_at")
        .limit(500);

      if (!properties?.length) {
        return new Response(JSON.stringify({ eventsCreated: 0, message: "No properties" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Ask AI to evaluate rules against properties
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a property intelligence engine for Quebec homes. Evaluate rules against properties and return triggered events. Consider Quebec climate (harsh winters, spring thaw). Current month: ${new Date().getMonth() + 1}.`,
            },
            {
              role: "user",
              content: `Rules:\n${JSON.stringify(rules.map(r => ({ id: r.id, trigger_type: r.trigger_type, condition: r.condition_json, action_type: r.action_type, label: r.label_fr })))}\n\nProperties (sample):\n${JSON.stringify(properties.slice(0, 50).map(p => ({ id: p.id, city: p.city, type: p.property_type, year_built: p.year_built, home_score: p.home_score })))}\n\nReturn which rules trigger for which properties.`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "trigger_events",
              description: "Return triggered autopilot events",
              parameters: {
                type: "object",
                properties: {
                  events: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        property_id: { type: "string" },
                        rule_id: { type: "string" },
                        event_type: { type: "string" },
                        risk_description_fr: { type: "string" },
                        suggested_action: { type: "string" },
                        urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      },
                      required: ["property_id", "rule_id", "event_type", "risk_description_fr"],
                    },
                  },
                },
                required: ["events"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "trigger_events" } },
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429 || status === 402) {
          return new Response(JSON.stringify({ error: status === 429 ? "Rate limited" : "Payment required" }), {
            status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI error: " + status);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let events: any[] = [];
      if (toolCall?.function?.arguments) {
        try { events = JSON.parse(toolCall.function.arguments).events || []; } catch { events = []; }
      }

      // 4. Insert events and actions
      let created = 0;
      for (const evt of events) {
        // Validate property_id exists
        const prop = properties.find(p => p.id === evt.property_id);
        if (!prop) continue;

        const { data: event } = await supabase.from("autopilot_events").insert({
          property_id: evt.property_id,
          rule_id: evt.rule_id,
          event_type: evt.event_type,
          status: "pending",
          metadata: { risk: evt.risk_description_fr, urgency: evt.urgency },
        }).select("id").single();

        if (event) {
          created++;
          // Create action
          const rule = rules.find(r => r.id === evt.rule_id);
          await supabase.from("autopilot_actions").insert({
            property_id: evt.property_id,
            event_id: event.id,
            action_type: rule?.action_type || "suggest_solution",
            payload_json: { description: evt.risk_description_fr, suggested_action: evt.suggested_action },
            status: "pending",
          });

          // Create user notification
          await supabase.from("user_notifications").insert({
            user_id: prop.user_id,
            type: "autopilot",
            message: evt.risk_description_fr,
            channel: "in_app",
            metadata: { property_id: evt.property_id, event_id: event.id, urgency: evt.urgency },
          });
        }
      }

      return new Response(JSON.stringify({ success: true, eventsCreated: created }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: get-stats
    if (action === "stats") {
      const [rulesRes, eventsRes, actionsRes] = await Promise.all([
        supabase.from("autopilot_rules").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("autopilot_events").select("id", { count: "exact", head: true }),
        supabase.from("autopilot_actions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return new Response(JSON.stringify({
        activeRules: rulesRes.count || 0,
        totalEvents: eventsRes.count || 0,
        pendingActions: actionsRes.count || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("autopilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
