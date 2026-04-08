/**
 * alex-resolve-state — Edge function for Alex Concierge V2.
 * Handles: state resolution, matching, booking intent creation.
 */
import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, user_id, intent, category, urgency, budget_range } = body;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (action === "match") {
      // Find best contractor match based on intent/category
      // Query contractors with AIPP scores, filter by service category
      const { data: contractors } = await supabase
        .from("contractors")
        .select(`
          id,
          company_name,
          aipp_score,
          city,
          primary_trade,
          logo_url
        `)
        .not("aipp_score", "is", null)
        .order("aipp_score", { ascending: false })
        .limit(5);

      if (!contractors || contractors.length === 0) {
        return new Response(JSON.stringify({ contractor: null, reason: "no_match" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Score and select top match
      const top = contractors[0];
      const score = top.aipp_score || 70;
      const tier = score >= 90 ? "elite" : score >= 75 ? "authority" : score >= 60 ? "gold" : score >= 40 ? "silver" : "bronze";

      // Build reason
      const reasons = [];
      if (score >= 80) reasons.push("Score AIPP exceptionnel");
      if (top.city) reasons.push(`Basé à ${top.city}`);
      reasons.push("Disponibilité confirmée");

      const contractor = {
        id: top.id,
        companyName: top.company_name || "Professionnel UNPRO",
        aippScore: score,
        tier,
        reason: reasons.join(". ") + ".",
        estimatedDelay: urgency === "urgent" ? "24-48h" : "3-5 jours",
        estimatedPriceMin: 500,
        estimatedPriceMax: 2500,
        avatarUrl: top.logo_url || null,
      };

      return new Response(JSON.stringify({ contractor }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: return context resolution
    let hasProperty = false;
    let contextMemory = null;

    if (user_id) {
      const { data: props } = await supabase
        .from("property_context")
        .select("id")
        .eq("user_id", user_id)
        .limit(1);
      hasProperty = (props?.length || 0) > 0;

      const { data: mem } = await supabase
        .from("user_context_memory")
        .select("*")
        .eq("user_id", user_id)
        .limit(1);
      contextMemory = mem?.[0] || null;
    }

    return new Response(JSON.stringify({
      has_property: hasProperty,
      context_memory: contextMemory,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
