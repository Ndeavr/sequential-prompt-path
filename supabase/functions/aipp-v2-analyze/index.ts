import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { audit_id } = await req.json();
    if (!audit_id) {
      return new Response(JSON.stringify({ error: "audit_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: audit, error: auditErr } = await supabase
      .from("aipp_audits")
      .select("*")
      .eq("id", audit_id)
      .single();

    if (auditErr || !audit) {
      return new Response(JSON.stringify({ error: "Audit introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("aipp_audits").update({ status: "processing" }).eq("id", audit_id);

    const domain = audit.domain;
    let normalizedUrl = domain.trim().replace(/\s+/g, "").replace(/^(https?)?:?\/?\/*/i, "").toLowerCase();
    normalizedUrl = `https://${normalizedUrl}`.replace(/\/+$/, "");

    // ── Firecrawl scrape ──
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    let markdown = "";
    let rawHtml = "";
    let metadata: Record<string, any> = {};
    let links: string[] = [];
    let branding: Record<string, any> | null = null;
    let scrapeFailed = false;

    if (firecrawlKey) {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: normalizedUrl,
            formats: ["markdown", "html", "branding", "links"],
            onlyMainContent: false,
            waitFor: 4000,
          }),
        });
        if (resp.ok) {
          const result = await resp.json();
          const d = result?.data || result;
          markdown = d?.markdown || "";
          rawHtml = d?.html || "";
          metadata = d?.metadata || {};
          links = d?.links || [];
          branding = d?.branding || null;
        } else {
          console.error("Firecrawl error:", resp.status);
          scrapeFailed = true;
        }
      } catch (e) {
        console.error("Firecrawl exception:", e);
        scrapeFailed = true;
      }
    } else {
      scrapeFailed = true;
    }

    const md = markdown.toLowerCase();
    const html = rawHtml.toLowerCase();
    const title = metadata?.title || "";
    const description = metadata?.description || "";

    // ═══════════════════════════════════════════
    // 1. AEO Score (30%) — AI Engine Optimization
    // ═══════════════════════════════════════════
    const hasQA = md.includes("?") && (md.includes("réponse") || md.includes("answer") || md.includes("solution"));
    const hasDirectAnswers = md.includes("comment") || md.includes("pourquoi") || md.includes("how to") || md.includes("what is");
    const hasProblemSolution = (md.includes("problème") || md.includes("problem")) && (md.includes("solution") || md.includes("résoudre"));
    const contentLength = markdown.length;
    const semanticDensity = Math.min(contentLength / 5000, 1);
    const hasFAQ = md.includes("faq") || md.includes("questions fréquentes") || md.includes("frequently asked");
    const hasHowTo = md.includes("étape") || md.includes("step") || md.includes("guide");
    const hasLongContent = contentLength > 3000;
    const aeoRaw =
      (hasQA ? 18 : 0) +
      (hasDirectAnswers ? 12 : 0) +
      (hasProblemSolution ? 15 : 0) +
      (semanticDensity * 20) +
      (hasFAQ ? 15 : 0) +
      (hasHowTo ? 10 : 0) +
      (hasLongContent ? 10 : 0);
    const score_aeo = Math.min(Math.round(aeoRaw), 100);

    // ═══════════════════════════════════════════
    // 2. Authority Score (20%) — Trust & Credibility
    // ═══════════════════════════════════════════
    const hasReviews = md.includes("avis") || md.includes("review") || md.includes("témoignage") || md.includes("étoile") || md.includes("star");
    const hasLogo = !!(branding?.logo || branding?.images?.logo);
    const hasBrandCoherence = title.length > 3 && description.length > 10;
    const socialPlatforms = ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok"];
    const socialsFound = socialPlatforms.filter((p) => links.some((l) => l.toLowerCase().includes(p)));
    // RBQ / NEQ detection
    const hasRBQ = md.includes("rbq") || md.includes("régie du bâtiment") || /\d{4}-\d{4}-\d{2}/.test(md);
    const hasNEQ = md.includes("neq") || md.includes("registraire des entreprises") || /\d{10}/.test(md.slice(0, 2000));
    const hasCertifications = md.includes("certifi") || md.includes("licen") || md.includes("accrédité") || md.includes("accredited");
    const hasInsurance = md.includes("assuré") || md.includes("assurance responsabilité") || md.includes("insured") || md.includes("insurance");
    const authorityRaw =
      (hasReviews ? 20 : 0) +
      (hasLogo ? 8 : 0) +
      (hasBrandCoherence ? 10 : 0) +
      (Math.min(socialsFound.length, 4) * 5) +
      (hasRBQ ? 15 : 0) +
      (hasNEQ ? 7 : 0) +
      (hasCertifications ? 10 : 0) +
      (hasInsurance ? 10 : 0);
    const score_authority = Math.min(Math.round(authorityRaw), 100);

    // ═══════════════════════════════════════════
    // 3. Conversion Score (20%) — Lead Capture
    // ═══════════════════════════════════════════
    const hasCTA = md.includes("contact") || md.includes("soumission") || md.includes("rendez-vous") || md.includes("appel") || md.includes("book") || md.includes("get a quote") || md.includes("demandez");
    const hasPhone = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/.test(md);
    const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(md);
    const hasPricing = md.includes("prix") || md.includes("tarif") || md.includes("price") || md.includes("cost") || md.includes("à partir de");
    const hasForm = html.includes("<form") || html.includes("type=\"submit\"") || html.includes("type='submit'");
    const hasClickToCall = html.includes("tel:") || html.includes("href=\"tel");
    const conversionRaw =
      (hasCTA ? 20 : 0) +
      (hasPhone ? 15 : 0) +
      (hasEmail ? 10 : 0) +
      (hasPricing ? 15 : 0) +
      (hasForm ? 20 : 0) +
      (hasClickToCall ? 10 : 0) +
      (hasInsurance ? 5 : 0) +
      (hasCertifications ? 5 : 0);
    const score_conversion = Math.min(Math.round(conversionRaw), 100);

    // ═══════════════════════════════════════════
    // 4. Local Score (15%) — Geographic Presence
    // ═══════════════════════════════════════════
    const cityKeywords = [
      "montréal", "laval", "longueuil", "québec", "gatineau", "sherbrooke",
      "trois-rivières", "saguenay", "lévis", "terrebonne", "repentigny",
      "brossard", "drummondville", "saint-jean", "granby", "blainville",
      "rimouski", "victoriaville", "saint-hyacinthe", "joliette",
    ];
    const citiesDetected = cityKeywords.filter((k) => md.includes(k));
    const hasAddress = md.includes("adresse") || md.includes("address") || /\d{1,5}\s+\w+\s+(rue|avenue|boulevard|street|ave|blvd|chemin)/i.test(md);
    const hasGMB = md.includes("google") && (md.includes("business") || md.includes("maps") || md.includes("avis"));
    const hasPostalCode = /[a-z]\d[a-z]\s?\d[a-z]\d/i.test(md);
    const hasServiceArea = md.includes("zone de service") || md.includes("secteur desservi") || md.includes("service area") || md.includes("nous desservons");
    const localRaw =
      (Math.min(citiesDetected.length, 5) * 12) +
      (hasAddress ? 12 : 0) +
      (hasGMB ? 10 : 0) +
      (hasPostalCode ? 8 : 0) +
      (hasServiceArea ? 10 : 0);
    const score_local = Math.min(Math.round(localRaw), 100);

    // ═══════════════════════════════════════════
    // 5. Tech SEO Score (15%) — Technical Foundation
    // ═══════════════════════════════════════════
    const hasSSL = normalizedUrl.startsWith("https");
    const hasStructuredData = html.includes("schema.org") || html.includes("json-ld") || html.includes("itemtype") || html.includes("application/ld+json");
    const hasMeta = title.length > 5 && description.length > 20;
    const hasViewport = html.includes("viewport");
    const hasCanonical = html.includes("canonical");
    const hasOGTags = html.includes("og:title") || html.includes("og:description") || html.includes("og:image");
    const hasAltText = (html.match(/alt="[^"]+"/g) || []).length >= 3;
    const hasHreflang = html.includes("hreflang");
    const hasSitemap = links.some((l) => l.includes("sitemap"));
    const techRaw =
      (hasSSL ? 20 : 0) +
      (hasStructuredData ? 20 : 0) +
      (hasMeta ? 15 : 0) +
      (hasViewport ? 10 : 0) +
      (hasCanonical ? 5 : 0) +
      (hasOGTags ? 10 : 0) +
      (hasAltText ? 8 : 0) +
      (hasHreflang ? 5 : 0) +
      (hasSitemap ? 7 : 0);
    const score_tech = Math.min(Math.round(techRaw), 100);

    // ═══════════════════════════════════════════
    // Global weighted score
    // ═══════════════════════════════════════════
    const score_global = Math.round(
      score_aeo * 0.30 +
      score_authority * 0.20 +
      score_conversion * 0.20 +
      score_local * 0.15 +
      score_tech * 0.15
    );

    // ═══════════════════════════════════════════
    // Revenue loss estimate
    // ═══════════════════════════════════════════
    const weakDimensions = [score_aeo, score_authority, score_conversion, score_local, score_tech].filter((s) => s < 40).length;
    const revenue_loss_estimate = weakDimensions * 900 + (100 - score_global) * 18;

    // ═══════════════════════════════════════════
    // Growth potential (projected UNPRO-optimized score)
    // ═══════════════════════════════════════════
    const boostAeo = Math.min(score_aeo + 30, 95);
    const boostAuthority = Math.min(score_authority + 25, 95);
    const boostConversion = Math.min(score_conversion + 35, 98);
    const boostLocal = Math.min(score_local + 25, 95);
    const boostTech = Math.min(score_tech + 20, 95);
    const score_potential = Math.round(
      boostAeo * 0.30 + boostAuthority * 0.20 + boostConversion * 0.20 + boostLocal * 0.15 + boostTech * 0.15
    );

    // ═══════════════════════════════════════════
    // Entities extraction
    // ═══════════════════════════════════════════
    const serviceKeywords = [
      "plomberie", "électricité", "toiture", "rénovation", "peinture",
      "isolation", "chauffage", "climatisation", "menuiserie", "excavation",
      "maçonnerie", "fenêtre", "plancher", "salle de bain", "cuisine",
    ];
    const servicesDetected = serviceKeywords.filter((k) => md.includes(k));
    const businessName = title.split("|")[0]?.split("–")[0]?.split("—")[0]?.split(" - ")[0]?.trim() || domain;

    const entities = [
      { entity_type: "brand", name: businessName, confidence: hasBrandCoherence ? 0.9 : 0.5 },
      ...(hasRBQ ? [{ entity_type: "license", name: "RBQ", confidence: 0.85 }] : []),
      ...(hasNEQ ? [{ entity_type: "license", name: "NEQ", confidence: 0.75 }] : []),
      ...servicesDetected.map((s) => ({ entity_type: "service", name: s, confidence: 0.8 })),
      ...citiesDetected.map((c) => ({ entity_type: "city", name: c, confidence: 0.85 })),
    ];

    // ═══════════════════════════════════════════
    // Recommendations
    // ═══════════════════════════════════════════
    const recommendations: { title: string; description: string; priority: string; impact_score: number }[] = [];

    if (score_aeo < 50) {
      recommendations.push({ title: "Ajouter une section FAQ structurée", description: "Les moteurs IA comme ChatGPT priorisent le contenu en format question-réponse. Ajoutez au moins 10 questions fréquentes avec des réponses directes.", priority: "high", impact_score: 25 });
    }
    if (!hasStructuredData) {
      recommendations.push({ title: "Implémenter Schema.org (LocalBusiness + FAQPage)", description: "Les données structurées permettent aux IA de comprendre votre entreprise. Sans elles, vous êtes invisible pour les moteurs IA.", priority: "high", impact_score: 22 });
    }
    if (score_authority < 50) {
      recommendations.push({ title: "Renforcer les preuves sociales", description: "Ajoutez des avis vérifiés, témoignages clients et badges de certification sur votre page principale.", priority: "high", impact_score: 20 });
    }
    if (!hasRBQ) {
      recommendations.push({ title: "Afficher votre licence RBQ", description: "Le numéro RBQ est un signal de confiance majeur au Québec. L'afficher augmente la crédibilité de 40%.", priority: "high", impact_score: 18 });
    }
    if (score_conversion < 50) {
      recommendations.push({ title: "Optimiser les appels à l'action", description: "Ajoutez des boutons 'Demander une soumission' et un formulaire de contact visible au-dessus du fold.", priority: "high", impact_score: 22 });
    }
    if (!hasForm) {
      recommendations.push({ title: "Ajouter un formulaire de contact", description: "Un formulaire réduit la friction de 60% par rapport à un simple numéro de téléphone.", priority: "high", impact_score: 16 });
    }
    if (score_local < 40) {
      recommendations.push({ title: "Créer des pages par ville desservie", description: "Créez des pages dédiées par ville pour dominer la recherche locale et les recommandations IA.", priority: "medium", impact_score: 15 });
    }
    if (!hasViewport) {
      recommendations.push({ title: "Optimiser pour mobile", description: "70% des recherches locales sont mobiles. Un site non responsive perd des clients.", priority: "high", impact_score: 20 });
    }
    if (!hasPhone) {
      recommendations.push({ title: "Afficher un numéro de téléphone", description: "Un numéro visible augmente le taux de contact de 35%.", priority: "high", impact_score: 18 });
    }
    if (socialsFound.length < 2) {
      recommendations.push({ title: "Lier vos réseaux sociaux", description: "Les profils sociaux renforcent la crédibilité perçue par les moteurs IA.", priority: "low", impact_score: 8 });
    }

    // Sort by impact
    recommendations.sort((a, b) => b.impact_score - a.impact_score);

    // ═══════════════════════════════════════════
    // Signals detail (stored in metadata for transparency)
    // ═══════════════════════════════════════════
    const signalsDetail = {
      aeo: { hasQA, hasDirectAnswers, hasProblemSolution, hasFAQ, hasHowTo, hasLongContent, contentLength },
      authority: { hasReviews, hasLogo, hasBrandCoherence, socialsFound, hasRBQ, hasNEQ, hasCertifications, hasInsurance },
      conversion: { hasCTA, hasPhone, hasEmail, hasPricing, hasForm, hasClickToCall },
      local: { citiesDetected, hasAddress, hasGMB, hasPostalCode, hasServiceArea },
      tech: { hasSSL, hasStructuredData, hasMeta, hasViewport, hasCanonical, hasOGTags, hasAltText, hasSitemap },
    };

    // ═══════════════════════════════════════════
    // Save to DB
    // ═══════════════════════════════════════════
    await supabase.from("aipp_audit_scores").insert({
      audit_id,
      score_global,
      score_aeo,
      score_authority,
      score_conversion,
      score_local,
      score_tech,
      revenue_loss_estimate,
      score_potential,
    });

    if (entities.length > 0) {
      await supabase.from("aipp_audit_entities").insert(
        entities.map((e) => ({ audit_id, ...e }))
      );
    }

    if (recommendations.length > 0) {
      await supabase.from("aipp_audit_recommendations").insert(
        recommendations.map((r) => ({ audit_id, ...r }))
      );
    }

    await supabase.from("aipp_audits").update({ status: "done" }).eq("id", audit_id);

    return new Response(
      JSON.stringify({
        success: true,
        audit_id,
        score_global,
        score_potential,
        signals: signalsDetail,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("aipp-v2-analyze error:", error);

    // Try to mark as failed
    try {
      const { audit_id } = await req.clone().json().catch(() => ({ audit_id: null }));
      if (audit_id) {
        await supabase.from("aipp_audits").update({ status: "failed" }).eq("id", audit_id);
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
