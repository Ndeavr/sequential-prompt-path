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

    const { action, contractorId, checklistItems, forceReady, forceReason } = await req.json();

    if (action === "publish_profile") {
      // Set contractor as published
      const { error } = await supabase
        .from("contractors")
        .update({
          is_published: true,
          is_discoverable: true,
          published_at: new Date().toISOString(),
        })
        .eq("id", contractorId);
      if (error) throw error;

      await supabase.from("admin_activation_events").insert({
        admin_user_id: user.id,
        contractor_id: contractorId,
        event_type: "profile_published",
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_readiness") {
      // Compute checklist score
      const { data: contractor } = await supabase
        .from("contractors")
        .select("id, business_name, user_id, is_published")
        .eq("id", contractorId)
        .single();

      const { data: services } = await supabase
        .from("contractor_services")
        .select("id")
        .eq("contractor_id", contractorId)
        .limit(1);

      const { data: areas } = await supabase
        .from("contractor_service_areas")
        .select("id")
        .eq("contractor_id", contractorId)
        .limit(1);

      const { data: score } = await supabase
        .from("contractor_scores")
        .select("id")
        .eq("contractor_id", contractorId)
        .maybeSingle();

      const { data: sub } = await supabase
        .from("contractor_subscriptions")
        .select("id")
        .eq("contractor_id", contractorId)
        .eq("status", "active")
        .maybeSingle();

      const { data: override } = await supabase
        .from("admin_activation_overrides")
        .select("id")
        .eq("contractor_id", contractorId)
        .eq("is_active", true)
        .maybeSingle();

      const { data: media } = await supabase
        .from("contractor_media")
        .select("id")
        .eq("contractor_id", contractorId)
        .limit(1);

      const checks = {
        has_core_identity: !!contractor?.business_name,
        has_linked_account: !!contractor?.user_id,
        has_services: (services?.length ?? 0) > 0,
        has_service_areas: (areas?.length ?? 0) > 0,
        has_score: !!score,
        has_active_plan: !!sub,
        has_activation_override_or_payment: !!(sub || override),
        has_public_profile: !!contractor?.is_published,
        has_media_minimum: (media?.length ?? 0) > 0,
      };

      const totalChecks = Object.keys(checks).length;
      const passedChecks = Object.values(checks).filter(Boolean).length;
      const checklistScore = Math.round((passedChecks / totalChecks) * 100);

      let readyStatus = "not_ready";
      if (checklistScore === 100) readyStatus = "ready";
      else if (checklistScore >= 70) readyStatus = "partially_ready";
      if (forceReady) readyStatus = "forced_ready";

      // Upsert readiness
      const { data: existing } = await supabase
        .from("admin_appointment_readiness")
        .select("id")
        .eq("contractor_id", contractorId)
        .maybeSingle();

      const readinessRow = {
        contractor_id: contractorId,
        checklist_score: checklistScore,
        ready_status: readyStatus,
        forced_by_admin_id: forceReady ? user.id : null,
        forced_reason: forceReady ? (forceReason || null) : null,
        ...checks,
      };

      if (existing) {
        await supabase
          .from("admin_appointment_readiness")
          .update({ ...readinessRow, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("admin_appointment_readiness")
          .insert(readinessRow);
      }

      // If ready, enable appointments on contractor
      if (readyStatus === "ready" || readyStatus === "forced_ready") {
        await supabase
          .from("contractors")
          .update({ is_accepting_appointments: true })
          .eq("id", contractorId);
      }

      await supabase.from("admin_activation_events").insert({
        admin_user_id: user.id,
        contractor_id: contractorId,
        event_type: "readiness_set",
        event_payload_json: { readyStatus, checklistScore, checks, forced: forceReady || false },
      });

      return new Response(JSON.stringify({ readyStatus, checklistScore, checks }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_checklist") {
      // Save individual checklist items
      for (const item of (checklistItems || [])) {
        const { data: existing } = await supabase
          .from("admin_activation_checklists")
          .select("id")
          .eq("contractor_id", contractorId)
          .eq("item_code", item.code)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("admin_activation_checklists")
            .update({
              item_status: item.status,
              resolved_at: item.status === "done" ? new Date().toISOString() : null,
              resolved_by_admin_id: item.status === "done" ? user.id : null,
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("admin_activation_checklists")
            .insert({
              contractor_id: contractorId,
              item_code: item.code,
              item_label: item.label,
              item_status: item.status || "pending",
              is_blocking: item.is_blocking ?? true,
            });
        }
      }

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
