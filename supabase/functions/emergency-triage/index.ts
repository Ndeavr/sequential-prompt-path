import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { action, request_id, description, category, photo_count, getting_worse, storm_mode } = await req.json();

    if (action === "triage") {
      // AI Triage via Lovable AI
      const triagePrompt = `Tu es Alex, experte en urgences résidentielles au Québec.
Analyse cette urgence et retourne un JSON structuré.

Catégorie: ${category || "inconnue"}
Description: ${description || "aucune"}
Photos: ${photo_count || 0}
Empirant: ${getting_worse ? "oui" : "non"}
Mode tempête: ${storm_mode ? "oui" : "non"}

Retourne UNIQUEMENT un JSON avec:
{
  "category": "catégorie confirmée ou corrigée",
  "severity": "low|medium|high|critical",
  "urgency_level": "low|medium|high|critical",
  "risk_flags": ["liste de risques détectés"],
  "recommended_trade": "type de professionnel recommandé",
  "triage_summary": "résumé court pour le dispatch (1-2 phrases)",
  "immediate_advice": "conseil immédiat pour l'utilisateur",
  "storm_related": true/false,
  "storm_pattern": "pattern si lié à météo",
  "storm_priority_score": 0-100
}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Tu es un système de triage d'urgence résidentielle. Retourne uniquement du JSON valide." },
            { role: "user", content: triagePrompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        // Fallback triage
        const fallback = {
          category: category || "autre",
          severity: getting_worse ? "high" : "medium",
          urgency_level: getting_worse ? "high" : "medium",
          risk_flags: getting_worse ? ["situation qui empire"] : [],
          recommended_trade: category || "general",
          triage_summary: description?.slice(0, 100) || "Urgence en attente de triage",
          immediate_advice: "Un expert va vous contacter rapidement.",
          storm_related: false,
          storm_pattern: null,
          storm_priority_score: 0,
        };

        if (request_id) {
          await supabase.from("emergency_requests").update({
            severity: fallback.severity,
            urgency_level: fallback.urgency_level,
            triage_summary: fallback.triage_summary,
            triage_json: fallback,
            status: "ready",
          }).eq("id", request_id);
        }

        return new Response(JSON.stringify(fallback), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || "{}";
      // Extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) content = jsonMatch[1];
      
      let triage;
      try { triage = JSON.parse(content.trim()); } catch { triage = { category, severity: "medium", urgency_level: "medium", risk_flags: [], recommended_trade: category, triage_summary: description?.slice(0, 100) || "Urgence", immediate_advice: "Un expert va vous contacter.", storm_related: false, storm_pattern: null, storm_priority_score: 0 }; }

      // Update request
      if (request_id) {
        await supabase.from("emergency_requests").update({
          category: triage.category || category,
          severity: triage.severity,
          urgency_level: triage.urgency_level,
          triage_summary: triage.triage_summary,
          triage_json: triage,
          storm_related: triage.storm_related || false,
          storm_pattern: triage.storm_pattern,
          storm_priority_score: triage.storm_priority_score || 0,
          status: "ready",
        }).eq("id", request_id);

        await supabase.from("emergency_events").insert({
          request_id,
          event_type: "triage_completed",
          payload: triage,
        });
      }

      return new Response(JSON.stringify(triage), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "match") {
      // Match contractors for emergency request
      const { data: request } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("id", request_id)
        .single();

      if (!request) throw new Error("Request not found");

      // Find eligible contractors
      const { data: contractors } = await supabase
        .from("contractors")
        .select("id, business_name, specialty, city, rating, review_count, verification_status, aipp_score")
        .eq("verification_status", "verified");

      if (!contractors?.length) {
        return new Response(JSON.stringify({ matches: [], reason: "no_contractors" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get nexus scores
      const { data: nexusProfiles } = await supabase
        .from("nexus_profiles")
        .select("user_id, global_score")
        .in("user_id", contractors.map(c => c.id));
      const nexusMap = new Map((nexusProfiles || []).map((n: any) => [n.user_id, n.global_score]));

      // Score contractors
      const scored = contractors.map(c => {
        const aipp = c.aipp_score || 0;
        const nexus = nexusMap.get(c.id) || 0;
        const serviceFit = (c.specialty?.toLowerCase().includes(request.category) ? 40 : 10);
        const emergencyCapable = 15; // Future: check emergency_capable flag
        const cityMatch = c.city?.toLowerCase().includes(request.address?.split(",").pop()?.trim().toLowerCase() || "") ? 10 : 0;
        const planPriority = 5;
        const responseSpeed = 10; // Future: based on historical data
        const acceptanceRate = 10; // Future: from emergency_matches stats

        const score = serviceFit + emergencyCapable + responseSpeed + acceptanceRate + cityMatch + planPriority + (aipp * 0.1) + (nexus * 0.1);
        return { contractor_id: c.id, business_name: c.business_name, match_score: Math.round(score * 10) / 10 };
      });

      scored.sort((a, b) => b.match_score - a.match_score);
      const topMatches = scored.slice(0, 5);

      // Insert matches
      const matchInserts = topMatches.map((m, i) => ({
        request_id,
        contractor_id: m.contractor_id,
        match_score: m.match_score,
        dispatch_order: i + 1,
        status: "pending",
      }));

      await supabase.from("emergency_matches").insert(matchInserts);

      // Set dispatch mode
      const dispatchMode = request.severity === "critical" ? "parallel" : "sequential";
      await supabase.from("emergency_requests").update({
        dispatch_mode: dispatchMode,
        status: "sent",
        current_dispatch_index: 1,
        next_dispatch_at: new Date(Date.now() + (request.dispatch_delay_seconds || 300) * 1000).toISOString(),
      }).eq("id", request_id);

      // Mark first match as sent (or all if parallel)
      if (dispatchMode === "parallel") {
        for (const m of matchInserts) {
          await supabase.from("emergency_matches").update({ sent_at: new Date().toISOString() }).eq("request_id", request_id).eq("contractor_id", m.contractor_id);
        }
      } else {
        const first = matchInserts[0];
        if (first) {
          await supabase.from("emergency_matches").update({ sent_at: new Date().toISOString() }).eq("request_id", request_id).eq("contractor_id", first.contractor_id).eq("dispatch_order", 1);
        }
      }

      await supabase.from("emergency_events").insert({
        request_id,
        event_type: "dispatch_started",
        payload: { mode: dispatchMode, matches: topMatches.length },
      });

      return new Response(JSON.stringify({ matches: topMatches, dispatch_mode: dispatchMode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "advance_dispatch") {
      // Move to next contractor in sequential mode
      const { data: request } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("id", request_id)
        .single();

      if (!request || request.dispatch_mode !== "sequential") {
        return new Response(JSON.stringify({ advanced: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nextIndex = (request.current_dispatch_index || 0) + 1;
      const { data: nextMatch } = await supabase
        .from("emergency_matches")
        .select("*")
        .eq("request_id", request_id)
        .eq("dispatch_order", nextIndex)
        .maybeSingle();

      if (!nextMatch) {
        // No more contractors - escalate
        await supabase.from("emergency_requests").update({ status: "escalated" }).eq("id", request_id);
        await supabase.from("emergency_events").insert({ request_id, event_type: "escalated", payload: { reason: "no_more_contractors" } });
        return new Response(JSON.stringify({ advanced: false, escalated: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("emergency_matches").update({ sent_at: new Date().toISOString() }).eq("id", nextMatch.id);
      await supabase.from("emergency_requests").update({
        current_dispatch_index: nextIndex,
        next_dispatch_at: new Date(Date.now() + (request.dispatch_delay_seconds || 300) * 1000).toISOString(),
      }).eq("id", request_id);

      await supabase.from("emergency_events").insert({
        request_id,
        event_type: "dispatch_advanced",
        payload: { index: nextIndex, contractor_id: nextMatch.contractor_id },
      });

      return new Response(JSON.stringify({ advanced: true, index: nextIndex }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("emergency-triage error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
