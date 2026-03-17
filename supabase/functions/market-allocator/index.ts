import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { action, opportunity_id, city, problem_type } = await req.json();

    if (action === "allocate") {
      // Get the opportunity
      const { data: opp } = await supabase
        .from("market_opportunities")
        .select("*")
        .eq("id", opportunity_id)
        .single();

      if (!opp) throw new Error("Opportunity not found");

      // Get dynamic pricing
      const { data: pricing } = await supabase
        .from("dynamic_pricing")
        .select("*")
        .eq("city", opp.city)
        .eq("problem_type", opp.problem_type)
        .single();

      const basePrice = pricing?.final_price_cents || 500;

      // Get eligible contractors with budgets
      const { data: contractors } = await supabase
        .from("contractors")
        .select(`
          id, business_name, city, aipp_score,
          contractor_budgets!inner(remaining_budget_cents, boost_active, boost_multiplier)
        `)
        .gte("contractor_budgets.remaining_budget_cents", basePrice);

      if (!contractors?.length) {
        return new Response(JSON.stringify({ allocated: false, reason: "no_eligible_contractors" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get nexus scores for ranking
      const contractorIds = contractors.map((c: any) => c.id);
      const { data: nexusProfiles } = await supabase
        .from("nexus_profiles")
        .select("user_id, global_score")
        .in("user_id", contractors.map((c: any) => c.id));

      const nexusMap = new Map((nexusProfiles || []).map((n: any) => [n.user_id, n.global_score]));

      // Score each contractor
      const scored = contractors.map((c: any) => {
        const aipp = c.aipp_score || 0;
        const nexus = nexusMap.get(c.id) || 0;
        const budget = c.contractor_budgets?.[0];
        const boostFactor = budget?.boost_active ? (budget.boost_multiplier || 1.2) : 1.0;
        const cityMatch = c.city?.toLowerCase() === opp.city?.toLowerCase() ? 15 : 0;

        const score = (aipp * 0.35) + (nexus * 0.3) + cityMatch + (boostFactor * 10);
        return { ...c, allocation_score: score, boost: budget?.boost_active };
      });

      scored.sort((a: any, b: any) => b.allocation_score - a.allocation_score);
      const winner = scored[0];

      // Determine price (boost = premium)
      const finalPrice = winner.boost ? Math.round(basePrice * 1.3) : basePrice;

      // Create allocation
      const { data: allocation } = await supabase
        .from("opportunity_allocations")
        .insert({
          opportunity_id: opp.id,
          contractor_id: winner.id,
          allocation_score: winner.allocation_score,
          price_charged_cents: finalPrice,
          allocation_mode: winner.boost ? "boost" : "intelligent",
          status: "allocated",
        })
        .select()
        .single();

      // Deduct budget
      await supabase.rpc("deduct_contractor_budget", {
        _contractor_id: winner.id,
        _amount: finalPrice,
      }).catch(() => {
        // Fallback: direct update
        const remaining = winner.contractor_budgets?.[0]?.remaining_budget_cents || 0;
        return supabase
          .from("contractor_budgets")
          .update({ remaining_budget_cents: Math.max(0, remaining - finalPrice) })
          .eq("contractor_id", winner.id);
      });

      // Update opportunity status
      await supabase
        .from("market_opportunities")
        .update({ status: "allocated" })
        .eq("id", opp.id);

      return new Response(JSON.stringify({
        allocated: true,
        allocation,
        contractor: { id: winner.id, name: winner.business_name, score: winner.allocation_score },
        price_cents: finalPrice,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "update_pricing") {
      // Recalculate dynamic pricing for a city+problem
      const { data: opps } = await supabase
        .from("market_opportunities")
        .select("id")
        .eq("city", city)
        .eq("problem_type", problem_type)
        .eq("status", "open");

      const demandCount = opps?.length || 0;

      const { data: contractors } = await supabase
        .from("contractors")
        .select("id")
        .ilike("city", `%${city}%`);

      const supplyCount = contractors?.length || 1;

      const demandMultiplier = Math.min(2.0, 1.0 + (demandCount / 10) * 0.5);
      const supplyMultiplier = Math.max(0.5, 1.0 - (supplyCount / 20) * 0.3);
      const basePriceCents = 500;
      const finalPrice = Math.round(basePriceCents * demandMultiplier * supplyMultiplier);

      await supabase
        .from("dynamic_pricing")
        .upsert({
          city,
          problem_type,
          base_price_cents: basePriceCents,
          demand_multiplier: demandMultiplier,
          supply_multiplier: supplyMultiplier,
          final_price_cents: Math.max(100, Math.min(10000, finalPrice)),
          sample_size: demandCount + supplyCount,
          updated_at: new Date().toISOString(),
        }, { onConflict: "city,problem_type" });

      return new Response(JSON.stringify({
        updated: true,
        city,
        problem_type,
        demand: demandMultiplier,
        supply: supplyMultiplier,
        final_price_cents: finalPrice,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
