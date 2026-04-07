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

    const { action, contractorId, signals, overrideScore, overrideReason } = await req.json();

    if (action === "compute") {
      // Compute AIPP score from signals
      const s = signals || {};
      const weights = {
        profile_completeness: 0.15,
        reviews: 0.15,
        brand_presence: 0.10,
        regulatory: 0.15,
        media_quality: 0.10,
        service_precision: 0.10,
        geo_coverage: 0.10,
        recency: 0.15,
      };

      let total = 0;
      for (const [key, weight] of Object.entries(weights)) {
        total += (s[key] ?? 50) * (weight as number);
      }
      const scoreTotal = Math.round(total);

      const { data: existing } = await supabase
        .from("contractor_scores")
        .select("id")
        .eq("contractor_id", contractorId)
        .maybeSingle();

      const scoreRow = {
        contractor_id: contractorId,
        score_total: scoreTotal,
        signal_profile_completeness: s.profile_completeness ?? 50,
        signal_reviews: s.reviews ?? 50,
        signal_brand_presence: s.brand_presence ?? 50,
        signal_regulatory: s.regulatory ?? 50,
        signal_media_quality: s.media_quality ?? 50,
        signal_service_precision: s.service_precision ?? 50,
        signal_geo_coverage: s.geo_coverage ?? 50,
        signal_recency: s.recency ?? 50,
        computed_by: user.id,
      };

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

      await supabase.from("admin_activation_events").insert({
        admin_user_id: user.id,
        contractor_id: contractorId,
        event_type: "score_computed",
        event_payload_json: { score: scoreTotal, signals: s },
      });

      return new Response(JSON.stringify({ score: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "override") {
      const { error } = await supabase
        .from("contractor_scores")
        .update({
          score_total: overrideScore,
          override_reason: overrideReason,
          computed_by: user.id,
        })
        .eq("contractor_id", contractorId);
      if (error) throw error;

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
