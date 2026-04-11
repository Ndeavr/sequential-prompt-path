import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { job_id, job_name, target_category, target_cities, radius_km, languages, keywords } = body;

    let job: any;

    if (job_id) {
      // Resume existing job created by the dashboard
      const { data, error } = await supabase
        .from("prospection_jobs")
        .update({ job_status: "running", started_at: new Date().toISOString() })
        .eq("id", job_id)
        .select()
        .single();
      if (error) throw error;
      job = data;
    } else {
      // Create a new job from scratch
      if (!job_name || !target_category || !target_cities?.length) {
        return new Response(JSON.stringify({ error: "job_name, target_category, target_cities required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("prospection_jobs")
        .insert({
          job_name,
          target_category,
          target_cities_json: target_cities,
          radius_km: radius_km || 25,
          languages_json: languages || ["fr"],
          keywords_json: keywords || [],
          job_status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      job = data;
    }

    const effectiveCategory = job.target_category || target_category;
    const effectiveCities = (job.target_cities_json || target_cities) as string[];
    const effectiveKeywords = (job.keywords_json || keywords || []) as string[];
    const effectiveLangs = (job.languages_json || languages || ["fr"]) as string[];

    // 2. Generate search queries
    const queries: string[] = [];
    const cityList = target_cities as string[];
    const keywordList = (keywords || []) as string[];
    const langList = (languages || ["fr"]) as string[];

    for (const city of effectiveCities) {
      queries.push(`${effectiveCategory} ${city}`);
      queries.push(`entrepreneur ${effectiveCategory} ${city}`);
      
      for (const kw of effectiveKeywords) {
        queries.push(`${kw} ${city}`);
      }

      if (effectiveLangs.includes("en")) {
        queries.push(`${effectiveCategory} contractor ${city}`);
      }

      queries.push(`meilleur ${effectiveCategory} ${city}`);
      queries.push(`${effectiveCategory} résidentiel ${city}`);
    }

    // 3. Insert queries
    const queryInserts = queries.map((q) => ({
      job_id: job.id,
      query_text: q,
      query_type: "google_search",
      source: "google",
    }));

    const { data: insertedQueries, error: qErr } = await supabase
      .from("prospection_queries")
      .insert(queryInserts)
      .select("id, query_text");

    if (qErr) throw qErr;

    // 4. Trigger scraping for each query (fire-and-forget via edge function calls)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Process first 5 queries immediately, queue the rest
    const batch = (insertedQueries || []).slice(0, 5);
    const promises = batch.map((q) =>
      fetch(`${supabaseUrl}/functions/v1/fn-scrape-google-results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ query_id: q.id, query_text: q.query_text, job_id: job.id }),
      }).catch((e) => console.error(`Scrape trigger failed for ${q.id}:`, e))
    );

    // Don't await — fire and forget
    Promise.all(promises);

    return new Response(JSON.stringify({
      success: true,
      job_id: job.id,
      queries_generated: queries.length,
      scraping_started: batch.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fn-start-prospection-job error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
