/**
 * generation-consume-credit — Consume one generation credit.
 * Only consumes for combined_visual (peinture + rénovation), NOT diagnostic.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types that consume credits
const BILLABLE_TYPES = ["paint", "renovation", "combined_visual", "peinture"];
// Types excluded from billing
const EXCLUDED_TYPES = ["diagnostic", "problem_diagnosis", "inspection"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "auth_required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const moduleType = (body.module_type || "combined_visual").toLowerCase();

    // Check if this type is excluded from billing
    if (EXCLUDED_TYPES.includes(moduleType)) {
      return new Response(JSON.stringify({
        consumed: false,
        reason: "excluded_type",
        module_type: moduleType,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // First check quota
    let planType = "decouverte";
    const { data: sub } = await supabase
      .from("contractor_subscriptions")
      .select("plan_code, status")
      .eq("status", "active")
      .limit(1);

    if (sub && sub.length > 0) {
      const code = sub[0].plan_code?.toLowerCase() || "";
      if (code.includes("signature")) planType = "signature";
      else if (code.includes("premium") || code.includes("plus") || code.includes("elite")) planType = "plus";
    }

    const { data: quota } = await supabase.rpc("check_generation_quota", {
      _user_id: user.id,
      _plan_type: planType,
      _generation_type: "combined_visual",
    });

    if (quota && !quota.allowed && !quota.is_unlimited) {
      return new Response(JSON.stringify({
        consumed: false,
        reason: "quota_exhausted",
        ...quota,
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consume credit (unlimited plans still track usage for analytics)
    const { data, error } = await supabase.rpc("consume_generation_credit", {
      _user_id: user.id,
      _generation_type: "combined_visual",
    });

    if (error) throw error;

    return new Response(JSON.stringify({
      ...data,
      plan_type: planType,
      module_type: moduleType,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
