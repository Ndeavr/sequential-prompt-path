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

    const body = await req.json();
    const { action, contractorId, signals, overrideScore, overrideReason } = body;

    if (action === "compute") {
      // Compute ranking score from signals
      // Signals map to actual contractor_scores columns
      const s = signals || {};
      const profileCompleteness = s.profile_completeness ?? 50;
      const avgReview = s.avg_review ?? 3.0;
      const responseSpeed = s.response_speed ?? 50;
      const acceptanceRate = s.acceptance_rate ?? 50;
      const closeRate = s.close_rate ?? 50;
      const onTimeRate = s.on_time_rate ?? 50;
      const recommendationRate = s.recommendation_rate ?? 50;

      // Weighted ranking score (0-100)
      const rankingScore = Math.round(
        profileCompleteness * 0.15 +
        (avgReview / 5 * 100) * 0.20 +
        responseSpeed * 0.10 +
        acceptanceRate * 0.10 +
        closeRate * 0.15 +
        onTimeRate * 0.15 +
        recommendationRate * 0.15
      );

      const scoreRow = {
        contractor_id: contractorId,
        profile_completeness_score: profileCompleteness,
        avg_review_score: avgReview,
        response_speed_score: responseSpeed,
        acceptance_rate: acceptanceRate,
        close_rate: closeRate,
        on_time_rate: onTimeRate,
        recommendation_rate: recommendationRate,
        ranking_score: rankingScore,
      };

      const { data: existing } = await supabase
        .from("contractor_scores")
        .select("id")
        .eq("contractor_id", contractorId)
        .maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from("contractor_scores")
          .update(scoreRow)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("contractor_scores")
          .insert(scoreRow)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      // Also update aipp_score on contractor itself
      await supabase
        .from("contractors")
        .update({ aipp_score: rankingScore })
        .eq("id", contractorId);

      await supabase.from("admin_activation_events").insert({
        admin_user_id: user.id,
        contractor_id: contractorId,
        event_type: "score_computed",
        event_payload_json: { ranking_score: rankingScore, signals: s },
      });

      return new Response(JSON.stringify({ score: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "override") {
      const { error } = await supabase
        .from("contractor_scores")
        .update({ ranking_score: overrideScore })
        .eq("contractor_id", contractorId);
      if (error) throw error;

      await supabase
        .from("contractors")
        .update({ aipp_score: overrideScore })
        .eq("id", contractorId);

      await supabase.from("admin_activation_events").insert({
        admin_user_id: user.id,
        contractor_id: contractorId,
        event_type: "score_overridden",
        event_payload_json: { override_score: overrideScore, reason: overrideReason },
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
