import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, ...payload } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

      // Create initial retry job
      await supabase.from("alex_match_retry_queue").insert({
        waitlist_request_id: wl.id,
        next_retry_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        retry_count: 0,
        last_attempt_status: "pending",
      });

      return new Response(JSON.stringify({ ok: true, waitlist_id: wl.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: retry — attempt to find a match for pending waitlist items
    if (action === "retry") {
      const { data: pending } = await supabase.from("alex_match_retry_queue")
        .select("*, alex_waitlist_requests(*)")
        .lte("next_retry_at", new Date().toISOString())
        .neq("last_attempt_status", "match_found")
        .limit(20);

      let matched = 0;
      for (const item of pending || []) {
        const wl = item.alex_waitlist_requests;
        if (!wl || wl.status !== "active") continue;

        // Try to find contractor
        const { data: contractors } = await supabase.from("contractors")
          .select("id, business_name, specialty, city, aipp_score")
          .eq("status", "active")
          .order("aipp_score", { ascending: false })
          .limit(3);

        const found = (contractors || []).length > 0;
        const nextRetry = new Date(Date.now() + (found ? 0 : 60 * 60 * 1000));

        await supabase.from("alex_match_retry_queue").update({
          retry_count: item.retry_count + 1,
          last_attempt_status: found ? "match_found" : "no_match",
          next_retry_at: nextRetry.toISOString(),
        }).eq("id", item.id);

        if (found && contractors) {
          matched++;
          await supabase.from("alex_waitlist_requests").update({ status: "matched" }).eq("id", wl.id);
          await supabase.from("alex_match_notifications").insert({
            waitlist_request_id: wl.id,
            contractor_id: contractors[0].id,
            notification_status: "pending",
          });
        }
      }

      return new Response(JSON.stringify({ ok: true, processed: (pending || []).length, matched }), {
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
    console.error("alex-no-match-handle error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
