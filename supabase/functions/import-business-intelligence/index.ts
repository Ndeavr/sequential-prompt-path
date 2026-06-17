// Real import pipeline: crawl -> extract -> score, streamed via realtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { enqueueContactVerification } from "../_shared/autoVerifyContact.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function normalizeDomain(input: string): string {
  let s = input.trim().replace(/\s+/g, "").replace(/^(https?)?:?\/?\/*/i, "").toLowerCase().replace(/\/+$/, "");
  return `https://${s}`;
}

async function fcScrape(url: string) {
  const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html", "links", "screenshot", "branding"],
      onlyMainContent: false,
      waitFor: 3000,
    }),
  });
  if (!resp.ok) {
    console.error("firecrawl scrape fail", resp.status, await resp.text());
    return null;
  }
  const j = await resp.json();
  return j?.data || j;
}

async function fcMap(url: string) {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, limit: 30 }),
    });
    if (!resp.ok) return [];
    const j = await resp.json();
    return j?.links || [];
  } catch { return []; }
}

async function aiExtract(markdown: string, html: string, businessName: string, domain: string) {
  if (!LOVABLE_API_KEY) return null;
  const prompt = `Extrais les signaux d'affaires de ce site web d'entrepreneur québécois (${businessName || domain}).
Retourne UNIQUEMENT le JSON correspondant au schéma. Si une donnée n'est pas trouvée, omets-la ou utilise null/[].
Cherche: nom légal, téléphone(s), courriel, adresse, ville(s) desservies, services offerts, licence RBQ (8 chiffres ou format XXXX-XXXX-XX), NEQ, années d'expérience, certifications, mentions financement, mentions urgence/24h, témoignages clients.

CONTENU:
${markdown.slice(0, 12000)}`;

  const tool = {
    type: "function",
    function: {
      name: "extract_business_signals",
      description: "Extract structured business signals",
      parameters: {
        type: "object",
        properties: {
          business_name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          address: { type: "string" },
          description: { type: "string" },
          rbq_number: { type: "string" },
          neq_number: { type: "string" },
          years_in_business: { type: "number" },
          services: { type: "array", items: { type: "string" } },
          service_cities: { type: "array", items: { type: "string" } },
          certifications: { type: "array", items: { type: "string" } },
          testimonials: { type: "array", items: { type: "object", properties: { author: {type:"string"}, text: {type:"string"} } } },
          financing_mentioned: { type: "boolean" },
          emergency_mentioned: { type: "boolean" },
          trust_badges: { type: "array", items: { type: "string" } },
        },
      },
    },
  };

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "extract_business_signals" } },
      }),
    });
    if (!resp.ok) { console.error("AI extract fail", resp.status, await resp.text()); return null; }
    const j = await resp.json();
    const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    return args ? JSON.parse(args) : null;
  } catch (e) {
    console.error("AI extract err", e);
    return null;
  }
}

function extractImages(html: string, baseUrl: string): string[] {
  if (!html) return [];
  const imgs = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    let src = m[1];
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) try { src = new URL(src, baseUrl).toString(); } catch {}
    if (src.startsWith("http") && !/data:|\.svg(\?|$)/i.test(src)) imgs.add(src);
  }
  return Array.from(imgs).slice(0, 60);
}

function detectSocials(links: string[]): Record<string,string> {
  const out: Record<string,string> = {};
  for (const l of links) {
    if (/facebook\.com\//i.test(l) && !out.facebook) out.facebook = l;
    else if (/instagram\.com\//i.test(l) && !out.instagram) out.instagram = l;
    else if (/linkedin\.com\//i.test(l) && !out.linkedin) out.linkedin = l;
    else if (/youtube\.com|youtu\.be/i.test(l) && !out.youtube) out.youtube = l;
    else if (/tiktok\.com\//i.test(l) && !out.tiktok) out.tiktok = l;
  }
  return out;
}

function computeScores(assets: any) {
  let trust = 0, seo = 0, social = 0, conv = 0, complete = 0, aeo = 0;
  // Trust
  if (assets.rbq_number) trust += 30;
  if (assets.neq_number) trust += 15;
  if (assets.years_in_business >= 5) trust += 15;
  if ((assets.certifications?.length || 0) >= 1) trust += 15;
  if ((assets.testimonials?.length || 0) >= 3) trust += 15;
  if (assets.address) trust += 10;
  // SEO
  if (assets.description?.length > 100) seo += 25;
  if ((assets.services?.length || 0) >= 3) seo += 25;
  if ((assets.service_cities?.length || 0) >= 3) seo += 25;
  if (assets.business_name) seo += 25;
  // Social
  const sc = assets.social_links || {};
  social = Math.min(100, Object.keys(sc).length * 25);
  // Conversion
  if (assets.phone) conv += 30;
  if (assets.email) conv += 20;
  if (assets.financing_mentioned) conv += 20;
  if (assets.emergency_mentioned) conv += 15;
  if ((assets.gallery?.length || 0) >= 10) conv += 15;
  // Completeness
  const checks = [
    !!assets.logo_url, !!assets.business_name, !!assets.phone, !!assets.address,
    !!assets.description, !!assets.rbq_number, (assets.gallery?.length || 0) > 0,
    (assets.services?.length || 0) > 0, (assets.service_cities?.length || 0) > 0,
    !!assets.email, (assets.certifications?.length || 0) > 0, Object.keys(sc).length > 0,
  ];
  complete = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  // AEO
  if ((assets.services?.length || 0) >= 5) aeo += 30;
  if ((assets.service_cities?.length || 0) >= 3) aeo += 30;
  if (assets.description?.length > 200) aeo += 20;
  if ((assets.testimonials?.length || 0) >= 3) aeo += 20;
  trust = Math.min(100, trust); seo = Math.min(100, seo); conv = Math.min(100, conv); aeo = Math.min(100, aeo);
  const overall = Math.round((trust + seo + social + conv + complete + aeo) / 6);
  return { trust_score: trust, seo_score: seo, social_score: social, conversion_score: conv, completeness_score: complete, aeo_score: aeo, overall_score: overall };
}

function buildQuickWins(assets: any, scores: any): string[] {
  const w: string[] = [];
  if (!assets.rbq_number) w.push("Ajouter votre licence RBQ pour rassurer les clients");
  if ((assets.testimonials?.length || 0) < 3) w.push("Publier 3+ témoignages clients vérifiés");
  if ((assets.service_cities?.length || 0) < 3) w.push("Lister vos villes desservies (SEO local)");
  if (!Object.keys(assets.social_links || {}).length) w.push("Ajouter vos liens sociaux (Facebook, Instagram)");
  if (!assets.financing_mentioned) w.push("Afficher options de financement");
  if ((assets.gallery?.length || 0) < 10) w.push("Ajouter 10+ photos avant/après");
  return w.slice(0, 5);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json();
    const { website_url, business_name, city, run_id: existingRunId } = body;

    if (!website_url && !business_name) {
      return new Response(JSON.stringify({ error: "website_url ou business_name requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const domain = website_url ? normalizeDomain(website_url) : null;

    // Stage 0: create run
    let runId = existingRunId;
    if (!runId) {
      const { data: run, error } = await sb.from("contractor_import_runs").insert({
        domain, input_payload: { website_url, business_name, city },
        status: "crawling", current_stage: "init", progress: 5,
      }).select("id").single();
      if (error) throw error;
      runId = run.id;
    }

    // Return runId immediately, continue in background
    const work = async () => {
      try {
        const stages: any[] = [];
        const pushStage = async (key: string, label: string, status: string, data?: any) => {
          stages.push({ key, label, status, data, at: new Date().toISOString() });
        };

        // Stage 1: scrape homepage
        await sb.from("contractor_import_runs").update({ status: "crawling", current_stage: "scrape_home", progress: 15 }).eq("id", runId);
        await pushStage("scrape_home", "Analyse de la page d'accueil", "running");
        const home = domain ? await fcScrape(domain) : null;
        await pushStage("scrape_home", "Page d'accueil analysée", home ? "detected" : "missing");

        // Stage 2: map site
        await sb.from("contractor_import_runs").update({ current_stage: "map_site", progress: 30, stages }).eq("id", runId);
        const sitemap = domain ? await fcMap(domain) : [];
        await pushStage("map_site", `${sitemap.length} pages détectées`, sitemap.length > 0 ? "detected" : "partial");

        // Stage 3: extract
        await sb.from("contractor_import_runs").update({ current_stage: "extract", progress: 50, stages }).eq("id", runId);
        const md = home?.markdown || "";
        const html = home?.html || "";
        const branding = home?.branding || {};
        const metadata = home?.metadata || {};
        const links = home?.links || [];

        const extracted = await aiExtract(md, html, business_name || metadata?.title || "", domain || "");
        await pushStage("extract", "Données structurées extraites", extracted ? "detected" : "partial");

        // Stage 4: images
        const gallery = extractImages(html, domain || "https://example.com");
        const socials = detectSocials([...links, ...gallery]);
        const logo_url = branding?.logo || branding?.images?.logo || extracted?.logo_url || null;
        const favicon = branding?.images?.favicon || metadata?.favicon || null;
        const hero = branding?.images?.ogImage || null;
        await pushStage("assets", `${gallery.length} images, logo ${logo_url ? "détecté" : "non détecté"}`, gallery.length > 0 ? "detected" : "partial");

        // Stage 5: enrich
        await sb.from("contractor_import_runs").update({ status: "enriching", current_stage: "enrich", progress: 70, stages }).eq("id", runId);

        const assetsRow = {
          run_id: runId,
          business_name: extracted?.business_name || business_name || metadata?.title || null,
          phone: extracted?.phone || null,
          email: extracted?.email || null,
          address: extracted?.address || null,
          description: extracted?.description || metadata?.description || null,
          rbq_number: extracted?.rbq_number || null,
          neq_number: extracted?.neq_number || null,
          years_in_business: extracted?.years_in_business || null,
          logo_url, favicon_url: favicon, hero_image_url: hero,
          gallery, social_links: socials,
          certifications: extracted?.certifications || [],
          services: extracted?.services || [],
          service_cities: extracted?.service_cities || (city ? [city] : []),
          testimonials: extracted?.testimonials || [],
          trust_badges: extracted?.trust_badges || [],
          financing_mentioned: !!extracted?.financing_mentioned,
          emergency_mentioned: !!extracted?.emergency_mentioned,
          reviews: [], review_summary: {},
          raw_signals: { branding, metadata_keys: Object.keys(metadata || {}), links_count: links.length, sitemap_count: sitemap.length },
        };
        await sb.from("contractor_import_assets").insert(assetsRow);

        // Stage 6: score
        await sb.from("contractor_import_runs").update({ status: "scoring", current_stage: "score", progress: 90, stages }).eq("id", runId);
        const scores = computeScores(assetsRow);
        const quick_wins = buildQuickWins(assetsRow, scores);
        await sb.from("contractor_import_scores").insert({ run_id: runId, ...scores, quick_wins, breakdown: scores });
        await pushStage("score", `Profil importé à ${scores.completeness_score}%`, "detected");

        // Stage 7: complete
        await sb.from("contractor_import_runs").update({
          status: "completed", current_stage: "completed", progress: 100,
          stages, completed_at: new Date().toISOString(),
          raw_json: { scores, has_extracted: !!extracted },
        }).eq("id", runId);
      } catch (e: any) {
        console.error("pipeline error", e);
        await sb.from("contractor_import_runs").update({
          status: "failed", error: String(e?.message || e), completed_at: new Date().toISOString(),
        }).eq("id", runId);
      }
    };

    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(work());

    return new Response(JSON.stringify({ success: true, run_id: runId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
