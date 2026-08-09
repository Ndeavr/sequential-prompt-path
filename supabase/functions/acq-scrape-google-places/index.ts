/**
 * acq-scrape-google-places
 *
 * Scrape Google Places (New API) pour un métier × ville.
 * Accès provider via `_shared/placesGateway.ts` (cache → dedupe → circuit breaker).
 * Utilise dedupeEngine pour scorer chaque candidat (HIGH/MEDIUM/LOW/NONE)
 * et choisir entre INSERT, ENRICH_EXISTING ou flag possible_duplicate.
 *
 * Body: { trade, city, limit?, dry_run?, force_refresh?, caller? }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  classifyDuplicate,
  buildEnrichmentPatch,
  normalizeDomain,
} from "../_shared/dedupeEngine.ts";
import { captureScrapeEvidenceForProfile } from "../_shared/caslEvidence.ts";
import { searchPlacesResilient, type PlaceResult } from "../_shared/placesGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};




function extractCity(p: PlaceResult, fallback: string): string {
  const comp = p.addressComponents?.find((c) => c.types.includes("locality"));
  return comp?.longText ?? fallback;
}
function extractPostal(p: PlaceResult): string | null {
  const comp = p.addressComponents?.find((c) => c.types.includes("postal_code"));
  return comp?.longText ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const trade = String(body.trade ?? "").trim();
    const city = String(body.city ?? "").trim();
    const limit = Math.min(Number(body.limit ?? 20), 60);
    const dryRun = Boolean(body.dry_run ?? false);
    const forceRefresh = Boolean(body.force_refresh ?? false);
    const caller = String(body.caller ?? "acq-scrape-google-places");

    if (!trade || !city) {
      return new Response(JSON.stringify({ error: "trade and city required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Canonical resilient access layer: cache → dedupe → circuit breaker → API.
    const search = await searchPlacesResilient(supabase, { trade, city, limit, caller, forceRefresh });

    if (!search.ok) {
      // Non-fatal for the pipeline: discovery is paused, recruitment continues
      // on existing inventory. 200-with-blocked keeps orchestrators alive.
      return new Response(
        JSON.stringify({
          ok: false,
          blocked: true,
          discovery_paused: true,
          error: "google_places_unavailable",
          error_code: search.error_code,
          retry_after: search.retry_after,
          remediation: search.remediation,
          detail: search.detail,
          found: 0,
          inserted: 0,
          touched_ids: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const candidates = search.places.slice(0, limit);
    const sourceMeta = {
      source: search.source,
      cache_hit: search.cache_hit,
      stale: search.stale,
      external_calls: search.external_calls,
      calls_avoided: search.calls_avoided,
    };

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          found: candidates.length,
          discovery: sourceMeta,
          sample: candidates.slice(0, 5).map((p) => ({
            name: p.displayName?.text, address: p.formattedAddress,
            phone: p.nationalPhoneNumber, website: p.websiteUri,
            rating: p.rating, reviews: p.userRatingCount,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const counters = {
      inserted: 0,
      enriched_existing: 0,
      possible_duplicate: 0,
      skipped_duplicate: 0,
      failed_extraction: 0,
    };
    const touchedIds: string[] = [];

    for (const p of candidates) {
      const placeId = p.id;
      const name = p.displayName?.text;
      if (!placeId || !name) {
        counters.failed_extraction++;
        continue;
      }

      const fresh = {
        source_name: "google_places",
        source: "google_places",
        source_record_id: placeId,
        google_place_id: placeId,
        discovery_method: "google_places_search",
        business_name: name,
        trade,
        category_slug: trade.toLowerCase().replace(/\s+/g, "-"),
        city: extractCity(p, city),
        province: "QC",
        postal_code: extractPostal(p),
        phone: p.nationalPhoneNumber ?? null,
        website_url: p.websiteUri ?? null,
        normalized_domain: normalizeDomain(p.websiteUri),
        google_business_url: p.googleMapsUri ?? null,
        address: p.formattedAddress ?? null,
        review_count: p.userRatingCount ?? 0,
        review_rating: p.rating ?? null,
        raw_data: { google_place: p },
      };

      const match = await classifyDuplicate(
        {
          business_name: fresh.business_name,
          google_place_id: fresh.google_place_id,
          website_url: fresh.website_url,
          normalized_domain: fresh.normalized_domain,
          phone: fresh.phone,
          city: fresh.city,
          address: fresh.address,
        },
        supabase,
      );

      if (match.band === "HIGH" && match.matchedId) {
        // Fetch existing → non-destructive merge
        const { data: existing } = await supabase
          .from("contractor_prospects")
          .select("*")
          .eq("id", match.matchedId)
          .single();

        const patch = buildEnrichmentPatch(existing ?? {}, fresh);
        const hasChanges = Object.keys(patch).length > 0;

        const updates: Record<string, any> = {
          ...patch,
          last_enriched_at: new Date().toISOString(),
          enrichment_count: (existing?.enrichment_count ?? 0) + 1,
          dedupe_confidence: match.confidence,
          dedupe_signals: match.signals,
          ingestion_status: hasChanges ? "enriched_existing" : "skipped_duplicate",
        };

        const { error: upErr } = await supabase
          .from("contractor_prospects")
          .update(updates)
          .eq("id", match.matchedId);

        if (upErr) {
          console.error("enrich update failed", upErr.message);
          counters.failed_extraction++;
        } else {
          touchedIds.push(match.matchedId);
          if (hasChanges) counters.enriched_existing++;
          else counters.skipped_duplicate++;

          // Refresh CASL provenance on the existing prospect too.
          try {
            await captureScrapeEvidenceForProfile(supabase, {
              contractor_prospect_id: match.matchedId,
              phone: fresh.phone ?? null,
              email: null,
              source_url: fresh.google_business_url ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`,
              source_type: "google_business_profile",
              source_publisher: "Google Places",
              business_relevance_explanation: `Publicly listed business in category "${trade}" in ${fresh.city}, QC.`,
              page_content_for_hash: JSON.stringify(p),
              capture_agent: "acq-scrape-google-places",
            });
          } catch (e) {
            console.warn("[casl] refresh capture failed", (e as Error).message);
          }
        }
        continue;
      }

      // MEDIUM → insert flagged + push review
      // LOW / NONE → straight insert
      const ingestion_status = match.band === "MEDIUM" ? "possible_duplicate" : "inserted";
      const insertRow = {
        ...fresh,
        enrichment_status: "pending",
        dedupe_confidence: match.confidence > 0 ? match.confidence : null,
        dedupe_matched_id: match.matchedId,
        dedupe_signals: match.signals,
        ingestion_status,
        needs_review: match.band === "MEDIUM",
      };

      const { data: ins, error: insErr } = await supabase
        .from("contractor_prospects")
        .insert(insertRow)
        .select("id")
        .single();

      if (insErr || !ins) {
        console.error("insert failed", insErr?.message, name);
        counters.failed_extraction++;
        continue;
      }

      touchedIds.push(ins.id);

      // CASL evidence — Google Business Profile is a publicly conspicuous source.
      // Persist provenance for every phone / email observed on this profile.
      try {
        await captureScrapeEvidenceForProfile(supabase, {
          contractor_prospect_id: ins.id,
          phone: fresh.phone ?? null,
          email: null,
          source_url: fresh.google_business_url ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          source_type: "google_business_profile",
          source_publisher: "Google Places",
          business_relevance_explanation: `Publicly listed business in category "${trade}" in ${fresh.city}, QC. UNPRO offer targets contractors in this trade.`,
          page_content_for_hash: JSON.stringify(p),
          capture_agent: "acq-scrape-google-places",
        });
      } catch (e) {
        console.warn("[casl] capture failed", (e as Error).message);
      }

      if (match.band === "MEDIUM") {
        counters.possible_duplicate++;
        await supabase.from("prospect_dedupe_reviews").insert({
          candidate_prospect_id: ins.id,
          existing_prospect_id: match.matchedId,
          confidence: match.confidence,
          signals: match.signals,
          new_payload: fresh,
          status: "pending",
        });
      } else {
        counters.inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        trade,
        city,
        found: candidates.length,
        discovery: sourceMeta,
        ...counters,
        touched_ids: touchedIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
