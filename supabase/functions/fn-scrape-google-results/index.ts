import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { query_id, query_text, job_id } = await req.json();
    if (!query_id || !query_text) {
      return new Response(JSON.stringify({ error: "query_id, query_text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Scraping: "${query_text}"`);

    // Use Firecrawl search
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query_text,
        limit: 10,
        lang: "fr",
        country: "CA",
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchResp.json();

    if (!searchResp.ok) {
      console.error("Firecrawl search error:", searchData);
      throw new Error(`Firecrawl search failed [${searchResp.status}]`);
    }

    // Get the Google source
    const { data: googleSource } = await supabase
      .from("prospection_sources")
      .select("id")
      .eq("source_name", "Google Search")
      .single();

    // Store raw results
    const results = searchData.data || [];
    const rawInserts = results.map((r: any) => ({
      query_id,
      source_id: googleSource?.id || null,
      raw_payload_json: {
        url: r.url,
        title: r.title,
        description: r.description,
        markdown: r.markdown?.substring(0, 5000), // Truncate to save space
      },
      extracted_flag: false,
    }));

    if (rawInserts.length > 0) {
      const { error: insertErr } = await supabase
        .from("prospection_results_raw")
        .insert(rawInserts);
      if (insertErr) console.error("Insert raw results error:", insertErr);
    }

    // Update query with results count
    await supabase
      .from("prospection_queries")
      .update({ results_count: results.length, executed_at: new Date().toISOString() })
      .eq("id", query_id);

    // Trigger extraction for each result
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    for (const result of results) {
      fetch(`${supabaseUrl}/functions/v1/fn-extract-business-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          url: result.url,
          title: result.title,
          markdown: result.markdown?.substring(0, 3000),
          job_id,
          query_id,
        }),
      }).catch((e) => console.error("Extract trigger failed:", e));
    }

    return new Response(JSON.stringify({
      success: true,
      results_found: results.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fn-scrape-google-results error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
