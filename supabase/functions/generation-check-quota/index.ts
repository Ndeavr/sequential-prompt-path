/**
 * generation-check-quota — Check if user has remaining generation credits.
 * Returns quota status including remaining count, plan type, and upgrade triggers.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user from auth header
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      // Guest user — decouverte plan
      return new Response(JSON.stringify({
        allowed: false,
        is_unlimited: false,
        used_count: 0,
        max_generations: 3,
        remaining: 0,
        plan_type: "decouverte",
        requires_auth: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const generationType = body.generation_type || "combined_visual";

    // Determine plan type from profile or subscriptions
    let planType = "decouverte";
    
    // Check contractor subscriptions for plan
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

    // Check via DB function
    const { data, error } = await supabase.rpc("check_generation_quota", {
      _user_id: user.id,
      _plan_type: planType,
      _generation_type: generationType,
    });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
