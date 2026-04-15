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

    // Get audit
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

    // Mark processing
    await supabase.from("aipp_audits").update({ status: "processing" }).eq("id", audit_id);

    const domain = audit.domain;
    let normalizedUrl = domain.trim().replace(/\s+/g, "").replace(/^(https?)?:?\/?\/*/i, "").toLowerCase();
    normalizedUrl = `https://${normalizedUrl}`.replace(/\/+$/, "");

    // Try Firecrawl scrape
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    let markdown = "";
    let metadata: Record<string, any> = {};
    let links: string[] = [];
    let branding: Record<string, any> | null = null;
    let scrapeFailed = false;

    if (firecrawlKey) {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: normalizedUrl,
            formats: ["markdown", "branding", "links"],
            onlyMainContent: false,
            waitFor: 3000,
          }),
        });
        if (resp.ok) {
          const result = await resp.json();
          const d = result?.data || result;
          markdown = d?.markdown || "";
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

    // Extract signals
    const md = markdown.toLowerCase();
    const title = metadata?.title || "";
    const description = metadata?.description || "";

    // --- AEO Score (30%) ---
    const hasQA = md.includes("?") && (md.includes("réponse") || md.includes("answer") || md.includes("solution"));
    const hasDirectAnswers = md.includes("comment") || md.includes("pourquoi") || md.includes("how") || md.includes("what");
    const hasProblemSolution = (md.includes("problème") || md.includes("problem")) && (md.includes("solution") || md.includes("résoudre"));
    const contentLength = markdown.length;
    const semanticDensity = Math.min(contentLength / 5000, 1);
    const hasFAQ = md.includes("faq") || md.includes("questions fréquentes") || md.includes("frequently asked");
    const aeoRaw = (hasQA ? 20 : 0) + (hasDirectAnswers ? 15 : 0) + (hasProblemSolution ? 20 : 0) + (semanticDensity * 25) + (hasFAQ ? 20 : 0);
    const score_aeo = Math.min(Math.round(aeoRaw), 100);

    // --- Authority Score (25%) ---
    const hasReviews = md.includes("avis") || md.includes("review") || md.includes("témoignage") || md.includes("étoile");
    const hasLogo = !!(branding?.logo || branding?.images?.logo);
    const hasBrandCoherence = title.length > 3 && description.length > 10;
    const socialPlatforms = ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok"];
    const socialsFound = socialPlatforms.filter((p) => links.some((l) => l.toLowerCase().includes(p)));
    const authorityRaw = (hasReviews ? 30 : 0) + (hasLogo ? 15 : 0) + (hasBrandCoherence ? 20 : 0) + (Math.min(socialsFound.length, 4) * 8) + (description.length > 50 ? 5 : 0);
    const score_authority = Math.min(Math.round(authorityRaw), 100);

    // --- Conversion Score (20%) ---
    const hasCTA = md.includes("contact") || md.includes("soumission") || md.includes("rendez-vous") || md.includes("appel") || md.includes("book") || md.includes("get a quote");
    const hasPhone = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/.test(md);
    const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(md);
    const hasPricing = md.includes("prix") || md.includes("tarif") || md.includes("price") || md.includes("cost");
    const hasTrust = md.includes("certifi") || md.includes("licen") || md.includes("assuré") || md.includes("garanti");
    const conversionRaw = (hasCTA ? 25 : 0) + (hasPhone ? 20 : 0) + (hasEmail ? 15 : 0) + (hasPricing ? 20 : 0) + (hasTrust ? 20 : 0);
    const score_conversion = Math.min(Math.round(conversionRaw), 100);

    // --- Local Score (15%) ---
    const cityKeywords = ["montréal", "laval", "longueuil", "québec", "gatineau", "sherbrooke", "trois-rivières", "saguenay", "lévis", "terrebonne"];
    const citiesDetected = cityKeywords.filter((k) => md.includes(k));
    const hasAddress = md.includes("adresse") || md.includes("address") || /\d{1,5}\s+\w+\s+(rue|avenue|boulevard|street|ave|blvd)/i.test(md);
    const hasGMB = md.includes("google") && (md.includes("business") || md.includes("maps") || md.includes("avis"));
    const localRaw = (Math.min(citiesDetected.length, 5) * 15) + (hasAddress ? 15 : 0) + (hasGMB ? 10 : 0);
    const score_local = Math.min(Math.round(localRaw), 100);

    // --- Tech SEO Score (10%) ---
    const hasSSL = normalizedUrl.startsWith("https");
    const hasStructuredData = md.includes("schema") || md.includes("json-ld") || md.includes("itemtype");
    const hasMeta = title.length > 5 && description.length > 20;
    const techRaw = (hasSSL ? 35 : 0) + (hasStructuredData ? 30 : 0) + (hasMeta ? 35 : 0);
    const score_tech = Math.min(Math.round(techRaw), 100);

    // --- Global weighted score ---
    const score_global = Math.round(
      score_aeo * 0.3 + score_authority * 0.25 + score_conversion * 0.2 + score_local * 0.15 + score_tech * 0.1
    );

    // Revenue loss estimate (monthly CAD)
    const weakDimensions = [score_aeo, score_authority, score_conversion, score_local, score_tech].filter((s) => s < 40).length;
    const revenue_loss_estimate = weakDimensions * 800 + (100 - score_global) * 15;

    // Extract entities
    const serviceKeywords = ["plomberie", "électricité", "toiture", "rénovation", "peinture", "isolation", "chauffage", "climatisation", "menuiserie", "excavation"];
    const servicesDetected = serviceKeywords.filter((k) => md.includes(k));
    let businessName = title.split("|")[0]?.split("–")[0]?.split("—")[0]?.split(" - ")[0]?.trim() || domain;

    const entities = [
      { entity_type: "brand", name: businessName, confidence: hasBrandCoherence ? 0.9 : 0.5 },
      ...servicesDetected.map((s) => ({ entity_type: "service", name: s, confidence: 0.8 })),
      ...citiesDetected.map((c) => ({ entity_type: "city", name: c, confidence: 0.85 })),
    ];

    // Generate recommendations
    const recommendations: { title: string; description: string; priority: string; impact_score: number }[] = [];

    if (score_aeo < 50) {
      recommendations.push({ title: "Ajouter une section FAQ structurée", description: "Les moteurs IA comme ChatGPT priorisent le contenu en format question-réponse. Ajoutez au moins 10 questions fréquentes avec des réponses directes.", priority: "high", impact_score: 25 });
    }
    if (score_authority < 50) {
      recommendations.push({ title: "Renforcer les preuves sociales", description: "Ajoutez des avis vérifiés, témoignages clients et badges de certification sur votre page principale.", priority: "high", impact_score: 20 });
    }
    if (score_conversion < 50) {
      recommendations.push({ title: "Optimiser les appels à l'action", description: "Votre site manque de CTA clairs. Ajoutez des boutons 'Demander une soumission' et affichez votre numéro de téléphone en évidence.", priority: "high", impact_score: 22 });
    }
    if (score_local < 40) {
      recommendations.push({ title: "Améliorer la présence locale", description: "Créez des pages dédiées par ville desservie et mentionnez clairement vos zones de service.", priority: "medium", impact_score: 15 });
    }
    if (score_tech < 60) {
      recommendations.push({ title: "Implémenter les données structurées", description: "Ajoutez du Schema.org (LocalBusiness, FAQPage) pour aider les IA à comprendre votre entreprise.", priority: "medium", impact_score: 12 });
    }
    if (!hasPhone) {
      recommendations.push({ title: "Afficher un numéro de téléphone", description: "Un numéro visible augmente la confiance et le taux de contact de 35%.", priority: "high", impact_score: 18 });
    }
    if (socialsFound.length < 2) {
      recommendations.push({ title: "Lier vos réseaux sociaux", description: "Les profils sociaux renforcent la crédibilité perçue par les moteurs IA.", priority: "low", impact_score: 8 });
    }

    // Save scores
    await supabase.from("aipp_audit_scores").insert({
      audit_id,
      score_global,
      score_aeo,
      score_authority,
      score_conversion,
      score_local,
      score_tech,
      revenue_loss_estimate,
    });

    // Save entities
    if (entities.length > 0) {
      await supabase.from("aipp_audit_entities").insert(
        entities.map((e) => ({ audit_id, ...e }))
      );
    }

    // Save recommendations
    if (recommendations.length > 0) {
      await supabase.from("aipp_audit_recommendations").insert(
        recommendations.map((r) => ({ audit_id, ...r }))
      );
    }

    // Mark done
    await supabase.from("aipp_audits").update({ status: scrapeFailed ? "done" : "done" }).eq("id", audit_id);

    return new Response(
      JSON.stringify({ success: true, score_global, audit_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("aipp-v2-analyze error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
