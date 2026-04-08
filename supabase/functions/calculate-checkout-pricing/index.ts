import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { planCode, billingInterval, couponCode, provinceCode = "QC", countryCode = "CA" } = await req.json();

    if (!planCode || !billingInterval) {
      return new Response(JSON.stringify({ error: "planCode and billingInterval required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch plan from catalog
    const { data: plan, error: planError } = await supabase
      .from("plan_catalog")
      .select("*")
      .eq("code", planCode)
      .eq("active", true)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch tax rules
    const { data: taxRules } = await supabase
      .from("tax_rules")
      .select("*")
      .eq("country_code", countryCode)
      .eq("province_code", provinceCode)
      .eq("is_active", true)
      .order("tax_order");

    const taxes = taxRules || [];

    // 3. Calculate base price
    const basePrice = billingInterval === "year" ? (plan.annual_price || 0) : (plan.monthly_price || 0);
    const equivalentMonthly = billingInterval === "year" ? Math.round(basePrice / 12) : basePrice;

    // 4. Handle coupon discount
    let discountAmount = 0;
    let couponLabel = "";
    let couponValid = false;
    let couponDiscountType = "";
    let couponDiscountValue = 0;
    let couponDurationType = "";
    let couponDurationInMonths: number | null = null;

    if (couponCode) {
      // Validate coupon
      const { data: coupon } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("active", true)
        .is("archived_at", null)
        .single();

      if (coupon) {
        const now = new Date();
        const notExpired = !coupon.ends_at || new Date(coupon.ends_at) > now;
        const started = !coupon.starts_at || new Date(coupon.starts_at) <= now;
        const planEligible = !coupon.eligible_plan_codes?.length || coupon.eligible_plan_codes.includes(planCode);
        const intervalEligible = !coupon.applies_to_billing_intervals?.length || coupon.applies_to_billing_intervals.includes(billingInterval);
        const underLimit = !coupon.usage_limit_total || (coupon.current_redemptions_count || 0) < coupon.usage_limit_total;

        if (notExpired && started && planEligible && intervalEligible && underLimit) {
          couponValid = true;
          couponLabel = coupon.label || coupon.code;
          couponDiscountType = coupon.discount_type;
          couponDiscountValue = coupon.discount_value;
          couponDurationType = coupon.duration_type || "once";
          couponDurationInMonths = coupon.duration_in_months;

          if (coupon.discount_type === "percentage") {
            discountAmount = Math.round(basePrice * coupon.discount_value / 100);
          } else if (coupon.discount_type === "fixed_amount") {
            discountAmount = Math.min(coupon.discount_value, basePrice);
          }
        }
      }
    }

    // 5. Calculate subtotal after discount
    const subtotalAfterDiscount = Math.max(0, basePrice - discountAmount);

    // 6. Calculate taxes on discounted amount
    const taxBreakdown = taxes.map((t: any) => ({
      tax_name: t.tax_name,
      tax_code: t.tax_code,
      tax_rate: Number(t.tax_rate),
      amount: Math.round(subtotalAfterDiscount * Number(t.tax_rate)),
    }));
    const totalTax = taxBreakdown.reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalDueToday = subtotalAfterDiscount + totalTax;

    // 7. Renewal amounts (without coupon if once, with if forever/repeating)
    const renewalBase = (couponValid && couponDurationType === "forever") ? subtotalAfterDiscount : basePrice;
    const renewalTaxBreakdown = taxes.map((t: any) => ({
      tax_name: t.tax_name,
      tax_code: t.tax_code,
      tax_rate: Number(t.tax_rate),
      amount: Math.round(renewalBase * Number(t.tax_rate)),
    }));
    const renewalTotalTax = renewalTaxBreakdown.reduce((sum: number, t: any) => sum + t.amount, 0);
    const renewalTotal = renewalBase + renewalTotalTax;

    // 8. Savings
    const monthlyFull = plan.monthly_price || 0;
    const yearlySavingsPercent = monthlyFull > 0 && billingInterval === "year"
      ? Math.round(((monthlyFull * 12 - basePrice) / (monthlyFull * 12)) * 100)
      : 0;

    // 9. Next renewal date
    const renewalDate = new Date();
    if (billingInterval === "year") {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    const result = {
      plan_code: planCode,
      plan_name: plan.name,
      billing_interval: billingInterval,
      currency: "CAD",
      province_code: provinceCode,
      country_code: countryCode,

      base_price: basePrice,
      equivalent_monthly: equivalentMonthly,
      yearly_savings_percent: yearlySavingsPercent,

      coupon: couponValid ? {
        code: couponCode,
        label: couponLabel,
        discount_type: couponDiscountType,
        discount_value: couponDiscountValue,
        discount_amount: discountAmount,
        duration_type: couponDurationType,
        duration_in_months: couponDurationInMonths,
      } : null,

      subtotal_before_discount: basePrice,
      discount_amount: discountAmount,
      subtotal_after_discount: subtotalAfterDiscount,

      taxes: taxBreakdown,
      total_tax: totalTax,
      total_due_today: totalDueToday,

      renewal: {
        subtotal: renewalBase,
        taxes: renewalTaxBreakdown,
        total_tax: renewalTotalTax,
        total: renewalTotal,
        next_date: renewalDate.toISOString().split("T")[0],
        interval_label: billingInterval === "year" ? "annuel" : "mensuel",
      },

      features: Array.isArray(plan.features_json) ? plan.features_json : [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
