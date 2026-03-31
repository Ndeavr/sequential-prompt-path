import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GST_RATE = 0.05;
const QST_RATE = 0.09975;

interface CalcRequest {
  category_slug: string;
  market_slug: string;
  selected_plan_code: string;
  selected_billing_period: "month" | "year";
  selected_rendezvous_count: number;
  revenue_goal_monthly?: number;
  capacity_monthly?: number;
  close_rate_percent?: number;
  average_contract_value?: number;
  contractor_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: CalcRequest = await req.json();
    const {
      category_slug,
      market_slug,
      selected_plan_code,
      selected_billing_period = "month",
      selected_rendezvous_count = 0,
      revenue_goal_monthly = 0,
      capacity_monthly = 0,
      close_rate_percent = 0,
      average_contract_value = 0,
      contractor_id,
    } = body;

    // Load category
    const { data: category, error: catErr } = await supabase
      .from("pricing_categories")
      .select("*")
      .eq("slug", category_slug)
      .eq("is_active", true)
      .single();
    if (catErr || !category) {
      return new Response(JSON.stringify({ error: "Catégorie invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load market
    const { data: market, error: mktErr } = await supabase
      .from("pricing_markets")
      .select("*")
      .eq("slug", market_slug)
      .eq("is_active", true)
      .single();
    if (mktErr || !market) {
      return new Response(JSON.stringify({ error: "Marché invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load plan base
    const { data: planBase, error: planErr } = await supabase
      .from("pricing_plan_bases")
      .select("*")
      .eq("plan_code", selected_plan_code)
      .eq("is_active", true)
      .single();
    if (planErr || !planBase) {
      return new Response(JSON.stringify({ error: "Plan invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load all plans for recommendation
    const { data: allPlans } = await supabase
      .from("pricing_plan_bases")
      .select("*")
      .eq("is_active", true)
      .order("base_price", { ascending: true });

    // Load rendezvous package if needed
    let rdvPackage: any = null;
    if (selected_rendezvous_count > 0) {
      const { data: pkgs } = await supabase
        .from("pricing_rendezvous_packages")
        .select("*")
        .eq("is_active", true)
        .order("rendezvous_count", { ascending: true });

      // Find best matching package
      rdvPackage = pkgs?.find((p: any) => p.rendezvous_count >= selected_rendezvous_count)
        || pkgs?.[pkgs.length - 1];
    }

    // Load active overrides
    const { data: overrides } = await supabase
      .from("pricing_rule_overrides")
      .select("*")
      .eq("is_active", true)
      .or(`category_id.eq.${category.id},market_id.eq.${market.id},scope_type.eq.global`);

    // ── CALCULATION ENGINE ──

    // 1. Base plan price
    const basePlanAmount = planBase.base_price;

    // 2. Category multiplier (based on competitiveness + difficulty)
    const categoryMultiplier = 1 + (category.base_competitiveness_score - 50) / 200
      + (category.base_market_difficulty_score - 50) / 300;

    // 3. Market multiplier
    const marketMultiplier = market.competitiveness_multiplier * market.premium_territory_multiplier;

    // 4. Competitiveness score (combined)
    const competitivenessScore = Math.round(
      (category.base_competitiveness_score * 0.6 + market.demand_score * 0.4)
    );

    // 5. Rendezvous amount
    let rendezvousAmount = 0;
    if (rdvPackage && selected_rendezvous_count > 0) {
      const unitPrice = category.base_rendezvous_unit_price;
      const catMult = rdvPackage.category_multiplier_enabled ? categoryMultiplier : 1;
      const mktMult = rdvPackage.market_multiplier_enabled ? marketMultiplier : 1;
      rendezvousAmount = Math.round(unitPrice * selected_rendezvous_count * catMult * mktMult * 100) / 100;
    }

    // 6. Apply overrides
    let overrideAdjustment = 0;
    const activeOverrides = overrides?.filter((o: any) => {
      const now = new Date();
      if (o.starts_at && new Date(o.starts_at) > now) return false;
      if (o.ends_at && new Date(o.ends_at) < now) return false;
      return true;
    }) || [];

    for (const ov of activeOverrides) {
      if (ov.override_type === "discount_percentage") {
        overrideAdjustment -= (basePlanAmount + rendezvousAmount) * (ov.override_value / 100);
      } else if (ov.override_type === "flat_discount") {
        overrideAdjustment -= ov.override_value;
      } else if (ov.override_type === "surcharge_percentage") {
        overrideAdjustment += (basePlanAmount + rendezvousAmount) * (ov.override_value / 100);
      } else if (ov.override_type === "flat_surcharge") {
        overrideAdjustment += ov.override_value;
      }
    }

    // 7. Subtotal
    const adjustedPlan = Math.round(basePlanAmount * categoryMultiplier * marketMultiplier * 100) / 100;
    const subtotal = Math.max(0, Math.round((adjustedPlan + rendezvousAmount + overrideAdjustment) * 100) / 100);

    // 8. Yearly discount
    const billingMultiplier = selected_billing_period === "year" ? 0.85 : 1;
    const billedSubtotal = Math.round(subtotal * billingMultiplier * 100) / 100;

    // 9. Quebec taxes
    const gstAmount = Math.round(billedSubtotal * GST_RATE * 100) / 100;
    const qstAmount = Math.round(billedSubtotal * QST_RATE * 100) / 100;
    const totalAmount = Math.round((billedSubtotal + gstAmount + qstAmount) * 100) / 100;

    // 10. Plan recommendation
    let recommendedPlanCode = selected_plan_code;
    const floorPlan = category.base_plan_floor || "recrue";
    const planOrder = ["recrue", "pro", "premium", "elite", "signature"];
    const floorIdx = planOrder.indexOf(floorPlan);
    const selectedIdx = planOrder.indexOf(selected_plan_code);
    if (selectedIdx < floorIdx) {
      recommendedPlanCode = floorPlan;
    }

    // Revenue projections
    const avgContract = average_contract_value || (category.average_contract_value_min + category.average_contract_value_max) / 2;
    const closeRate = close_rate_percent > 0 ? close_rate_percent / 100 : 0.25;
    const totalRdv = (planBase.included_rendezvous || 0) + selected_rendezvous_count;
    const estimatedConversions = Math.round(totalRdv * closeRate);
    const estimatedRevenue = Math.round(estimatedConversions * avgContract);
    const estimatedROI = totalAmount > 0 ? Math.round((estimatedRevenue / totalAmount) * 100) / 100 : 0;

    // Recommended rendezvous based on revenue goal
    let recommendedRdvCount = selected_rendezvous_count;
    if (revenue_goal_monthly > 0 && avgContract > 0 && closeRate > 0) {
      recommendedRdvCount = Math.ceil(revenue_goal_monthly / (avgContract * closeRate));
    }

    // Build snapshot
    const snapshot = {
      version: "v1",
      calculated_at: new Date().toISOString(),
      inputs: body,
      category: { id: category.id, slug: category.slug, name: category.name_fr },
      market: { id: market.id, slug: market.slug, name: market.city_name, tier: market.market_tier },
      plan: { code: planBase.plan_code, name: planBase.plan_name, base_price: planBase.base_price },
      multipliers: {
        category: Math.round(categoryMultiplier * 1000) / 1000,
        market: Math.round(marketMultiplier * 1000) / 1000,
        competitiveness_score: competitivenessScore,
        billing: billingMultiplier,
      },
      amounts: {
        base_plan: basePlanAmount,
        adjusted_plan: adjustedPlan,
        rendezvous: rendezvousAmount,
        override_adjustment: overrideAdjustment,
        subtotal: billedSubtotal,
        gst: gstAmount,
        qst: qstAmount,
        total: totalAmount,
      },
      projections: {
        total_rendezvous: totalRdv,
        estimated_conversions: estimatedConversions,
        estimated_revenue: estimatedRevenue,
        estimated_roi: estimatedROI,
        recommended_rdv_count: recommendedRdvCount,
      },
      overrides_applied: activeOverrides.map((o: any) => ({ type: o.override_type, value: o.override_value, reason: o.reason })),
    };

    // Save quote
    const { data: quote, error: quoteErr } = await supabase
      .from("pricing_quotes")
      .insert({
        contractor_id: contractor_id || null,
        category_id: category.id,
        market_id: market.id,
        selected_plan_code,
        selected_billing_period,
        selected_rendezvous_count,
        revenue_goal_monthly,
        capacity_monthly,
        close_rate_percent,
        average_contract_value,
        competitiveness_score: competitivenessScore,
        recommended_plan_code: recommendedPlanCode,
        recommended_rendezvous_count: recommendedRdvCount,
        base_plan_amount: basePlanAmount,
        rendezvous_amount: rendezvousAmount,
        category_multiplier: Math.round(categoryMultiplier * 1000) / 1000,
        market_multiplier: Math.round(marketMultiplier * 1000) / 1000,
        competitiveness_multiplier: 1.0,
        override_adjustment_amount: overrideAdjustment,
        subtotal_amount: billedSubtotal,
        gst_amount: gstAmount,
        qst_amount: qstAmount,
        total_amount: totalAmount,
        calculation_version: "v1",
        pricing_snapshot: snapshot,
        status: "calculated",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (quoteErr) {
      console.error("Quote save error:", quoteErr);
    }

    // Build market badges
    const badges: string[] = [];
    if (market.market_tier === "premium") badges.push("Marché premium");
    if (competitivenessScore >= 75) badges.push("Forte compétition");
    if (avgContract >= 10000) badges.push("Valeur moyenne élevée");
    if (recommendedRdvCount >= 30) badges.push("Volume élevé requis");

    return new Response(JSON.stringify({
      quote_id: quote?.id,
      recommended_plan_code: recommendedPlanCode,
      selected_plan: {
        code: planBase.plan_code,
        name: planBase.plan_name,
        base_price: basePlanAmount,
      },
      category: { slug: category.slug, name: category.name_fr },
      market: { slug: market.slug, name: market.city_name, tier: market.market_tier },
      multipliers: snapshot.multipliers,
      amounts: snapshot.amounts,
      projections: snapshot.projections,
      badges,
      billing_period: selected_billing_period,
      all_plans: allPlans?.map((p: any) => ({
        code: p.plan_code,
        name: p.plan_name,
        base_price: p.base_price,
        included_rendezvous: p.included_rendezvous,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Pricing calculate error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
