import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import { requireAdminCaller } from "../_shared/requireAdminCaller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, ...payload } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (["retry", "stats"].includes(action)) {
      const caller = await requireAdminCaller(req, corsHeaders);
      if (!caller.ok) return caller.response;
      if (action === "retry") return reply({ ok: false, error: "verified_matching_required", matched: 0 }, 409);
    } else {
      const token = req.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
      const { data: auth, error: authError } = await supabase.auth.getUser(token);
      if (authError || !auth?.user) return reply({ ok: false, error: "unauthorized" }, 401);
      if (!["detect", "waitlist-create"].includes(action)) return reply({ ok: false, error: "invalid_action" }, 400);
      if (!/^[0-9a-f-]{36}$/i.test(payload.project_id ?? "") || typeof payload.alex_session_id !== "string" || payload.alex_session_id.length > 120) return reply({ ok: false, error: "confirmed_project_required" }, 400);
      const { data: project, error: projectError } = await supabase.from("projects").select("id,user_id,matching_status,status").eq("id", payload.project_id).eq("user_id", auth.user.id).maybeSingle();
      if (projectError || !project || project.matching_status !== "empty" || ["draft", "cancelled", "completed"].includes(project.status)) return reply({ ok: false, error: "confirmed_no_match_required" }, 403);
      const { data: signal, error: signalError } = await supabase.from("demand_signals").select("id,city,category,metadata,status").eq("project_id", project.id).eq("homeowner_id", auth.user.id).maybeSingle();
      if (signalError || !signal || signal.status !== "waiting" || signal.metadata?.follow_up_consent !== true) return reply({ ok: false, error: "consented_demand_required" }, 409);
      payload.user_id = auth.user.id;
      payload.service = signal.category;
      payload.city = signal.city;
      if (action === "waitlist-create" && (payload.follow_up_consent !== true || !(typeof payload.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) || typeof payload.phone === "string" && /^\+?[0-9 ()-]{10,25}$/.test(payload.phone)))) return reply({ ok: false, error: "consent_contact_required" }, 400);
      const table = action === "detect" ? "alex_no_match_cases" : "alex_waitlist_requests";
      const { data: existing, error: existingError } = await supabase.from(table).select("id").eq("alex_session_id", project.id).eq("service", signal.category).eq("city", signal.city).limit(1).maybeSingle();
      if (existingError) return reply({ ok: false, error: "persistence_unavailable" }, 503);
      if (existing) return reply({ ok: true, [action === "detect" ? "case_id" : "waitlist_id"]: existing.id });
      payload.alex_session_id = project.id;
    }

    // ACTION: detect — log a no-match case
    if (action === "detect") {
      const { alex_session_id, service, city, radius_km, constraints, detected_reason } = payload;
      const { data, error } = await supabase.from("alex_no_match_cases").insert({
        alex_session_id,
        service: service || "unknown",
        city: city || "unknown",
        radius_km: radius_km || 25,
        constraints_json: constraints || {},
        detected_reason: detected_reason || "no_available_contractor",
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, case_id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: waitlist-create — create waitlist request + retry job
    if (action === "waitlist-create") {
      const { user_id, alex_session_id, first_name, phone, email, service, city, radius_km, flexibility_level, urgency_level } = payload;
      const { data: wl, error: wlErr } = await supabase.from("alex_waitlist_requests").insert({
        user_id: user_id || null,
        alex_session_id,
        first_name: first_name || null,
        phone: phone || null,
        email: email || null,
        service,
        city,
        radius_km: radius_km || 25,
        flexibility_level: flexibility_level || "moderate",
        urgency_level: urgency_level || "normal",
        status: "active",
      }).select().single();
      if (wlErr) throw wlErr;

      return new Response(JSON.stringify({ ok: true, waitlist_id: wl.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: stats — admin analytics
    if (action === "stats") {
      const [cases, waitlist, retries] = await Promise.all([
        supabase.from("alex_no_match_cases").select("service, city, detected_reason, created_at"),
        supabase.from("alex_waitlist_requests").select("status, service, city, created_at"),
        supabase.from("alex_match_retry_queue").select("last_attempt_status, retry_count"),
      ]);

      const totalCases = cases.data?.length || 0;
      const activeWaitlist = (waitlist.data || []).filter(w => w.status === "active").length;
      const matchedWaitlist = (waitlist.data || []).filter(w => w.status === "matched").length;
      const avgRetries = retries.data?.length
        ? (retries.data.reduce((s, r) => s + r.retry_count, 0) / retries.data.length).toFixed(1)
        : 0;

      // Top services with no match
      const serviceCounts: Record<string, number> = {};
      (cases.data || []).forEach(c => { serviceCounts[c.service] = (serviceCounts[c.service] || 0) + 1; });
      const topServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

      // Top cities
      const cityCounts: Record<string, number> = {};
      (cases.data || []).forEach(c => { cityCounts[c.city] = (cityCounts[c.city] || 0) + 1; });
      const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

      return new Response(JSON.stringify({
        total_no_match_cases: totalCases,
        active_waitlist: activeWaitlist,
        matched_waitlist: matchedWaitlist,
        conversion_rate: totalCases ? ((matchedWaitlist / totalCases) * 100).toFixed(1) : "0",
        avg_retries: avgRetries,
        top_services: topServices,
        top_cities: topCities,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("alex-no-match-handle persistence failed");
    return new Response(JSON.stringify({ error: "persistence_unavailable" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function reply(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
