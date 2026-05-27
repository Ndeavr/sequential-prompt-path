// AIPP MAX — Pipeline orchestrator
// Crawl website (Firecrawl) → enrich → AI summary (Gemini) → embeddings → score → geo pages
// Single edge function for V1 simplicity.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ───────────── Firecrawl
async function firecrawlScrape(url: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links", "summary"],
      onlyMainContent: true,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}: ${await res.text()}`);
  return await res.json();
}

// ───────────── Lovable AI Gateway
async function aiGenerate(model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function aiEmbed(input: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input,
    }),
  });
  if (!res.ok) throw new Error(`Embed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

// ───────────── Chunk helper
function chunkText(text: string, max = 1200): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 40);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if ((buf + p).length > max) {
      if (buf) chunks.push(buf);
      buf = p;
    } else {
      buf += (buf ? "\n\n" : "") + p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks.slice(0, 30);
}

// ───────────── Asset extraction & heuristic classification
const IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i;

function extractImageUrls(markdown: string, links: string[] = [], baseUrl?: string): string[] {
  const found = new Set<string>();
  const mdImg = /!\[[^\]]*\]\(([^)\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = mdImg.exec(markdown || "")) !== null) {
    let u = m[1].trim();
    if (u.startsWith("//")) u = "https:" + u;
    if (u.startsWith("/") && baseUrl) {
      try { u = new URL(u, baseUrl).toString(); } catch { /* noop */ }
    }
    if (/^https?:\/\//i.test(u)) found.add(u);
  }
  for (const l of links || []) {
    if (typeof l === "string" && IMG_EXT.test(l)) found.add(l);
  }
  return Array.from(found).slice(0, 40);
}

function classifyAssetByUrl(url: string): { type: string; confidence: number } {
  const u = url.toLowerCase();
  if (/favicon/.test(u)) return { type: "favicon", confidence: 0.9 };
  if (/logo|brand|identite/.test(u)) return { type: "logo", confidence: 0.75 };
  if (/(og[-_]?image|opengraph|share)/.test(u)) return { type: "og_image", confidence: 0.8 };
  if (/(camion|truck|van|vehicule)/.test(u)) return { type: "camion", confidence: 0.6 };
  if (/(equipe|team|staff|crew)/.test(u)) return { type: "equipe", confidence: 0.6 };
  if (/(certif|rbq|attestation|garantie)/.test(u)) return { type: "certificat", confidence: 0.6 };
  if (/(avant|after|before|apres)/.test(u)) return { type: "avant_apres", confidence: 0.6 };
  if (/(chantier|projet|portfolio|gallery|realisation|travaux)/.test(u)) {
    return { type: "chantier", confidence: 0.6 };
  }
  return { type: "chantier", confidence: 0.4 };
}

// ───────────── Score engine (déterministe pondéré)
function computeScores(signals: {
  hasWebsite: boolean;
  websiteWords: number;
  servicesCount: number;
  citiesCount: number;
  reviewsCount: number;
  rating: number;
  rbqVerified: boolean;
  mediaCount: number;
  faqCount: number;
  hasSummary: boolean;
  embeddingsCount: number;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const aippVisibility = clamp(
    (signals.hasWebsite ? 15 : 0) +
      Math.min(20, signals.websiteWords / 50) +
      Math.min(15, signals.servicesCount * 3) +
      Math.min(15, signals.citiesCount * 3) +
      (signals.hasSummary ? 15 : 0) +
      Math.min(20, signals.embeddingsCount * 2),
  );

  const trust = clamp(
    (signals.rbqVerified ? 25 : 0) +
      Math.min(30, signals.reviewsCount * 1.5) +
      signals.rating * 10 +
      Math.min(15, signals.mediaCount * 2),
  );

  const conversion = clamp(
    (signals.hasWebsite ? 25 : 0) +
      (signals.hasSummary ? 25 : 0) +
      Math.min(25, signals.servicesCount * 4) +
      Math.min(25, signals.faqCount * 5),
  );

  const mediaAuthority = clamp(signals.mediaCount * 8 + (signals.reviewsCount > 5 ? 20 : 0));

  const localDominance = clamp(
    signals.citiesCount * 10 + signals.reviewsCount * 0.8 + (signals.rbqVerified ? 15 : 0),
  );

  return {
    aipp_visibility: aippVisibility,
    trust,
    conversion,
    media_authority: mediaAuthority,
    local_dominance: localDominance,
  };
}

// ───────────── Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let runId: string | null = null;

  try {
    const { contractor_id, dry_run } = await req.json();
    if (!contractor_id) throw new Error("contractor_id required");

    const logs: string[] = [];
    const log = (m: string) => {
      logs.push(`[${new Date().toISOString()}] ${m}`);
      console.log(m);
    };

    // Load contractor
    const { data: contractor, error: cErr } = await supabase
      .from("contractors")
      .select("*")
      .eq("id", contractor_id)
      .single();
    if (cErr || !contractor) throw new Error(`Contractor not found: ${cErr?.message}`);
    log(`Loaded contractor: ${contractor.business_name} (${contractor.website})`);

    // 0) Open scraping run (tracking row)
    if (!dry_run) {
      const { data: runRow } = await supabase
        .from("contractor_scraping_runs")
        .insert({
          contractor_id,
          status: "scraping",
          source: contractor.website ? "website" : "manual",
        })
        .select("id")
        .single();
      runId = runRow?.id ?? null;
    }
    const updateRun = async (patch: Record<string, unknown>) => {
      if (!runId) return;
      await supabase.from("contractor_scraping_runs").update(patch).eq("id", runId);
    };

    let websiteMd = "";
    let websiteWords = 0;
    let scrapedLinks: string[] = [];

    // 1) Crawl website
    if (contractor.website) {
      try {
        const scrape = await firecrawlScrape(contractor.website);
        const payload = scrape.data ?? scrape;
        websiteMd = payload?.markdown ?? "";
        scrapedLinks = Array.isArray(payload?.links) ? payload.links : [];
        websiteWords = websiteMd.split(/\s+/).length;
        log(`Crawled ${websiteWords} words, ${scrapedLinks.length} links from ${contractor.website}`);
      } catch (e) {
        log(`Crawl failed: ${(e as Error).message}`);
        await updateRun({ error_message: `crawl: ${(e as Error).message}` });
      }
    }

    // 1b) Extract & persist assets (detected → pending validation)
    let assetsDetected = 0;
    let assetsValidated = 0;
    let assetsRejected = 0;
    let logosDetected = 0;
    let logosValidated = 0;
    let photosDetected = 0;
    let photosValidated = 0;

    if (!dry_run) {
      await updateRun({ status: "classifying" });
      const imageUrls = extractImageUrls(websiteMd, scrapedLinks, contractor.website);
      assetsDetected = imageUrls.length;
      log(`Detected ${assetsDetected} image assets on website`);

      // Wipe previous website-sourced assets for a clean snapshot
      await supabase
        .from("contractor_assets")
        .delete()
        .eq("contractor_id", contractor_id)
        .eq("source", "website");

      const rows = imageUrls.map((u) => {
        const cls = classifyAssetByUrl(u);
        const isPhotoType = ["chantier", "equipe", "camion", "avant_apres"].includes(cls.type);
        if (cls.type === "logo") logosDetected++;
        if (isPhotoType) photosDetected++;
        // Heuristic validation: confidence ≥ 0.6 → validated, else pending
        const validated = cls.confidence >= 0.6;
        if (validated && cls.type === "logo") logosValidated++;
        if (validated && isPhotoType) photosValidated++;
        if (validated) assetsValidated++;
        return {
          contractor_id,
          asset_type: cls.type,
          source: "website",
          url: u,
          ai_confidence: cls.confidence,
          ai_classification: { method: "url-heuristic" },
          validated,
          validation_status: validated ? "validated" : "pending",
          is_published: validated && (cls.type === "logo" || isPhotoType),
        };
      });

      if (rows.length) {
        const { error: insErr } = await supabase.from("contractor_assets").insert(rows);
        if (insErr) log(`Asset insert failed: ${insErr.message}`);
      }

      await updateRun({
        status: "validating",
        assets_detected: assetsDetected,
        assets_validated: assetsValidated,
        assets_rejected: assetsRejected,
        logos_detected: logosDetected,
        logos_validated: logosValidated,
        photos_detected: photosDetected,
        photos_validated: photosValidated,
      });
      log(`Assets — validated ${assetsValidated}/${assetsDetected} (logos ${logosValidated}/${logosDetected}, photos ${photosValidated}/${photosDetected})`);
    }


    // 2) AI Summary (Gemini)
    let summaryFr = contractor.description ?? "";
    let strengths: string[] = [];
    let problemMatches: string[] = [];
    let recommendationReason = "";

    if (!dry_run) {
      try {
        const prompt = `Tu es un analyste UNPRO. Génère un profil AIPP MAX en JSON strict pour cet entrepreneur québécois.

ENTREPRISE: ${contractor.business_name}
VILLE: ${contractor.city}
SPÉCIALITÉ: ${contractor.specialty}
DESCRIPTION: ${contractor.description}
SITE WEB EXTRAIT (markdown, max 4000 chars):
${websiteMd.slice(0, 4000)}

Retourne UNIQUEMENT du JSON (pas de markdown, pas de backticks):
{
  "summary_fr": "résumé fr-CA premium 2-3 phrases concentrées sur l'expertise locale et le bénéfice propriétaire",
  "strengths": ["force1 evidence-based", "force2", "force3", "force4", "force5"],
  "problem_matches": ["maison trop froide", "barrages de glace", "moisissure entretoit", "factures Hydro élevées"],
  "recommendation_reason": "raison concrète pourquoi UNPRO recommande cet entrepreneur (proximité + preuves + expertise)"
}`;
        const raw = await aiGenerate(
          "google/gemini-2.5-flash",
          "Tu es un analyste senior UNPRO. Tu réponds en JSON strict fr-CA.",
          prompt,
        );
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        summaryFr = parsed.summary_fr ?? summaryFr;
        strengths = parsed.strengths ?? [];
        problemMatches = parsed.problem_matches ?? [];
        recommendationReason = parsed.recommendation_reason ?? "";
        log(`AI summary generated: ${strengths.length} strengths, ${problemMatches.length} problems`);
      } catch (e) {
        log(`AI summary failed: ${(e as Error).message}`);
      }
    }

    // 3) Upsert AI profile
    await supabase.from("contractor_ai_profiles")
      .update({ is_current: false })
      .eq("contractor_id", contractor_id);

    await supabase.from("contractor_ai_profiles").insert({
      contractor_id,
      summary_fr: summaryFr,
      best_for: problemMatches,
      recommendation_reasons: strengths,
      considerations: [],
      personality_tags: ["expert-local", "proof-driven"],
      generated_by: "aipp-pipeline-run/gemini-2.5-flash",
      confidence: 0.78,
      is_current: true,
    });
    log("Saved contractor_ai_profiles");

    // 4) Build embeddings (services + summary + chunks)
    let embeddingsCount = 0;
    if (!dry_run && websiteMd) {
      // Wipe old
      await supabase.from("contractor_embeddings").delete().eq("contractor_id", contractor_id);

      const chunks = [
        { type: "summary", text: summaryFr },
        ...chunkText(websiteMd).map((t) => ({ type: "page", text: t })),
        ...strengths.map((s) => ({ type: "service", text: s })),
        ...problemMatches.map((p) => ({ type: "faq", text: p })),
      ].filter((c) => c.text && c.text.length > 30);

      for (const c of chunks.slice(0, 25)) {
        try {
          const emb = await aiEmbed(c.text);
          await supabase.from("contractor_embeddings").insert({
            contractor_id,
            chunk_type: c.type,
            chunk_text: c.text,
            source_ref: contractor.website,
            embedding: emb as unknown as string,
            metadata: { model: "openai/text-embedding-3-small" },
          });
          embeddingsCount++;
        } catch (e) {
          log(`Embed chunk failed: ${(e as Error).message}`);
        }
      }
      log(`Stored ${embeddingsCount} embeddings`);
    }

    // 5) Aggregate signals for score
    const [{ count: servicesCount }, { count: areasCount }, { count: mediaCount }] = await Promise.all([
      supabase.from("contractor_services").select("id", { count: "exact", head: true }).eq("contractor_id", contractor_id),
      supabase.from("contractor_service_areas").select("id", { count: "exact", head: true }).eq("contractor_id", contractor_id),
      supabase.from("contractor_media").select("id", { count: "exact", head: true }).eq("contractor_id", contractor_id),
    ]);

    const scores = computeScores({
      hasWebsite: !!contractor.website,
      websiteWords,
      servicesCount: servicesCount ?? 0,
      citiesCount: areasCount ?? 1,
      reviewsCount: contractor.review_count ?? 0,
      rating: contractor.rating ?? 0,
      rbqVerified: !!contractor.rbq_number,
      mediaCount: mediaCount ?? 0,
      faqCount: 0,
      hasSummary: !!summaryFr,
      embeddingsCount,
    });

    const totalScore = Math.round(
      (scores.aipp_visibility + scores.trust + scores.conversion + scores.media_authority + scores.local_dominance) / 5,
    );

    // 6) Persist scores (current snapshot)
    await supabase.from("contractor_aipp_scores")
      .update({ is_current: false })
      .eq("contractor_id", contractor_id);

    await supabase.from("contractor_aipp_scores").insert({
      contractor_id,
      total_score: totalScore,
      tier: totalScore >= 80 ? "Élite" : totalScore >= 60 ? "Pro" : totalScore >= 40 ? "Établi" : "Émergent",
      score_confidence: embeddingsCount > 5 && websiteWords > 200 ? 75 : 45,
      identity_score: scores.trust,
      trust_score: scores.trust,
      visibility_score: scores.aipp_visibility,
      conversion_score: scores.conversion,
      ai_seo_readiness_score: scores.aipp_visibility,
      breakdown_json: { ...scores, signals: { websiteWords, embeddingsCount, servicesCount, areasCount, mediaCount } },
      is_current: true,
    });
    log(`Score computed: ${totalScore} (${scores.aipp_visibility}/${scores.trust}/${scores.conversion})`);

    // 7) Update contractor aipp_score for ranking
    await supabase.from("contractors").update({ aipp_score: totalScore }).eq("id", contractor_id);

    // 8) Generate geo pages (4 templates for ISR; adaptable for any contractor)
    const geoTargets = [
      { city: "Terrebonne", service: "Isolation entretoit", slug: "isolation-entretoit-terrebonne" },
      { city: "Laval", service: "Isolation grenier", slug: "isolation-grenier-laval" },
      { city: "Blainville", service: "Ventilation entretoit", slug: "ventilation-entretoit-blainville" },
      { city: "Lanaudière", service: "Moisissure entretoit", slug: "moisissure-entretoit-lanaudiere" },
    ];

    let geoCreated = 0;
    if (!dry_run) {
      for (const g of geoTargets) {
        const fullSlug = `${contractor.slug}-${g.slug}`;
        const title = `${g.service} à ${g.city} | ${contractor.business_name}`;
        const meta = `${contractor.business_name} : expertise ${g.service.toLowerCase()} à ${g.city}. ${recommendationReason || "Évaluation gratuite, intervention rapide, garantie."}`;
        const content = `# ${g.service} à ${g.city}\n\n${summaryFr}\n\n## Pourquoi ${contractor.business_name} à ${g.city}\n\n${recommendationReason}\n\n## Forces reconnues\n\n${strengths.map((s) => `- ${s}`).join("\n")}\n\n## Problèmes résolus\n\n${problemMatches.map((p) => `- ${p}`).join("\n")}\n`;

        const jsonld = {
          "@context": "https://schema.org",
          "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
          name: contractor.business_name,
          url: `https://unpro.ca/geo/${fullSlug}`,
          description: meta,
          address: { "@type": "PostalAddress", addressLocality: g.city, addressRegion: "QC", addressCountry: "CA" },
          areaServed: g.city,
          serviceType: g.service,
          telephone: contractor.phone ?? undefined,
        };

        const faq = [
          { question: `Combien coûte ${g.service.toLowerCase()} à ${g.city}?`, answer: `Le coût varie selon la surface, l'accessibilité de l'entretoit et le matériau choisi. ${contractor.business_name} fournit une évaluation gratuite sur place.` },
          { question: `Pourquoi choisir ${contractor.business_name} à ${g.city}?`, answer: recommendationReason || `Expertise locale reconnue, équipe certifiée et garantie sur travaux.` },
        ];

        await supabase.from("aipp_geo_pages").upsert({
          contractor_id,
          slug: fullSlug,
          city: g.city,
          service: g.service,
          title,
          meta_description: meta,
          content_md: content,
          jsonld,
          faq,
          published_at: new Date().toISOString(),
        }, { onConflict: "slug" });
        geoCreated++;
      }
      log(`Generated ${geoCreated} geo pages`);
    }

    // 9) Visibility snapshot
    await supabase.from("contractor_visibility_metrics").insert({
      contractor_id,
      metric_date: new Date().toISOString().slice(0, 10),
      estimated_ai_visibility: scores.aipp_visibility,
      estimated_google_visibility: scores.local_dominance,
      profile_views: 0,
      cta_clicks: 0,
      lead_intents: 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        contractor_id,
        slug: contractor.slug,
        total_score: totalScore,
        scores,
        embeddings: embeddingsCount,
        geo_pages: geoCreated,
        logs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Pipeline failed:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
