import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();

    // Google click tracking
    if (body.action === "google_click" && body.review_id) {
      await supabase
        .from("reviews_v2")
        .update({
          google_publish_status: "clicked",
          google_click_at: new Date().toISOString(),
        })
        .eq("id", body.review_id);
      // Bubble up to request
      const { data: rev } = await supabase
        .from("reviews_v2")
        .select("request_id")
        .eq("id", body.review_id)
        .maybeSingle();
      if (rev?.request_id) {
        await supabase
          .from("review_requests")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", rev.request_id);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, rating, standout_tags, raw_text, ai_generated_text, approved_text, project_type } = body;
    if (!token || !rating || !approved_text) throw new Error("token, rating, approved_text required");

    const { data: request, error: reqErr } = await supabase
      .from("review_requests")
      .select("id, contractor_id, homeowner_name, city, project_type")
      .eq("token", token)
      .maybeSingle();

    if (reqErr) throw reqErr;
    if (!request) throw new Error("invalid token");

    // Build structured_scores from tags (1.0 per selected tag, else 0.7 default when high rating)
    const structured: Record<string, number> = {};
    const allTags = ["communication", "professionalism", "cleanliness", "education", "quality", "respect", "value", "problem_solved"];
    allTags.forEach((t) => {
      structured[t] = (standout_tags ?? []).includes(t) ? 1.0 : rating >= 4 ? 0.6 : 0.3;
    });

    const { data: review, error: revErr } = await supabase
      .from("reviews_v2")
      .insert({
        request_id: request.id,
        contractor_id: request.contractor_id,
        rating,
        structured_scores: structured,
        standout_tags: standout_tags ?? [],
        raw_text: raw_text ?? null,
        ai_generated_text: ai_generated_text ?? null,
        approved_text,
        project_type: project_type ?? request.project_type ?? null,
        city: request.city,
        homeowner_name: request.homeowner_name,
        google_publish_status: "not_started",
        is_verified: true,
      })
      .select()
      .single();

    if (revErr) throw revErr;

    // Update request
    await supabase
      .from("review_requests")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", request.id);

    // Recompute reputation aggregates (async, best-effort)
    (async () => {
      const { data: allRevs } = await supabase
        .from("reviews_v2")
        .select("rating, structured_scores")
        .eq("contractor_id", request.contractor_id);

      if (!allRevs || allRevs.length === 0) return;
      const n = allRevs.length;
      const agg: Record<string, number> = {};
      allTags.forEach((t) => (agg[t] = 0));
      allRevs.forEach((r) => {
        const s = (r.structured_scores ?? {}) as Record<string, number>;
        allTags.forEach((t) => (agg[t] += (s[t] ?? 0)));
      });
      allTags.forEach((t) => (agg[t] = Math.round((agg[t] / n) * 100) / 100));
      const top = allTags.map((t) => ({ t, v: agg[t] })).sort((a, b) => b.v - a.v).slice(0, 3).map((x) => x.t);
      const aiVis = Math.round(Math.min(100, n * 8 + agg.quality * 20 + agg.communication * 15));

      await supabase.from("review_reputation_scores").upsert({
        contractor_id: request.contractor_id,
        communication: agg.communication,
        professionalism: agg.professionalism,
        cleanliness: agg.cleanliness,
        trust: agg.professionalism,
        quality: agg.quality,
        education: agg.education,
        value: agg.value,
        problem_solved: agg.problem_solved,
        sample_size: n,
        top_dimensions: top,
        ai_visibility_score: aiVis,
        updated_at: new Date().toISOString(),
      });
    })().catch((e) => console.error("reputation recompute", e));

    return new Response(JSON.stringify({ review_id: review.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("review-submit", e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
