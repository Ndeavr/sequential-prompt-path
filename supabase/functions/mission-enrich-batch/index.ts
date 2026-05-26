// mission-enrich-batch
// Pulls leads for a mission and runs Firecrawl-based enrichment on their website,
// extracting trust signals, weaknesses, AI visibility gaps. Writes to outbound_lead_enrichment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/mission-cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

async function firecrawlScrape(url: string) {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url, formats: ["markdown", "links"], onlyMainContent: true, waitFor: 1500,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function extractWeaknesses(md: string, links: string[]) {
  const lower = (md || "").toLowerCase();
  const weaknesses: string[] = [];
  if (!/(soumission|estimation|prix|estimé)/.test(lower)) weaknesses.push("no_instant_estimate");
  if (!/(avant.{0,5}apr[eè]s|before.{0,5}after|réalisations)/.test(lower)) weaknesses.push("no_before_after");
  if (!/(certifi|rbq|garantie|assur)/.test(lower)) weaknesses.push("weak_trust_signals");
  if (!/(rendez-vous|rdv|réserver|contact)/i.test(lower)) weaknesses.push("weak_cta");
  if (!/<script[^>]+ld\+json/i.test(md || "") && !/schema\.org/i.test(md || "")) weaknesses.push("no_structured_schema");
  if (!/(itm[s]?:[\s\S]*?Service|offerCatalog)/i.test(md || "")) weaknesses.push("no_service_catalog");
  if (!links?.some((l) => /google\.com\/maps/.test(l))) weaknesses.push("no_google_business_link");
  if ((md || "").length < 600) weaknesses.push("thin_content");
  return weaknesses;
}

function extractTrustSignals(md: string) {
  const lower = (md || "").toLowerCase();
  const signals: string[] = [];
  if (/rbq.{0,20}\d{4}/.test(lower)) signals.push("rbq_displayed");
  if (/garantie/.test(lower)) signals.push("warranty_mentioned");
  if (/(\d+\s*(ans?|years?)\s*d'?expérience)/.test(lower)) signals.push("experience_stated");
  if (/(temoignage|témoignage|avis client|review)/.test(lower)) signals.push("testimonials");
  return signals;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { mission_id } = await req.json();
    if (!mission_id) return jsonResponse({ error: "mission_id required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: leads } = await supabase.from("outbound_leads")
      .select("id, website_url, company_name, company_id")
      .eq("mission_id", mission_id)
      .limit(50);
    if (!leads?.length) return jsonResponse({ ok: true, enriched: 0 });

    let enriched = 0;
    for (const lead of leads) {
      const url = lead.website_url;
      let weaknesses: string[] = ["no_website"];
      let signals: string[] = [];
      let markdown = "";
      if (url) {
        const scraped = await firecrawlScrape(url);
        const doc = scraped?.data ?? scraped;
        markdown = doc?.markdown ?? "";
        const links: string[] = doc?.links ?? [];
        weaknesses = extractWeaknesses(markdown, links);
        signals = extractTrustSignals(markdown);
      }

      await supabase.from("outbound_lead_enrichment").upsert({
        lead_id: lead.id,
        enrichment_payload: {
          weaknesses, trust_signals: signals,
          content_length: markdown.length,
          scraped_at: new Date().toISOString(),
        },
        enriched_at: new Date().toISOString(),
      }, { onConflict: "lead_id" }).then(() => {}, async () => {
        // table may not have unique on lead_id — fallback insert
        await supabase.from("outbound_lead_enrichment").insert({
          lead_id: lead.id,
          enrichment_payload: { weaknesses, trust_signals: signals, content_length: markdown.length },
        });
      });

      await supabase.from("outbound_leads").update({
        pipeline_stage: "enriched", updated_at: new Date().toISOString(),
      }).eq("id", lead.id);
      enriched++;
    }

    await supabase.rpc("noop").catch(() => {});
    await supabase.from("outbound_missions").update({
      enriched_count: enriched, status: "scoring",
    }).eq("id", mission_id);

    return jsonResponse({ ok: true, enriched });
  } catch (e) {
    console.error("mission-enrich failed", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
