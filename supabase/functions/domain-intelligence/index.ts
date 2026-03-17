import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Domain Normalization ──────────────────────────────────────────
function normalizeDomain(raw: string) {
  let input = raw.trim();
  // Add protocol if missing
  let urlStr = input;
  if (!/^https?:\/\//i.test(urlStr)) urlStr = `https://${urlStr}`;

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const isWww = hostname.startsWith("www.");
  const rootDomain = isWww ? hostname.slice(4) : hostname;
  const subdomain = isWww ? "www" : hostname.split(".").length > 2 ? hostname.split(".")[0] : null;

  return {
    raw_input: raw,
    normalized_domain: hostname,
    root_domain: rootDomain,
    full_url: url.toString(),
    preferred_hostname: hostname,
    protocol_detected: url.protocol.replace(":", ""),
    submitted_path: url.pathname !== "/" ? url.pathname + url.search : null,
    is_www: isWww,
    subdomain_if_any: subdomain === "www" ? null : subdomain,
  };
}

// ── DNS Check via dns.google ──────────────────────────────────────
async function checkDns(domain: string) {
  const result: any = { status: "unknown", records: {}, nameserver_provider: null, likely_issue: null, severity: null };
  try {
    const types = ["A", "AAAA", "CNAME", "NS", "MX"];
    const responses = await Promise.allSettled(
      types.map((t) =>
        fetch(`https://dns.google/resolve?name=${domain}&type=${t}`)
          .then((r) => r.json())
          .then((d) => ({ type: t, data: d }))
      )
    );

    for (const r of responses) {
      if (r.status === "fulfilled" && r.value.data?.Answer) {
        result.records[r.value.type] = r.value.data.Answer.map((a: any) => a.data);
      }
    }

    // NS detection
    const nsResp = responses.find(
      (r) => r.status === "fulfilled" && r.value.type === "NS"
    );
    if (nsResp?.status === "fulfilled" && nsResp.value.data?.Answer) {
      const ns = nsResp.value.data.Answer[0]?.data?.toLowerCase() || "";
      if (ns.includes("cloudflare")) result.nameserver_provider = "Cloudflare";
      else if (ns.includes("google")) result.nameserver_provider = "Google";
      else if (ns.includes("awsdns")) result.nameserver_provider = "AWS Route53";
      else if (ns.includes("domaincontrol")) result.nameserver_provider = "GoDaddy";
      else result.nameserver_provider = ns;
    }

    const hasA = !!result.records.A?.length;
    const hasCNAME = !!result.records.CNAME?.length;
    result.status = hasA || hasCNAME ? "healthy" : "broken";
    if (!hasA && !hasCNAME) {
      result.likely_issue = "no_a_or_cname";
      result.severity = "critical";
    }
  } catch (e) {
    result.status = "unknown";
    result.likely_issue = "dns_check_failed";
  }
  return result;
}

// ── SSL Check ─────────────────────────────────────────────────────
async function checkSsl(domain: string) {
  const result: any = { status: "unknown", https_available: false, redirect_http_to_https: false };
  try {
    const httpsResp = await fetch(`https://${domain}`, { method: "HEAD", redirect: "manual" });
    result.https_available = true;
    result.status = "active";
    result.https_status_code = httpsResp.status;
  } catch {
    result.https_available = false;
    result.status = "missing";
  }
  try {
    const httpResp = await fetch(`http://${domain}`, { method: "HEAD", redirect: "manual" });
    const loc = httpResp.headers.get("location") || "";
    result.redirect_http_to_https = loc.startsWith("https://");
  } catch { /* skip */ }
  return result;
}

// ── Accessibility Check ───────────────────────────────────────────
async function checkAccessibility(domain: string) {
  const variants = [
    { label: "https_root", url: `https://${domain}` },
    { label: "https_www", url: `https://www.${domain}` },
    { label: "http_root", url: `http://${domain}` },
  ];
  const results: any = { live_status: "DOWN", variants: {} };

  for (const v of variants) {
    try {
      const resp = await fetch(v.url, { redirect: "follow" });
      results.variants[v.label] = {
        reachable: true,
        status_code: resp.status,
        final_url: resp.url,
      };
      if (resp.ok) results.live_status = "LIVE";
    } catch {
      results.variants[v.label] = { reachable: false };
    }
  }

  if (results.live_status !== "LIVE") {
    const anyPartial = Object.values(results.variants).some((v: any) => v.reachable);
    if (anyPartial) results.live_status = "PARTIAL";
  }
  return results;
}

// ── Firecrawl Scrape ──────────────────────────────────────────────
async function scrapeWithFirecrawl(url: string, apiKey: string) {
  try {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html", "links"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Firecrawl error:", resp.status, errText);
      return null;
    }
    return await resp.json();
  } catch (e) {
    console.error("Firecrawl fetch failed:", e);
    return null;
  }
}

// ── SEO Analysis (heuristic from HTML) ────────────────────────────
function analyzeSeo(html: string, metadata: any) {
  const checks: any = {};
  let score = 0;
  const maxScore = 100;
  const warnings: string[] = [];
  const critical: string[] = [];
  const passed: string[] = [];

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || metadata?.title || "";
  if (title && title.length > 5) { score += 15; passed.push("title_present"); checks.title = title; }
  else { critical.push("missing_title"); checks.title = null; }
  if (title.length > 60) warnings.push("title_too_long");

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
  const desc = descMatch?.[1]?.trim() || metadata?.description || "";
  if (desc && desc.length > 10) { score += 15; passed.push("meta_description_present"); checks.meta_description = desc; }
  else { critical.push("missing_meta_description"); checks.meta_description = null; }

  // H1
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) { score += 10; passed.push("h1_present"); checks.h1 = h1Match[1].replace(/<[^>]*>/g, "").trim(); }
  else { warnings.push("missing_h1"); }

  // Canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([\s\S]*?)["']/i);
  if (canonicalMatch) { score += 10; passed.push("canonical_present"); checks.canonical = canonicalMatch[1]; }
  else { warnings.push("missing_canonical"); }

  // Lang
  const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  if (langMatch) { score += 5; passed.push("lang_attribute"); checks.lang = langMatch[1]; }
  else { warnings.push("missing_lang"); }

  // OG tags
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["']/i);
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["']/i);
  const ogImage = html.match(/<meta[^>]*property=["']og:image["']/i);
  let ogScore = 0;
  if (ogTitle) ogScore += 3;
  if (ogDesc) ogScore += 3;
  if (ogImage) ogScore += 4;
  score += ogScore;
  if (ogScore >= 7) passed.push("og_tags_present");
  else warnings.push("incomplete_og_tags");

  // Favicon
  const favicon = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["']/i);
  if (favicon) { score += 5; passed.push("favicon_present"); }
  else { warnings.push("missing_favicon"); }

  // Robots meta
  const robotsMeta = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([\s\S]*?)["']/i);
  if (robotsMeta) {
    checks.robots_meta = robotsMeta[1];
    if (!robotsMeta[1].includes("noindex")) { score += 10; passed.push("robots_allows_index"); }
    else { critical.push("noindex_detected"); }
  } else {
    score += 10; passed.push("no_robots_restriction");
  }

  // Sitemap link
  const sitemapLink = html.match(/sitemap/i);
  if (sitemapLink) { score += 5; passed.push("sitemap_reference"); }

  // Homepage clarity (service/location keywords)
  const bodyText = html.replace(/<[^>]*>/g, " ").toLowerCase();
  const hasServiceWords = /rénovation|plomberie|électricien|toiture|construction|entrepreneur|services/i.test(bodyText);
  const hasLocationWords = /montréal|québec|laval|longueuil|gatineau|sherbrooke/i.test(bodyText);
  if (hasServiceWords) { score += 5; passed.push("service_clarity"); }
  if (hasLocationWords) { score += 5; passed.push("location_clarity"); }

  // Cap score
  const finalScore = Math.min(score, maxScore);

  return {
    seo_score: finalScore,
    passed_checks: passed,
    warnings,
    critical_issues: critical,
    checks,
  };
}

// ── Structured Data Detection ─────────────────────────────────────
function detectStructuredData(html: string) {
  const schemas: string[] = [];
  const ldMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldMatches) {
    try {
      const ld = JSON.parse(m[1]);
      const types = Array.isArray(ld) ? ld.map((i: any) => i["@type"]) : [ld["@type"]];
      schemas.push(...types.filter(Boolean));
    } catch { /* skip malformed */ }
  }

  // Microdata check
  const microdataTypes = [...html.matchAll(/itemtype=["']https?:\/\/schema\.org\/(\w+)["']/gi)].map((m) => m[1]);
  schemas.push(...microdataTypes);

  const unique = [...new Set(schemas)];
  const known = ["LocalBusiness", "Organization", "ProfessionalService", "FAQPage", "BreadcrumbList", "Review", "AggregateRating", "Service", "WebSite", "WebPage", "Article"];
  const found = unique.filter((s) => known.includes(s));
  const missing = known.filter((k) => !unique.includes(k) && ["LocalBusiness", "ProfessionalService", "FAQPage", "BreadcrumbList"].includes(k));

  return {
    status: found.length > 0 ? "detected" : "none",
    schemas_found: found,
    all_schemas: unique,
    missing_opportunities: missing,
    quality_estimate: found.length >= 3 ? "good" : found.length >= 1 ? "basic" : "none",
  };
}

// ── Hosting Detection ─────────────────────────────────────────────
function detectHosting(html: string, headers: Record<string, string>, dns: any) {
  const signals: string[] = [];
  let provider = "unknown";
  let confidence = 0;

  const server = headers["server"]?.toLowerCase() || "";
  const via = headers["via"]?.toLowerCase() || "";
  const poweredBy = headers["x-powered-by"]?.toLowerCase() || "";

  if (server.includes("cloudflare") || headers["cf-ray"]) { provider = "Cloudflare"; confidence = 90; signals.push("server_header"); }
  else if (server.includes("vercel") || headers["x-vercel-id"]) { provider = "Vercel"; confidence = 95; signals.push("vercel_header"); }
  else if (server.includes("netlify") || headers["x-nf-request-id"]) { provider = "Netlify"; confidence = 95; signals.push("netlify_header"); }
  else if (server.includes("shopify")) { provider = "Shopify"; confidence = 90; signals.push("server_header"); }
  else if (poweredBy.includes("wix")) { provider = "Wix"; confidence = 90; signals.push("x-powered-by"); }
  else if (html.includes("squarespace")) { provider = "Squarespace"; confidence = 70; signals.push("html_clue"); }
  else if (html.includes("wp-content") || html.includes("wordpress")) { provider = "WordPress"; confidence = 75; signals.push("html_clue"); }
  else if (server.includes("apache")) { provider = "Apache/Shared Hosting"; confidence = 50; signals.push("server_header"); }
  else if (server.includes("nginx")) { provider = "Nginx"; confidence = 40; signals.push("server_header"); }

  return { provider, confidence, signals_used: signals };
}

// ── Indexability ──────────────────────────────────────────────────
function analyzeIndexability(html: string, seoResult: any, accessibility: any) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let likely = true;

  if (seoResult.critical_issues?.includes("noindex_detected")) { blockers.push("noindex_meta"); likely = false; }
  if (accessibility.live_status === "DOWN") { blockers.push("site_not_reachable"); likely = false; }
  if (!seoResult.checks?.canonical) { warnings.push("no_canonical"); }

  const score = likely ? (blockers.length === 0 ? 85 : 50) : 20;

  return {
    status: likely ? "likely_indexable" : "blocked",
    likely_indexable: likely,
    blocking_reasons: blockers,
    warnings,
    score,
    confidence: accessibility.live_status === "LIVE" ? "high" : "low",
  };
}

// ── AI-Powered AISEO + Authority + Recommendations + Homepage SEO ─
async function aiAnalysis(
  html: string,
  markdown: string,
  seoResult: any,
  structuredData: any,
  domain: string,
  lovableApiKey: string
) {
  const truncatedHtml = html.slice(0, 8000);
  const truncatedMd = markdown.slice(0, 6000);

  const systemPrompt = `Tu es un expert SEO technique, AISEO et autorité web pour le marché québécois de la rénovation et de la construction. Tu analyses des sites web d'entrepreneurs et professionnels.

Réponds UNIQUEMENT en JSON valide (pas de markdown, pas de backticks) avec cette structure exacte:
{
  "aiseo": {
    "score": <number 0-100>,
    "strengths": ["..."],
    "weaknesses": ["..."],
    "top_improvements": ["..."]
  },
  "authority": {
    "score": <number 0-100>,
    "trust_strengths": ["..."],
    "trust_gaps": ["..."],
    "confidence": "high|medium|low"
  },
  "recommendations": [
    {
      "title": "...",
      "severity": "critical|important|opportunity",
      "category": "dns|ssl|seo|aiseo|authority|structured_data",
      "why_it_matters": "...",
      "exact_action": "...",
      "expected_impact": "...",
      "estimated_effort": "facile|moyen|complexe"
    }
  ],
  "homepage_seo": {
    "improved_title": "...",
    "improved_meta_description": "...",
    "improved_h1": "...",
    "intro_paragraph": "...",
    "trust_block_suggestions": ["..."],
    "suggested_faqs": [{"question": "...", "answer": "..."}],
    "schema_recommendations": ["..."]
  }
}`;

  const userPrompt = `Analyse ce site web d'entrepreneur québécois: ${domain}

Données SEO détectées:
- Titre: ${seoResult.checks?.title || "non détecté"}
- Meta description: ${seoResult.checks?.meta_description || "non détectée"}
- H1: ${seoResult.checks?.h1 || "non détecté"}
- Score SEO: ${seoResult.seo_score}/100
- Données structurées: ${structuredData.schemas_found.join(", ") || "aucune"}
- Schemas manquants: ${structuredData.missing_opportunities.join(", ") || "aucun"}

Contenu markdown (extrait):
${truncatedMd}

HTML (extrait):
${truncatedHtml}

Génère une analyse complète AISEO, autorité, recommandations prioritaires et corrections SEO pour la page d'accueil. Sois précis et actionnable. Ne fabrique pas de faits sur l'entreprise si non visibles.`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI gateway error:", resp.status, errText);
      return null;
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    // Clean potential markdown wrapping
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("AI analysis failed:", e);
    return null;
  }
}

// ── Compute Scores ────────────────────────────────────────────────
function computeScores(dns: any, ssl: any, accessibility: any, seo: any, indexability: any, aiResult: any) {
  // Technical score
  let technical = 0;
  if (dns.status === "healthy") technical += 25;
  else if (dns.status === "partial") technical += 10;
  if (ssl.https_available) technical += 25;
  if (ssl.redirect_http_to_https) technical += 10;
  if (accessibility.live_status === "LIVE") technical += 25;
  else if (accessibility.live_status === "PARTIAL") technical += 10;
  if (indexability.likely_indexable) technical += 15;

  const seoScore = seo.seo_score || 0;
  const aiseoScore = aiResult?.aiseo?.score || 0;
  const authorityScore = aiResult?.authority?.score || 0;

  // Confidence
  let confidence = 40;
  if (accessibility.live_status === "LIVE") confidence += 20;
  if (dns.status === "healthy") confidence += 15;
  if (ssl.https_available) confidence += 10;
  if (aiResult) confidence += 15;

  return {
    technical_score: Math.min(technical, 100),
    seo_score: seoScore,
    aiseo_score: aiseoScore,
    authority_score: authorityScore,
    confidence_score: Math.min(confidence, 100),
  };
}

// ── Main Handler ──────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { domain_input, contractor_id } = await req.json();
    if (!domain_input) {
      return new Response(JSON.stringify({ error: "domain_input requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Normalize
    const normalized = normalizeDomain(domain_input);
    if (!normalized) {
      return new Response(JSON.stringify({ error: "Domaine invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Upsert domain record
    let domainRecord: any;
    if (contractor_id) {
      const { data: existing } = await supabase
        .from("contractor_domains")
        .select("*")
        .eq("contractor_id", contractor_id)
        .eq("normalized_domain", normalized.normalized_domain)
        .maybeSingle();

      if (existing) {
        domainRecord = existing;
      } else {
        const { data, error } = await supabase
          .from("contractor_domains")
          .insert({ contractor_id, ...normalized })
          .select()
          .single();
        if (error) throw error;
        domainRecord = data;
      }
    }

    // 3. Create check record
    const checkInsert: any = { check_started_at: new Date().toISOString(), run_status: "running" };
    if (domainRecord) checkInsert.contractor_domain_id = domainRecord.id;

    const { data: checkRecord, error: checkErr } = await supabase
      .from("contractor_domain_checks")
      .insert(checkInsert)
      .select()
      .single();
    if (checkErr) throw checkErr;

    // 4. Run analyses in parallel
    const domain = normalized.root_domain!;
    const [dnsResult, sslResult, accessibilityResult] = await Promise.all([
      checkDns(domain),
      checkSsl(domain),
      checkAccessibility(domain),
    ]);

    // 5. Firecrawl scrape if available and site is reachable
    let scrapeData: any = null;
    let html = "";
    let markdown = "";
    let headers: Record<string, string> = {};

    if (FIRECRAWL_API_KEY && accessibilityResult.live_status !== "DOWN") {
      scrapeData = await scrapeWithFirecrawl(normalized.full_url!, FIRECRAWL_API_KEY);
      html = scrapeData?.data?.html || scrapeData?.html || "";
      markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";
      // Extract metadata
      const meta = scrapeData?.data?.metadata || scrapeData?.metadata || {};
      headers = meta.headers || {};
    }

    // 6. Heuristic analyses
    const seoResult = html ? analyzeSeo(html, scrapeData?.data?.metadata || scrapeData?.metadata) : { seo_score: 0, passed_checks: [], warnings: ["no_html"], critical_issues: ["site_not_scraped"], checks: {} };
    const structuredDataResult = html ? detectStructuredData(html) : { status: "unknown", schemas_found: [], all_schemas: [], missing_opportunities: [], quality_estimate: "unknown" };
    const hostingResult = html ? detectHosting(html, headers, dnsResult) : { provider: "unknown", confidence: 0, signals_used: [] };
    const indexabilityResult = analyzeIndexability(html, seoResult, accessibilityResult);

    // 7. AI analysis (AISEO, Authority, Recommendations, Homepage SEO)
    let aiResult: any = null;
    if (LOVABLE_API_KEY && html) {
      aiResult = await aiAnalysis(html, markdown, seoResult, structuredDataResult, domain, LOVABLE_API_KEY);
    }

    // 8. Compute scores
    const scores = computeScores(dnsResult, sslResult, accessibilityResult, seoResult, indexabilityResult, aiResult);

    // 9. Update check record
    await supabase
      .from("contractor_domain_checks")
      .update({
        check_completed_at: new Date().toISOString(),
        run_status: "completed",
        dns_json: dnsResult,
        hosting_json: hostingResult,
        ssl_json: sslResult,
        accessibility_json: accessibilityResult,
        indexability_json: indexabilityResult,
        seo_json: seoResult,
        structured_data_json: structuredDataResult,
        aiseo_json: aiResult?.aiseo || {},
        authority_json: aiResult?.authority || {},
        recommendations_json: aiResult?.recommendations || [],
        generated_homepage_seo_json: aiResult?.homepage_seo || {},
        raw_headers_json: headers,
        raw_html_excerpt: html.slice(0, 2000),
        final_status: accessibilityResult.live_status === "LIVE" ? "success" : accessibilityResult.live_status === "PARTIAL" ? "partial" : "failed",
      })
      .eq("id", checkRecord.id);

    // 10. Update domain record
    if (domainRecord) {
      const liveMap: Record<string, string> = { LIVE: "live", PARTIAL: "partial", DOWN: "down" };
      await supabase
        .from("contractor_domains")
        .update({
          live_status: liveMap[accessibilityResult.live_status] || "unknown",
          dns_status: dnsResult.status,
          ssl_status: sslResult.status,
          indexability_status: indexabilityResult.status,
          structured_data_status: structuredDataResult.status,
          hosting_provider: hostingResult.provider,
          hosting_confidence: hostingResult.confidence,
          final_url: accessibilityResult.variants?.https_root?.final_url || normalized.full_url,
          last_checked_at: new Date().toISOString(),
          verification_status: accessibilityResult.live_status === "LIVE" ? "verified" : "pending",
          ...scores,
        })
        .eq("id", domainRecord.id);

      // 11. Delta computation if previous check exists
      const { data: prevChecks } = await supabase
        .from("contractor_domain_checks")
        .select("id, seo_json, aiseo_json, authority_json")
        .eq("contractor_domain_id", domainRecord.id)
        .neq("id", checkRecord.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (prevChecks && prevChecks.length > 0) {
        const prev = prevChecks[0];
        const prevSeo = (prev.seo_json as any)?.seo_score || 0;
        const prevAiseo = (prev.aiseo_json as any)?.score || 0;
        const prevAuth = (prev.authority_json as any)?.score || 0;

        await supabase.from("contractor_domain_deltas").insert({
          contractor_domain_id: domainRecord.id,
          previous_check_id: prev.id,
          current_check_id: checkRecord.id,
          technical_delta: scores.technical_score - 0, // no previous technical stored in check
          seo_delta: scores.seo_score - prevSeo,
          aiseo_delta: scores.aiseo_score - prevAiseo,
          authority_delta: scores.authority_score - prevAuth,
        });
      }

      // 12. Log event
      await supabase.from("contractor_domain_events").insert({
        contractor_domain_id: domainRecord.id,
        event_type: "analysis_completed",
        event_payload_json: { check_id: checkRecord.id, scores, live_status: accessibilityResult.live_status },
      });
    }

    // 13. Return full result
    const result = {
      domain: normalized,
      domain_id: domainRecord?.id,
      check_id: checkRecord.id,
      live_status: accessibilityResult.live_status,
      scores,
      dns: dnsResult,
      ssl: sslResult,
      accessibility: accessibilityResult,
      hosting: hostingResult,
      seo: seoResult,
      structured_data: structuredDataResult,
      indexability: indexabilityResult,
      aiseo: aiResult?.aiseo || null,
      authority: aiResult?.authority || null,
      recommendations: aiResult?.recommendations || [],
      homepage_seo: aiResult?.homepage_seo || null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Domain intelligence error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
