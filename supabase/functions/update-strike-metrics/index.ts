import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id required");

    // Aggregate events
    const { data: events } = await supabase
      .from("strike_events")
      .select("type")
      .eq("session_id", session_id);

    const counts = {
      total_emails_sent: 0,
      total_opened: 0,
      total_clicked: 0,
      total_replied: 0,
      total_converted: 0,
    };

    for (const e of events ?? []) {
      if (e.type === "email_sent") counts.total_emails_sent++;
      if (e.type === "opened") counts.total_opened++;
      if (e.type === "clicked") counts.total_clicked++;
      if (e.type === "replied") counts.total_replied++;
      if (e.type === "converted") counts.total_converted++;
    }

    // Update results
    await supabase
      .from("strike_results")
      .update(counts)
      .eq("session_id", session_id);

    // Update session conversions
    await supabase
      .from("strike_sessions")
      .update({ actual_conversions: counts.total_converted })
      .eq("id", session_id);

    // Detect hot leads: targets with opened+clicked events
    const { data: hotEvents } = await supabase
      .from("strike_events")
      .select("contractor_id, type")
      .eq("session_id", session_id)
      .in("type", ["opened", "clicked"]);

    const engagementMap: Record<string, Set<string>> = {};
    for (const e of hotEvents ?? []) {
      if (!e.contractor_id) continue;
      if (!engagementMap[e.contractor_id]) engagementMap[e.contractor_id] = new Set();
      engagementMap[e.contractor_id].add(e.type);
    }

    for (const [cid, types] of Object.entries(engagementMap)) {
      const level = types.has("clicked") ? "hot" : "warm";
      await supabase
        .from("strike_targets")
        .update({ engagement_level: level, status: level === "hot" ? "hot" : "contacted" })
        .eq("session_id", session_id)
        .eq("contractor_id", cid);
    }

    // Auto-adjustment check
    const openRate = counts.total_emails_sent > 0 ? counts.total_opened / counts.total_emails_sent : 0;
    if (counts.total_emails_sent > 10 && openRate < 0.15) {
      await supabase.from("strike_adjustments").insert({
        session_id,
        type: "email_subject",
        previous_value: `open_rate: ${(openRate * 100).toFixed(1)}%`,
        new_value: "Recommandation: changer le sujet email",
        impact_score: 8,
      });
    }

    // Check if session should be critical or success
    const { data: session } = await supabase
      .from("strike_sessions")
      .select("target_conversions, end_time")
      .eq("id", session_id)
      .single();

    if (session) {
      const timeLeft = new Date(session.end_time).getTime() - Date.now();
      const hoursLeft = timeLeft / (1000 * 60 * 60);

      let newStatus: string | null = null;
      if (counts.total_converted >= session.target_conversions) {
        newStatus = "success";
      } else if (hoursLeft < 6 && counts.total_converted === 0) {
        newStatus = "critical";
      }

      if (newStatus) {
        await supabase.from("strike_sessions").update({ status: newStatus }).eq("id", session_id);
      }
    }

    return new Response(JSON.stringify({ counts, open_rate: openRate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
