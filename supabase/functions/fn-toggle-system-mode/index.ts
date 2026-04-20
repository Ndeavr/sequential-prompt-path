import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("fn-toggle-system-mode missing env", {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
        hasAnonKey: !!anonKey,
      });
      return json({ success: false, error: "server_configuration_error" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "missing_auth" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return json({ success: false, error: "unauthorized" });
    }

    const { data: roleCheck, error: roleError } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (roleError) throw roleError;
    if (!roleCheck) {
      return json({ success: false, error: "forbidden_admin_only" });
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
        return json({
          success: false,
          error: "preflight_failed",
          reason: "domain_health_critical",
          message: "Domain reputation is critical. Resolve before going LIVE.",
        });
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

    return json({ success: true, state: updated });
  } catch (e) {
    console.error("fn-toggle-system-mode unhandled", e);
    return json({ success: false, error: String(e?.message || e) });
  }
});
