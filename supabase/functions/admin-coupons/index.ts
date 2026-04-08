import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // Verify admin
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await serviceClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    // LIST
    if (req.method === "GET" && action === "list") {
      const { data, error } = await serviceClient
        .from("promo_codes")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get redemption counts
      for (const coupon of data || []) {
        const { count } = await serviceClient
          .from("promo_code_redemptions")
          .select("*", { count: "exact", head: true })
          .eq("promo_code_id", coupon.id)
          .in("status", ["consumed", "reserved"]);
        coupon.actual_redemptions = count || 0;
      }

      return json({ coupons: data });
    }

    // STATS
    if (req.method === "GET" && action === "stats") {
      const { data: all } = await serviceClient.from("promo_codes").select("id, active, archived_at, is_founder_offer, is_partner_only, is_internal_only, ends_at");
      const active = (all || []).filter(c => c.active && !c.archived_at);
      const expired = (all || []).filter(c => c.ends_at && new Date(c.ends_at) < new Date());
      const founder = (all || []).filter(c => c.is_founder_offer);
      const { count: totalRedemptions } = await serviceClient
        .from("promo_code_redemptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "consumed");

      return json({
        total: (all || []).length,
        active: active.length,
        expired: expired.length,
        founder: founder.length,
        total_redemptions: totalRedemptions || 0,
      });
    }

    // CREATE
    if (req.method === "POST" && action === "create") {
      const body = await req.json();
      const couponData = {
        code: body.code?.trim().toUpperCase(),
        label: body.label || body.code,
        description: body.description || null,
        description_public: body.description_public || null,
        discount_type: body.discount_type || "percentage",
        discount_value: body.discount_value || 0,
        currency: body.currency || "cad",
        duration_type: body.duration_type || "once",
        duration_in_months: body.duration_in_months || null,
        eligible_plan_codes: body.eligible_plan_codes || [],
        applies_to_billing_intervals: body.applies_to_billing_intervals || [],
        is_internal_only: body.is_internal_only || false,
        is_partner_only: body.is_partner_only || false,
        partner_id: body.partner_id || null,
        is_founder_offer: body.is_founder_offer || false,
        is_stackable: body.is_stackable || false,
        usage_limit_total: body.usage_limit_total || null,
        usage_limit_per_business: body.usage_limit_per_business || null,
        starts_at: body.starts_at || null,
        ends_at: body.ends_at || null,
        active: body.active !== false,
        created_by: user.id,
      };

      // Optionally create in Stripe
      let stripeCouponId: string | null = null;
      let stripePromoCodeId: string | null = null;

      if (body.sync_stripe) {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeKey) {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
          const couponParams: any = {
            duration: couponData.duration_type === "forever" ? "forever" : couponData.duration_type === "repeating" ? "repeating" : "once",
            metadata: { unpro_code: couponData.code },
            name: couponData.label,
          };
          if (couponData.duration_type === "repeating" && couponData.duration_in_months) {
            couponParams.duration_in_months = couponData.duration_in_months;
          }
          if (couponData.discount_type === "percentage") {
            couponParams.percent_off = Math.min(couponData.discount_value, 100);
          } else {
            couponParams.amount_off = Math.round(couponData.discount_value);
            couponParams.currency = couponData.currency;
          }

          const stripeCoupon = await stripe.coupons.create(couponParams);
          stripeCouponId = stripeCoupon.id;

          // Create promotion code
          const promoCode = await stripe.promotionCodes.create({
            coupon: stripeCoupon.id,
            code: couponData.code,
            active: couponData.active,
            ...(couponData.usage_limit_total ? { max_redemptions: couponData.usage_limit_total } : {}),
            ...(couponData.ends_at ? { expires_at: Math.floor(new Date(couponData.ends_at).getTime() / 1000) } : {}),
          });
          stripePromoCodeId = promoCode.id;
        }
      }

      const { data: created, error } = await serviceClient
        .from("promo_codes")
        .insert({
          ...couponData,
          stripe_coupon_id: stripeCouponId,
          stripe_promotion_code_id: stripePromoCodeId,
        })
        .select()
        .single();

      if (error) throw error;
      return json({ coupon: created }, 201);
    }

    // UPDATE
    if (req.method === "PUT" && action === "update") {
      const body = await req.json();
      if (!body.id) return json({ error: "Missing coupon ID" }, 400);

      const updates: any = { updated_at: new Date().toISOString() };
      const allowed = ["label", "description", "description_public", "discount_type", "discount_value",
        "currency", "duration_type", "duration_in_months", "eligible_plan_codes", "applies_to_billing_intervals",
        "is_internal_only", "is_partner_only", "partner_id", "is_founder_offer", "is_stackable",
        "usage_limit_total", "usage_limit_per_business", "starts_at", "ends_at", "active"];
      for (const key of allowed) {
        if (body[key] !== undefined) updates[key] = body[key];
      }

      const { data, error } = await serviceClient
        .from("promo_codes")
        .update(updates)
        .eq("id", body.id)
        .select()
        .single();

      if (error) throw error;
      return json({ coupon: data });
    }

    // ARCHIVE
    if (req.method === "PUT" && action === "archive") {
      const body = await req.json();
      if (!body.id) return json({ error: "Missing coupon ID" }, 400);

      const { data, error } = await serviceClient
        .from("promo_codes")
        .update({ archived_at: new Date().toISOString(), active: false })
        .eq("id", body.id)
        .select()
        .single();

      if (error) throw error;
      return json({ coupon: data });
    }

    // TOGGLE STATUS
    if (req.method === "PUT" && action === "toggle") {
      const body = await req.json();
      if (!body.id) return json({ error: "Missing coupon ID" }, 400);

      const { data: current } = await serviceClient.from("promo_codes").select("active").eq("id", body.id).single();
      const { data, error } = await serviceClient
        .from("promo_codes")
        .update({ active: !current?.active, updated_at: new Date().toISOString() })
        .eq("id", body.id)
        .select()
        .single();

      if (error) throw error;
      return json({ coupon: data });
    }

    // ANALYTICS
    if (req.method === "GET" && action === "analytics") {
      const couponId = url.searchParams.get("coupon_id");
      let query = serviceClient
        .from("promo_code_redemptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (couponId) query = query.eq("promo_code_id", couponId);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return json({ redemptions: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("admin-coupons error:", err);
    return json({ error: err.message || "Server error" }, 500);
  }
});
