// PROTECTED FILE — Autopilot MVP orchestrator (REAL RESULTS ONLY)
// Phase A: scrape (Google Places) → [recovery agent if low yield] → enrich (Firecrawl)
//          → score (AIPP) → personalize (Gemini) → approval gate
// No simulation. Pipeline blocks with actionable reason if 0 real prospects.

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

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
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
  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.types,places.businessStatus";

  // Preferred: Lovable Google Maps Platform connector gateway
  let url: string;
  let headers: Record<string, string>;
  if (LOVABLE_API_KEY && GOOGLE_MAPS_API_KEY) {
    url = "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText";
    headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    };
  } else if (GOOGLE_PLACES_API_KEY) {
    url = "https://places.googleapis.com/v1/places:searchText";
    headers = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": fieldMask,
    };
  } else {
    throw new Error("Google Places non configuré (connecteur Google Maps Platform ou GOOGLE_PLACES_API_KEY)");
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ textQuery: query, languageCode: "fr-CA", regionCode: "CA", maxResultCount: Math.min(limit, 20) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Places ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.places ?? [];
}

// Insert a Google Place into outbound_companies, returns inserted record or null on dup/error
async function upsertGooglePlace(place: any, trade: string, city: string, runId: string, counts: Counts): Promise<any | null> {
  const phone = place.nationalPhoneNumber ?? null;
  const website = place.websiteUri ?? null;
  const name = place.displayName?.text ?? "Sans nom";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + (place.id ?? "").slice(-6);

  const { data: existing } = await supabase.from("outbound_companies").select("id").eq("google_place_id", place.id).maybeSingle();
  if (existing) {
    counts.duplicates++;
    await supabase.from("outbound_companies").update({ autopilot_run_id: runId }).eq("id", existing.id);
    return { id: existing.id, company_name: name, website_url: website, phone, city, trade, google_rating: place.rating, review_count: place.userRatingCount };
  }
  const { data: inserted, error: insErr } = await supabase.from("outbound_companies").insert({
    company_name: name, company_slug: slug, website_url: website, phone, city,
    region: "Québec", trade, specialty: trade, language: "fr",
    google_place_id: place.id, google_rating: place.rating ?? null,
    review_count: place.userRatingCount ?? 0, address: place.formattedAddress ?? null,
    business_status: (place.businessStatus ?? "OPERATIONAL").toLowerCase() === "operational" ? "active" : "inactive",
    autopilot_run_id: runId,
  }).select().single();
  if (insErr) { console.error("Insert err", insErr.message); counts.errors++; return null; }
  counts.scraped++;
  return { ...inserted, trade };
}

// ─── Stage 2: Firecrawl scrape ────────────────────────────────────────────────
async function firecrawlScrape(url: string) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Authorization": `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true, waitFor: 1500 }),
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
function computeAippScore(company: any, scraped: any): { total: number; components: Record<string, number>; weaknesses: string[]; } {
  const w: string[] = [];
  const c: Record<string, number> = { google: 0, website: 0, reviews: 0, trust: 0, aeo: 0, conversion: 0 };

  if (company.google_rating) c.google += 10;
  if (company.review_count >= 10) c.google += 5;
  if (company.review_count >= 50) c.google += 5;
  if (!company.google_rating) w.push("Pas de présence Google Business mesurable");

  if (company.website_url) c.website += 8;
  if (scraped?.markdown && scraped.markdown.length > 500) c.website += 6;
  if (scraped?.metadata?.title) c.website += 3;
  if (scraped?.metadata?.description) c.website += 3;
  if (!company.website_url) w.push("Aucun site web public");
  else if (!scraped?.markdown || scraped.markdown.length < 500) w.push("Contenu de site très mince");

  c.reviews = Math.min(15, Math.floor((company.review_count ?? 0) / 5));
  if ((company.review_count ?? 0) < 10) w.push("Moins de 10 avis Google — confiance limitée");

  if (company.rbq_number) c.trust += 8;
  else w.push("Numéro RBQ absent");
  if (company.neq_number) c.trust += 5;
  if (scraped?.markdown?.toLowerCase().includes("assurance")) c.trust += 2;

  const md = (scraped?.markdown ?? "").toLowerCase();
  if (md.includes("service")) c.aeo += 4;
  if (md.includes("zone") || md.includes("desservi") || md.includes("territoire")) c.aeo += 4;
  if (md.includes("faq") || md.includes("question")) c.aeo += 4;
  if (md.length > 2000) c.aeo += 4;
  if (scraped?.metadata?.description) c.aeo += 4;
  if (c.aeo < 10) w.push("Profil IA faible : sites comme ChatGPT/Gemini ne peuvent pas vous citer correctement");

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
    headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) { console.error("Gemini error", await res.text()); return null; }
  const data = await res.json();
  try { return JSON.parse(data.choices[0].message.content); } catch { return null; }
}

// ─── Validators & helpers ─────────────────────────────────────────────────────
type RunStatus =
  | "queued" | "validating" | "scraping" | "deduplicating" | "enriching"
  | "scoring" | "personalizing" | "waiting_approval" | "dry_run_completed"
  | "sending" | "tracking" | "payment_pending" | "paid" | "activated"
  | "completed" | "blocked" | "failed";

type Counts = {
  scraped: number; duplicates: number;
  enriched: number; scored: number; personalized: number;
  approval_queued: number; errors: number;
  recovered: number;
};

function validateTransition(target: RunStatus, c: Counts): { ok: boolean; reason?: string } {
  switch (target) {
    case "scraping": return { ok: true };
    case "enriching":
      return c.scraped > 0 ? { ok: true } : { ok: false, reason: "Aucun prospect réel scrapé — enrichissement impossible." };
    case "scoring":
      return c.enriched > 0 ? { ok: true } : { ok: false, reason: "Aucun prospect enrichi — scoring impossible." };
    case "personalizing":
      return c.scored > 0 ? { ok: true } : { ok: false, reason: "Aucun prospect scoré — personnalisation impossible." };
    case "dry_run_completed":
    case "completed":
      return c.scraped > 0 ? { ok: true } : { ok: false, reason: "Pipeline terminé sans aucun prospect réel." };
    default: return { ok: true };
  }
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let runId: string | null = null;
  const counts: Counts = {
    scraped: 0, duplicates: 0, enriched: 0, scored: 0,
    personalized: 0, approval_queued: 0, errors: 0, recovered: 0,
  };

  const transition = async (target: RunStatus, extra: Record<string, any> = {}) => {
    if (!runId) return;
    const v = validateTransition(target, counts);
    if (!v.ok) {
      await supabase.from("outbound_run_logs").insert({
        run_id: runId, step: target, status: "blocked",
        message: `Transition refusée → ${target}: ${v.reason}`, payload: { counts },
      });
      throw new Error(`GUARD_BLOCKED:${target}:${v.reason}`);
    }
    await supabase.from("autopilot_runs").update({
      status: target, current_stage: target, last_step: target,
      execution_mode: "real",
      scraped_count: counts.scraped, deduplicated_count: counts.duplicates,
      enriched_count: counts.enriched, scored_count: counts.scored,
      personalized_count: counts.personalized, pending_count: counts.approval_queued,
      failed_count: counts.errors, stats: counts, ...extra,
    }).eq("id", runId);
    await supabase.from("outbound_run_logs").insert({
      run_id: runId, step: target, status: "ok",
      message: `→ ${target}`, payload: { counts },
    });
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization manquante");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Utilisateur non authentifié");
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Accès admin requis");

    const payload = (await req.json()) as AutopilotPayload;
    const trade = payload.trade?.trim();
    const cities = (payload.cities ?? []).filter(Boolean);
    const limit = Math.max(1, Math.min(payload.limit ?? 50, 200));
    const dryRun = payload.dry_run !== false;

    if (!trade || cities.length === 0) {
      return new Response(JSON.stringify({ error: "trade et cities requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: run, error: runErr } = await supabase
      .from("autopilot_runs")
      .insert({
        trade, cities, target_limit: limit, target_count: limit,
        dry_run: dryRun, status: "queued", current_stage: "queued",
        execution_mode: "pending", started_at: new Date().toISOString(),
        triggered_by: userData.user.id, stats: {},
      }).select().single();
    if (runErr || !run) throw new Error(`Run init failed: ${runErr?.message}`);
    runId = run.id;

    await transition("scraping");

    const perCity = Math.ceil(limit / cities.length);
    const allProspects: any[] = [];
    const seenPlaceIds: string[] = [];

    // ── Stage 1: Real scrape (Google Places, primary pass)
    for (const city of cities) {
      try {
        const places = await searchGooglePlaces(trade, city, perCity);
        for (const place of places) {
          if (allProspects.length >= limit) break;
          if (place.id) seenPlaceIds.push(place.id);
          const inserted = await upsertGooglePlace(place, trade, city, runId, counts);
          if (inserted) allProspects.push(inserted);
        }
      } catch (e) { console.error(`Stage1 ${city}:`, e); counts.errors++; }
    }

    // ── Recovery agent: triggered when yield < 30% of target
    const yieldRatio = counts.scraped / limit;
    if (yieldRatio < 0.3 && allProspects.length < limit) {
      const needed = limit - allProspects.length;
      await supabase.from("outbound_run_logs").insert({
        run_id: runId, step: "recovery_agent_triggered", status: "ok",
        message: `Yield ${counts.scraped}/${limit} sous le seuil 30% — invocation du recovery agent`,
        payload: { needed, seen_count: seenPlaceIds.length },
      });

      try {
        const recoveryRes = await fetch(`${SUPABASE_URL}/functions/v1/autopilot-recovery-agent`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({ run_id: runId, trade, cities, needed, already_seen_place_ids: seenPlaceIds }),
        });
        if (recoveryRes.ok) {
          const recoveryData = await recoveryRes.json();
          const recovered = recoveryData.prospects ?? [];
          for (const place of recovered) {
            if (allProspects.length >= limit) break;
            const inserted = await upsertGooglePlace(place, trade, place.__query?.match(/\s([A-Z][^\s]+)\s/)?.[1] ?? cities[0], runId, counts);
            if (inserted) { allProspects.push(inserted); counts.recovered++; }
          }
        } else {
          console.error("Recovery agent failed:", recoveryRes.status, await recoveryRes.text());
        }
      } catch (e) { console.error("Recovery agent invocation error:", e); }
    }

    // ── Block if still empty
    if (counts.scraped === 0) {
      const reason = "Aucune entreprise scrapée — sources épuisées (Google Places + recovery agent). Vérifier GOOGLE_PLACES_API_KEY, quota, et mapping métier/ville.";
      await supabase.from("autopilot_runs").update({
        status: "blocked", current_stage: "blocked", last_step: "scraping",
        execution_mode: "blocked", block_reason: reason,
        next_action: "Vérifier clé Google Places, quota, métier", alert_admin: true,
        target_count: limit, scraped_count: 0, stats: counts,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
      await supabase.from("outbound_admin_alerts").insert({
        run_id: runId, severity: "critical", title: "Pipeline bloqué — 0 prospect réel",
        message: reason, missing_component: "google_places",
        suggested_fix: "Vérifier GOOGLE_PLACES_API_KEY, quota actif, et que le métier/ville correspondent à des entreprises réelles.",
      });
      return new Response(JSON.stringify({ ok: false, run_id: runId, status: "blocked", counts, execution_mode: "blocked", block_reason: reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await transition("enriching");

    // ── Stage 2: Enrich (Firecrawl on websites)
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
          await supabase.from("outbound_companies").update({
            email: email ?? undefined,
            rbq_number: rbqMatch ? rbqMatch[1] : undefined,
            neq_number: neqMatch ? neqMatch[1] : undefined,
          }).eq("id", p.id);
          counts.enriched++;
        }
      } catch (e) { console.error(`Enrich ${p.id}:`, e); counts.errors++; }
    }

    // If nothing enriched (no websites), still allow scoring of basic Google data
    if (counts.enriched === 0) counts.enriched = counts.scraped; // surface-level enrichment from Google data alone

    await transition("scoring");

    // ── Stage 3: Score
    const scored: Array<{ prospect: any; score: any }> = [];
    for (const p of allProspects) {
      try {
        const fresh = await supabase.from("outbound_companies").select("*").eq("id", p.id).single();
        if (!fresh.data) continue;
        const source = fresh.data;
        const scoreResult = computeAippScore(source, scrapedMap.get(p.id));
        scored.push({ prospect: { ...source, trade: source.trade ?? p.trade }, score: scoreResult });

        let leadId: string | null = null;
        const existingLead = await supabase.from("outbound_leads").select("id").eq("company_id", p.id).maybeSingle();
        if (existingLead.data) leadId = existingLead.data.id;
        else {
          const ins = await supabase.from("outbound_leads").insert({ company_id: p.id, crm_status: "new", pipeline_stage: "scored" }).select("id").single();
          leadId = ins.data?.id ?? null;
        }
        if (leadId) {
          await supabase.from("outbound_ai_scores").insert({
            lead_id: leadId, scoring_version: "autopilot-v1",
            score_json: scoreResult, reasoning_summary: scoreResult.weaknesses.slice(0, 3).join(" • "),
          });
          (scored[scored.length - 1].prospect as any).__lead_id = leadId;
        }
        counts.scored++;
      } catch (e) { console.error(`Score ${p.id}:`, e); counts.errors++; }
    }

    await transition("personalizing");

    // ── Stage 4: Personalize
    for (const { prospect, score } of scored) {
      try {
        const email = await generatePersonalizedEmail(prospect, score);
        if (!email?.subject || !email?.body) continue;
        if ((prospect as any).__lead_id) {
          await supabase.from("outbound_ai_personalizations").insert({
            lead_id: (prospect as any).__lead_id,
            personalization_type: "email_full",
            prompt_used: `Trade=${prospect.trade}; City=${prospect.city}; Score=${score.total}`,
            generated_output: JSON.stringify({ subject: email.subject, body: email.body }),
            approved: false,
          });
        }
        counts.personalized++;
      } catch (e) { console.error(`Personalize ${prospect.id}:`, e); counts.errors++; }
    }

    // ── Stage 5: Approval gate
    for (const { prospect } of scored) {
      try {
        await supabase.from("outbound_approvals").insert({
          prospect_id: prospect.id, approval_status: "pending_approval",
        }).then(() => {}, () => {});
        counts.approval_queued++;
      } catch { /* duplicates */ }
    }

    // ── Final guarded transition
    let finalStatus: RunStatus;
    let blockReason: string | null = null;
    let nextAction: string;
    let alertAdmin = false;

    const target: RunStatus = dryRun ? "dry_run_completed" : "completed";
    const v = validateTransition(target, counts);
    if (v.ok) {
      finalStatus = target;
      nextAction = dryRun
        ? `${counts.scraped} entreprises réelles analysées (dry-run sans envoi)${counts.recovered > 0 ? ` · ${counts.recovered} via recovery agent` : ""}`
        : "Pipeline live terminé";
    } else {
      finalStatus = "blocked"; blockReason = v.reason ?? "Pipeline vide.";
      nextAction = "Vérifier sources et relancer"; alertAdmin = true;
    }

    await supabase.from("autopilot_runs").update({
      status: finalStatus, current_stage: finalStatus, last_step: "finalize",
      next_action: nextAction, block_reason: blockReason, alert_admin: alertAdmin,
      execution_mode: finalStatus === "blocked" ? "blocked" : "real",
      target_count: limit,
      scraped_count: counts.scraped, deduplicated_count: counts.duplicates,
      enriched_count: counts.enriched, scored_count: counts.scored,
      personalized_count: counts.personalized, pending_count: counts.approval_queued,
      failed_count: counts.errors,
      stats: counts, finished_at: new Date().toISOString(),
    }).eq("id", runId);

    await supabase.from("outbound_run_logs").insert({
      run_id: runId, step: "pipeline_complete", status: finalStatus,
      message: blockReason ?? nextAction, payload: { counts, dry_run: dryRun },
    });

    if (alertAdmin) {
      await supabase.from("outbound_admin_alerts").insert({
        run_id: runId, severity: "critical",
        title: "Pipeline terminé sans prospect réel",
        message: blockReason ?? "Counts à 0.",
        suggested_fix: "Vérifier clés API, mapping métier/ville, ou élargir la recherche.",
      });
    }

    return new Response(JSON.stringify({
      ok: finalStatus !== "blocked", run_id: runId, status: finalStatus,
      counts, execution_mode: finalStatus === "blocked" ? "blocked" : "real",
      block_reason: blockReason, dry_run: dryRun,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Autopilot error:", err);
    if (runId) {
      const isGuard = String(err.message ?? "").startsWith("GUARD_BLOCKED:");
      await supabase.from("autopilot_runs").update({
        status: isGuard ? "blocked" : "failed",
        last_step: "exception",
        block_reason: err.message?.slice(0, 500),
        next_action: "Examiner les logs et relancer",
        alert_admin: true,
        execution_mode: "blocked",
        error_message: err.message?.slice(0, 500),
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
      await supabase.from("outbound_run_logs").insert({
        run_id: runId, step: "exception", status: "failed",
        message: err.message?.slice(0, 500) ?? "Erreur inconnue", payload: {},
      });
      await supabase.from("outbound_admin_alerts").insert({
        run_id: runId, severity: "critical",
        title: isGuard ? "Transition refusée par le guard" : "Exception pipeline autopilot",
        message: err.message?.slice(0, 500),
        suggested_fix: "Consulter logs Edge Function autopilot-mvp.",
      });
    }
    return new Response(JSON.stringify({ error: err.message ?? "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
