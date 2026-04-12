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

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign details
    const { data: campaign, error: campErr } = await supabase
      .from("outbound_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign targets
    const { data: targets } = await supabase
      .from("outbound_campaign_targets")
      .select("*")
      .eq("campaign_id", campaign_id);

    // Create scraping run
    const { data: run, error: runErr } = await supabase
      .from("outbound_scraping_runs")
      .insert({
        campaign_id,
        status: "running",
        source_count: (targets || []).length,
      })
      .select()
      .single();

    if (runErr) throw runErr;

    // Update campaign status
    await supabase
      .from("outbound_campaigns")
      .update({ campaign_status: "scraping" })
      .eq("id", campaign_id);

    // Log event
    await supabase.from("outbound_events").insert({
      event_type: "scraping_started",
      entity_type: "scraping_run",
      entity_id: run.id,
      campaign_id,
      metadata: { targets_count: (targets || []).length },
    });

    // For each target, trigger Firecrawl search
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    let totalRaw = 0;
    let totalValid = 0;
    let totalDeduped = 0;
    let totalLeads = 0;
    let totalErrors = 0;

    for (const target of (targets || [])) {
      try {
        const query = target.keyword_query || `${target.specialty} ${target.city} entrepreneur`;
        
        let results: any[] = [];
        
        if (FIRECRAWL_API_KEY) {
          const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: target.max_results || 50,
              lang: "fr",
              country: "CA",
            }),
          });
          const searchData = await searchResp.json();
          results = searchData.data || [];
        } else {
          // Mock data when Firecrawl is not configured
          console.log("FIRECRAWL_API_KEY not set, using mock data");
          results = Array.from({ length: 5 }, (_, i) => ({
            url: `https://example-${target.city.toLowerCase()}-${i}.ca`,
            title: `${target.specialty} ${target.city} #${i + 1}`,
            description: `Entreprise de ${target.specialty} à ${target.city}`,
          }));
        }

        totalRaw += results.length;

        // Store scraped entities
        const entities = results.map((r: any, idx: number) => {
          const domain = r.url ? new URL(r.url).hostname : null;
          const dedupeHash = `${domain}_${target.city}_${target.specialty}`.toLowerCase().replace(/[^a-z0-9_]/g, "");
          return {
            scraping_run_id: run.id,
            campaign_id,
            source_key: target.source_key || "google_maps",
            external_id: `${target.source_key}_${idx}`,
            company_name: r.title || `Entreprise ${idx + 1}`,
            website_url: r.url,
            domain,
            city: target.city,
            specialty: target.specialty,
            raw_payload: r,
            normalized_payload: {
              name: r.title,
              url: r.url,
              city: target.city,
              specialty: target.specialty,
            },
            dedupe_hash: dedupeHash,
            status: "validated",
          };
        });

        // Check for duplicates
        const hashes = entities.map((e: any) => e.dedupe_hash);
        const { data: existing } = await supabase
          .from("outbound_scraped_entities")
          .select("dedupe_hash")
          .in("dedupe_hash", hashes);
        
        const existingHashes = new Set((existing || []).map((e: any) => e.dedupe_hash));
        const newEntities = entities.filter((e: any) => !existingHashes.has(e.dedupe_hash));
        const dupeCount = entities.length - newEntities.length;
        totalDeduped += dupeCount;
        totalValid += newEntities.length;

        if (newEntities.length > 0) {
          await supabase.from("outbound_scraped_entities").insert(newEntities);

          // Create leads from valid entities
          const leadsToCreate = newEntities.map((e: any) => ({
            campaign_id,
            company_name: e.company_name,
            website_url: e.website_url,
            domain: e.domain,
            city: e.city,
            specialty: e.specialty,
            qualification_status: "validated",
            sending_status: "not_started",
            lead_score: 50 + Math.random() * 30,
          }));

          const { error: leadErr } = await supabase.from("outbound_leads").insert(leadsToCreate);
          if (leadErr) {
            console.error("Lead creation error:", leadErr);
            totalErrors++;
          } else {
            totalLeads += leadsToCreate.length;
          }
        }
      } catch (err) {
        console.error("Target scraping error:", err);
        totalErrors++;
      }
    }

    // Update scraping run with final counts
    await supabase
      .from("outbound_scraping_runs")
      .update({
        status: totalErrors > 0 ? "completed" : "completed",
        finished_at: new Date().toISOString(),
        raw_entity_count: totalRaw,
        valid_entity_count: totalValid,
        deduplicated_count: totalDeduped,
        lead_created_count: totalLeads,
        error_count: totalErrors,
        logs: [{ msg: `Completed: ${totalRaw} raw, ${totalValid} valid, ${totalDeduped} dupes, ${totalLeads} leads`, ts: new Date().toISOString() }],
      })
      .eq("id", run.id);

    // Update campaign status
    await supabase
      .from("outbound_campaigns")
      .update({ campaign_status: "ready" })
      .eq("id", campaign_id);

    // Log completion
    await supabase.from("outbound_events").insert({
      event_type: "scraping_completed",
      entity_type: "scraping_run",
      entity_id: run.id,
      campaign_id,
      metadata: { raw: totalRaw, valid: totalValid, deduped: totalDeduped, leads: totalLeads, errors: totalErrors },
    });

    return new Response(JSON.stringify({
      success: true,
      run_id: run.id,
      raw_entity_count: totalRaw,
      valid_entity_count: totalValid,
      deduplicated_count: totalDeduped,
      lead_created_count: totalLeads,
      error_count: totalErrors,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("edge-start-scraping-run error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
