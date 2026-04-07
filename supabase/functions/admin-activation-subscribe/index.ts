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
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Forbidden: admin only");

    const { contractorId, planId, bypassPayment, bypassReason, bypassDurationDays } = await req.json();

    if (!contractorId || !planId) {
      return new Response(JSON.stringify({ error: "contractorId and planId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get plan details
    const { data: plan, error: planErr } = await supabase
      .from("plan_catalog")
      .select("*")
      .eq("id", planId)
      .single();
    if (planErr || !plan) throw new Error("Plan not found");

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Create subscription in contractor_subscriptions
    const { data: sub, error: subErr } = await supabase
      .from("contractor_subscriptions")
      .insert({
        contractor_id: contractorId,
        plan_id: plan.id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        activation_source: "admin_activation",
      })
      .select()
      .single();
    if (subErr) throw subErr;

    // If bypass payment, create activation override
    if (bypassPayment) {
      const endsAt = bypassDurationDays
        ? new Date(now.getTime() + bypassDurationDays * 86400000).toISOString()
        : null;

      await supabase.from("admin_activation_overrides").insert({
        contractor_id: contractorId,
        subscription_id: sub.id,
        override_type: "full_discount",
        override_value: 100,
        reason: bypassReason || "Admin activation — 100% discount",
        starts_at: now.toISOString(),
        ends_at: endsAt,
        created_by_admin_id: user.id,
        is_active: true,
      });

      await supabase.from("admin_activation_events").insert({
        admin_user_id: user.id,
        contractor_id: contractorId,
        event_type: "payment_bypassed",
        event_payload_json: {
          subscription_id: sub.id,
          plan_code: plan.code,
          discount: 100,
          reason: bypassReason,
        },
      });
    }

    await supabase.from("admin_activation_events").insert({
      admin_user_id: user.id,
      contractor_id: contractorId,
      event_type: "plan_assigned",
      event_payload_json: {
        subscription_id: sub.id,
        plan_code: plan.code,
        bypass: bypassPayment || false,
      },
    });

    return new Response(JSON.stringify({ subscription: sub }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes("Unauthorized") ? 401 : msg.includes("Forbidden") ? 403 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
