import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { code, planCode, billingInterval, userId, contractorId } = await req.json();

    if (!code || !planCode) {
      return new Response(JSON.stringify({
        valid: false, reason: "missing_fields", message: "Code et plan requis",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Fetch coupon
    const { data: coupon, error: couponErr } = await serviceClient
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (couponErr || !coupon) {
      return json({ valid: false, reason: "not_found", message: "Ce code n'est pas valide" });
    }

    // Check active
    if (!coupon.active) {
      return json({ valid: false, reason: "inactive", message: "Ce code n'est plus actif" });
    }

    // Check archived
    if (coupon.archived_at) {
      return json({ valid: false, reason: "archived", message: "Ce code a été archivé" });
    }

    // Check dates
    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return json({ valid: false, reason: "not_started", message: "Ce code n'est pas encore actif" });
    }
    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
      return json({ valid: false, reason: "expired", message: "Ce code a expiré" });
    }

    // Check internal only
    if (coupon.is_internal_only) {
      return json({ valid: false, reason: "internal_only", message: "Ce code est réservé à un usage interne" });
    }

    // Check plan eligibility
    if (coupon.eligible_plan_codes && coupon.eligible_plan_codes.length > 0 && !coupon.eligible_plan_codes.includes(planCode)) {
      return json({ valid: false, reason: "plan_mismatch", message: "Ce code ne s'applique pas à ce plan" });
    }

    // Check billing interval eligibility
    if (coupon.applies_to_billing_intervals && coupon.applies_to_billing_intervals.length > 0 && !coupon.applies_to_billing_intervals.includes(billingInterval)) {
      return json({ valid: false, reason: "interval_mismatch", message: `Ce code s'applique uniquement au paiement ${billingInterval === 'year' ? 'annuel' : 'mensuel'}` });
    }

    // Check global usage limit
    if (coupon.usage_limit_total && coupon.current_redemptions_count >= coupon.usage_limit_total) {
      return json({ valid: false, reason: "max_total_reached", message: "Ce code n'est plus disponible" });
    }

    // Check per-user usage limit
    if (userId && coupon.usage_limit_per_business) {
      const { count } = await serviceClient
        .from("promo_code_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("promo_code_id", coupon.id)
        .or(`user_id.eq.${userId}${contractorId ? `,contractor_id.eq.${contractorId}` : ""}`)
        .in("status", ["reserved", "consumed"]);

      if ((count ?? 0) >= coupon.usage_limit_per_business) {
        return json({ valid: false, reason: "max_per_user_reached", message: "Vous avez déjà utilisé ce code" });
      }
    }

    // Calculate discount preview
    const discountInfo = {
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      duration_type: coupon.duration_type || "once",
      duration_in_months: coupon.duration_in_months,
      currency: coupon.currency || "cad",
      is_founder_offer: coupon.is_founder_offer || false,
      label: coupon.label || coupon.description_public || null,
    };

    return json({
      valid: true,
      coupon_id: coupon.id,
      code: normalizedCode,
      ...discountInfo,
      message: coupon.label || "Code appliqué avec succès",
    });
  } catch (err: any) {
    console.error("validate-coupon-code error:", err);
    return new Response(JSON.stringify({ valid: false, reason: "server_error", message: "Erreur serveur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
