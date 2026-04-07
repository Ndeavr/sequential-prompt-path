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

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Forbidden: admin only");

    const { action, contractorId, importJobId, sources } = await req.json();

    if (action === "create_job") {
      // Create import job
      const { data: job, error } = await supabase
        .from("admin_company_import_jobs")
        .insert({
          contractor_id: contractorId,
          started_by_admin_id: user.id,
          status: "pending",
          import_mode: "manual",
        })
        .select()
        .single();
      if (error) throw error;

      // Log event
      await supabase.from("admin_activation_events").insert({
        admin_user_id: user.id,
        contractor_id: contractorId,
        event_type: "import_started",
        event_payload_json: { job_id: job.id },
      });

      return new Response(JSON.stringify({ job }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_sources") {
      // Add import sources
      const rows = (sources || []).map((s: any) => ({
        import_job_id: importJobId,
        source_type: s.source_type || "manual",
        source_label: s.source_label || "Manual entry",
        source_url: s.source_url || null,
        source_payload_json: s.payload || {},
        trust_score: s.trust_score ?? 50,
      }));

      const { data, error } = await supabase
        .from("admin_company_import_sources")
        .insert(rows)
        .select();
      if (error) throw error;

      return new Response(JSON.stringify({ sources: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resolve_conflict") {
      const { conflictId, selectedValue } = await req.json();
      const { error } = await supabase
        .from("admin_import_conflicts")
        .update({
          selected_value: selectedValue,
          resolution_status: "resolved",
          resolved_by_admin_id: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", conflictId);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "complete_job") {
      const { error } = await supabase
        .from("admin_company_import_jobs")
        .update({
          status: "merged",
          completed_at: new Date().toISOString(),
        })
        .eq("id", importJobId);
      if (error) throw error;

      await supabase.from("admin_activation_events").insert({
        admin_user_id: user.id,
        contractor_id: contractorId,
        event_type: "import_merged",
        event_payload_json: { job_id: importJobId },
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
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
