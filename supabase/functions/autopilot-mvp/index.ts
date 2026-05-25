// PROTECTED FILE — Autopilot MVP orchestrator
// Phase A: scrape (Google Places) → enrich (Firecrawl) → score (AIPP) → personalize (Gemini)
// Writes everything to outbound_companies, outbound_ai_scores, outbound_ai_personalizations
// Tracked in autopilot_runs.stats jsonb

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AutopilotPayload {
  trade: string;
  cities: string[];
  limit?: number;
  dry_run?: boolean;
}

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Stage 1: Google Places search ────────────────────────────────────────────
async function searchGooglePlaces(trade: string, city: string, limit: number) {
  const query = `${trade} ${city} Québec`;
  const url = "https://places.googleapis.com/v1/places:searchText";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.types,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "fr-CA", maxResultCount: Math.min(limit, 20) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Places ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.places ?? [];
}

// ─── Stage 2: Firecrawl scrape ────────────────────────────────────────────────
async function firecrawlScrape(url: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Firecrawl error", e);
    return null;
  }
}

function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

// ─── Stage 3: AIPP deterministic score ────────────────────────────────────────
function computeAippScore(company: any, scraped: any): {
  total: number;
  components: Record<string, number>;
  weaknesses: string[];
} {
  const w: string[] = [];
  const c: Record<string, number> = {
    google: 0,
    website: 0,
    reviews: 0,
    trust: 0,
    aeo: 0,
    conversion: 0,
  };

  // Google Business /20
  if (company.google_rating) c.google += 10;
  if (company.review_count >= 10) c.google += 5;
  if (company.review_count >= 50) c.google += 5;
  if (!company.google_rating) w.push("Pas de présence Google Business mesurable");

  // Website /20
  if (company.website_url) c.website += 8;
  if (scraped?.markdown && scraped.markdown.length > 500) c.website += 6;
  if (scraped?.metadata?.title) c.website += 3;
  if (scraped?.metadata?.description) c.website += 3;
  if (!company.website_url) w.push("Aucun site web public");
  else if (!scraped?.markdown || scraped.markdown.length < 500) w.push("Contenu de site très mince");

  // Reviews /15
  c.reviews = Math.min(15, Math.floor((company.review_count ?? 0) / 5));
  if ((company.review_count ?? 0) < 10) w.push("Moins de 10 avis Google — confiance limitée");

  // Trust /15 (RBQ, NEQ, mentions)
  if (company.rbq_number) c.trust += 8;
  else w.push("Numéro RBQ absent");
  if (company.neq_number) c.trust += 5;
  if (scraped?.markdown?.toLowerCase().includes("assurance")) c.trust += 2;

  // AEO /20 (structured data, FAQ, services bien décrits)
  const md = (scraped?.markdown ?? "").toLowerCase();
  if (md.includes("service")) c.aeo += 4;
  if (md.includes("zone") || md.includes("desservi") || md.includes("territoire")) c.aeo += 4;
  if (md.includes("faq") || md.includes("question")) c.aeo += 4;
  if (md.length > 2000) c.aeo += 4;
  if (scraped?.metadata?.description) c.aeo += 4;
  if (c.aeo < 10) w.push("Profil IA faible : sites comme ChatGPT/Gemini ne peuvent pas vous citer correctement");

  // Conversion /10
  if (md.includes("soumission") || md.includes("devis") || md.includes("contact")) c.conversion += 5;
  if (md.includes("tel:") || company.phone) c.conversion += 5;
  if (c.conversion < 5) w.push("Aucun CTA clair sur le site");

  const total = Math.min(100, Object.values(c).reduce((a, b) => a + b, 0));
  return { total, components: c, weaknesses: w };
}

// ─── Stage 4: Gemini personalization ──────────────────────────────────────────
async function generatePersonalizedEmail(company: any, score: any) {
  const prompt = `Tu es un expert en visibilité IA pour entrepreneurs en services résidentiels au Québec.

Entreprise: ${company.company_name}
Ville: ${company.city}
Métier: ${company.trade}
Site web: ${company.website_url ?? "aucun"}
Note Google: ${company.google_rating ?? "N/A"} (${company.review_count ?? 0} avis)
Score AIPP: ${score.total}/100
Faiblesses détectées: ${score.weaknesses.join("; ")}

Écris un email court (max 110 mots), en français québécois, ton direct et respectueux.
Mentionne 1 vraie faiblesse de la liste et explique comment UNPRO la corrige.
Termine par: "Voir votre analyse complète: [LIEN]"
Ne mentionne PAS de prix. Pas de slogan marketing. Pas de "j'espère que vous allez bien".
Signe: "— L'équipe UNPRO"

Retourne JSON strict: {"subject": "...", "body": "..."}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    console.error("Gemini error", await res.text());
    return null;
  }
  const data = await res.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return null;
  }
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let runId: string | null = null;

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization manquante");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Utilisateur non authentifié");

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès admin requis");

    const payload = (await req.json()) as AutopilotPayload;
    const trade = payload.trade?.trim();
    const cities = (payload.cities ?? []).filter(Boolean);
    const limit = Math.max(1, Math.min(payload.limit ?? 50, 200));
    const dryRun = payload.dry_run !== false;

    if (!trade || cities.length === 0) {
      return new Response(JSON.stringify({ error: "trade et cities requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create run
    const { data: run, error: runErr } = await supabase
      .from("autopilot_runs")
      .insert({
        trade,
        cities,
        target_limit: limit,
        dry_run: dryRun,
        status: "running",
        current_stage: "scraping",
        started_at: new Date().toISOString(),
        triggered_by: userData.user.id,
        stats: {},
      })
      .select()
      .single();
    if (runErr || !run) throw new Error(`Run init failed: ${runErr?.message}`);
    runId = run.id;

    const stats: Record<string, number> = {
      scraped: 0,
      duplicates: 0,
      enriched: 0,
      scored: 0,
      personalized: 0,
      approval_queued: 0,
      errors: 0,
    };

    const perCity = Math.ceil(limit / cities.length);
    const allProspects: any[] = [];

    // ── Stage 1: Scrape per city
    for (const city of cities) {
      try {
        const places = await searchGooglePlaces(trade, city, perCity);
        for (const place of places) {
          if (allProspects.length >= limit) break;
          const phone = place.nationalPhoneNumber ?? null;
          const website = place.websiteUri ?? null;
          const name = place.displayName?.text ?? "Sans nom";
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + (place.id ?? "").slice(-6);

          // Upsert by google_place_id
          const { data: existing } = await supabase
            .from("outbound_companies")
            .select("id")
            .eq("google_place_id", place.id)
            .maybeSingle();

          if (existing) {
            stats.duplicates++;
            await supabase.from("outbound_companies").update({ autopilot_run_id: runId }).eq("id", existing.id);
            allProspects.push({ id: existing.id, company_name: name, website_url: website, phone, city, trade, google_rating: place.rating, review_count: place.userRatingCount });
            continue;
          }

          const { data: inserted, error: insErr } = await supabase
            .from("outbound_companies")
            .insert({
              company_name: name,
              company_slug: slug,
              website_url: website,
              phone,
              city,
              region: "Québec",
              trade,
              specialty: trade,
              language: "fr",
              google_place_id: place.id,
              google_rating: place.rating ?? null,
              review_count: place.userRatingCount ?? 0,
              address: place.formattedAddress ?? null,
              business_status: (place.businessStatus ?? "OPERATIONAL").toLowerCase() === "operational" ? "active" : "inactive",
              autopilot_run_id: runId,
            })
            .select()
            .single();
          if (insErr) {
            console.error("Insert err", insErr.message);
            stats.errors++;
            continue;
          }
          stats.scraped++;
          allProspects.push({ ...inserted, trade });
        }
      } catch (e) {
        console.error(`Stage1 ${city}:`, e);
        stats.errors++;
      }
    }

    await supabase.from("autopilot_runs").update({ current_stage: "enriching", stats }).eq("id", runId);

    // ── Stage 2: Firecrawl enrich (only ones with a website)
    const scrapedMap = new Map<string, any>();
    for (const p of allProspects) {
      if (!p.website_url) continue;
      try {
        const scraped = await firecrawlScrape(p.website_url);
        if (scraped) {
          scrapedMap.set(p.id, scraped);
          const email = extractEmail(scraped.markdown ?? "");
          const rbqMatch = (scraped.markdown ?? "").match(/RBQ\s*:?\s*(\d{4}-\d{4}-\d{2})/i);
          const neqMatch = (scraped.markdown ?? "").match(/NEQ\s*:?\s*(\d{10})/i);
          await supabase
            .from("outbound_companies")
            .update({
              email: email ?? undefined,
              rbq_number: rbqMatch ? rbqMatch[1] : undefined,
              neq_number: neqMatch ? neqMatch[1] : undefined,
            })
            .eq("id", p.id);
          stats.enriched++;
        }
      } catch (e) {
        console.error(`Enrich ${p.id}:`, e);
        stats.errors++;
      }
    }
    await supabase.from("autopilot_runs").update({ current_stage: "scoring", stats }).eq("id", runId);

    // ── Stage 3: Score
    const scored: Array<{ prospect: any; score: any }> = [];
    for (const p of allProspects) {
      try {
        const fresh = await supabase.from("outbound_companies").select("*").eq("id", p.id).single();
        if (!fresh.data) continue;
        const scoreResult = computeAippScore(fresh.data, scrapedMap.get(p.id));
        scored.push({ prospect: fresh.data, score: scoreResult });

        // Store in outbound_ai_scores via lead pivot
        let leadId: string | null = null;
        const existingLead = await supabase
          .from("outbound_leads")
          .select("id")
          .eq("company_id", p.id)
          .maybeSingle();
        if (existingLead.data) {
          leadId = existingLead.data.id;
        } else {
          const inserted = await supabase
            .from("outbound_leads")
            .insert({ company_id: p.id, crm_status: "new", pipeline_stage: "scored" })
            .select("id")
            .single();
          leadId = inserted.data?.id ?? null;
        }
        if (leadId) {
          await supabase.from("outbound_ai_scores").insert({
            lead_id: leadId,
            scoring_version: "autopilot-v1",
            score_json: scoreResult,
            reasoning_summary: scoreResult.weaknesses.slice(0, 3).join(" • "),
          });
          (p as any).__lead_id = leadId;
          (fresh.data as any).__lead_id = leadId;
        }
        stats.scored++;
      } catch (e) {
        console.error(`Score ${p.id}:`, e);
        stats.errors++;
      }
    }
    await supabase.from("autopilot_runs").update({ current_stage: "personalizing", stats }).eq("id", runId);

    // ── Stage 4: Personalize (stored in outbound_ai_personalizations keyed by lead_id)
    for (const { prospect, score } of scored) {
      try {
        const leadId = (prospect as any).__lead_id;
        if (!leadId) continue;
        const email = await generatePersonalizedEmail(prospect, score);
        if (email?.subject && email?.body) {
          await supabase.from("outbound_ai_personalizations").insert({
            lead_id: leadId,
            personalization_type: "email_full",
            prompt_used: `Trade=${prospect.trade}; City=${prospect.city}; Score=${score.total}`,
            generated_output: JSON.stringify({ subject: email.subject, body: email.body }),
            approved: false,
          });
          stats.personalized++;
        }
      } catch (e) {
        console.error(`Personalize ${prospect.id}:`, e);
        stats.errors++;
      }
    }
    await supabase.from("autopilot_runs").update({ current_stage: "approval_gate", stats }).eq("id", runId);

    // ── Stage 5: Push to approval gate
    for (const { prospect } of scored) {
      try {
        await supabase.from("outbound_approvals").insert({
          prospect_id: prospect.id,
          approval_status: "pending_approval",
        }).then(() => {}, () => {});
        stats.approval_queued++;
      } catch {
        // ignore duplicates
      }
    }

    // ── Status discipline: never "done" with 0 scraped
    const counts = {
      scraped_count: stats.scraped,
      deduplicated_count: stats.duplicates,
      enriched_count: stats.enriched,
      scored_count: stats.scored,
      personalized_count: stats.personalized,
      pending_count: stats.approval_queued,
      failed_count: stats.errors,
    };

    let finalStatus: string;
    let blockReason: string | null = null;
    let nextAction: string | null = null;
    let alertAdmin = false;

    if (stats.scraped === 0) {
      finalStatus = dryRun ? "dry_run_completed" : "blocked";
      blockReason = dryRun
        ? "Aucune entreprise scrapée (mode test)."
        : "Aucune entreprise scrapée. Vérifier sources (Google Places, Firecrawl), clé API, mapping métier/ville.";
      nextAction = dryRun
        ? "Ajuster métier/villes ou relancer en live"
        : "Vérifier les sources et relancer le scraping";
      alertAdmin = !dryRun;
    } else if (dryRun) {
      finalStatus = "waiting_approval";
      nextAction = "Approuver pour envoi live";
    } else {
      finalStatus = "completed";
      nextAction = "Pipeline terminé";
    }

    await supabase
      .from("autopilot_runs")
      .update({
        status: finalStatus,
        current_stage: finalStatus,
        last_step: "approval_gate",
        next_action: nextAction,
        block_reason: blockReason,
        alert_admin: alertAdmin,
        target_count: limit,
        ...counts,
        stats,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    await supabase.from("outbound_run_logs").insert({
      run_id: runId,
      step: "pipeline_complete",
      status: finalStatus,
      message: blockReason ?? `Pipeline terminé · ${stats.scraped} scrapés`,
      payload: { stats, counts, dry_run: dryRun },
    });

    if (alertAdmin) {
      await supabase.from("outbound_admin_alerts").insert({
        run_id: runId,
        severity: "critical",
        title: "Run live sans aucun prospect scrapé",
        message: blockReason,
        missing_component: "google_places_or_firecrawl",
        suggested_fix: "Vérifier GOOGLE_PLACES_API_KEY, FIRECRAWL_API_KEY, et le mapping métier/ville.",
      });
    }

    return new Response(
      JSON.stringify({ ok: true, run_id: runId, status: finalStatus, stats, counts, block_reason: blockReason, dry_run: dryRun }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Autopilot error:", err);
    if (runId) {
      await supabase
        .from("autopilot_runs")
        .update({
          status: "failed",
          last_step: "exception",
          block_reason: err.message?.slice(0, 500),
          next_action: "Examiner les logs et relancer",
          alert_admin: true,
          error_message: err.message?.slice(0, 500),
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
      await supabase.from("outbound_run_logs").insert({
        run_id: runId,
        step: "exception",
        status: "failed",
        message: err.message?.slice(0, 500) ?? "Erreur inconnue",
        payload: {},
      });
      await supabase.from("outbound_admin_alerts").insert({
        run_id: runId,
        severity: "critical",
        title: "Exception pipeline autopilot",
        message: err.message?.slice(0, 500),
        suggested_fix: "Consulter les logs Edge Function autopilot-mvp.",
      });
    }
    return new Response(JSON.stringify({ error: err.message ?? "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

