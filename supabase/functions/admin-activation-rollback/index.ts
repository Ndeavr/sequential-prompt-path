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

    const { contractorId, rollbackActions } = await req.json();
    if (!contractorId) throw new Error("contractorId required");

    const actions = rollbackActions || ["readiness", "publication", "subscription", "override"];
    const results: Record<string, boolean> = {};

    if (actions.includes("readiness")) {
      await supabase
        .from("admin_appointment_readiness")
        .update({ ready_status: "not_ready", updated_at: new Date().toISOString() })
        .eq("contractor_id", contractorId);
      await supabase
        .from("contractors")
        .update({ is_accepting_appointments: false })
        .eq("id", contractorId);
      results.readiness = true;
    }

    if (actions.includes("publication")) {
      await supabase
        .from("contractors")
        .update({ is_published: false, is_discoverable: false })
        .eq("id", contractorId);
      results.publication = true;
    }

    if (actions.includes("subscription")) {
      await supabase
        .from("contractor_subscriptions")
        .update({ status: "cancelled" })
        .eq("contractor_id", contractorId)
        .eq("status", "active");
      results.subscription = true;
    }

    if (actions.includes("override")) {
      await supabase
        .from("admin_activation_overrides")
        .update({ is_active: false })
        .eq("contractor_id", contractorId)
        .eq("is_active", true);
      results.override = true;
    }

    await supabase.from("admin_activation_events").insert({
      admin_user_id: user.id,
      contractor_id: contractorId,
      event_type: "rollback_performed",
      event_payload_json: { actions, results },
    });

    return new Response(JSON.stringify({ ok: true, results }), {
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
