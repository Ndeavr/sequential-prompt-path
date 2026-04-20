import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleCheck } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "forbidden_admin_only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetMode = body.mode === "live" ? "live" : "test";
    const notes = body.notes || null;

    // Pre-flight checks for going LIVE
    if (targetMode === "live") {
      const { data: domainHealth } = await supabase
        .from("email_domain_health")
        .select("status, reputation_score")
        .eq("domain", "mail.unpro.ca")
        .maybeSingle();

      if (domainHealth?.status === "critical") {
        return new Response(JSON.stringify({
          error: "preflight_failed",
          reason: "domain_health_critical",
          message: "Domain reputation is critical. Resolve before going LIVE.",
        }), { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("system_environment_state")
      .update({
        mode: targetMode,
        activated_at: targetMode === "live" ? new Date().toISOString() : null,
        activated_by: user.id,
        notes,
      })
      .eq("singleton", true)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, state: updated }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
