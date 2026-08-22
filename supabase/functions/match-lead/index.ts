// PROTECTED FILE — Homeowner → Contractor matcher.
// Reads real UNPRO schema: contractors + contractor_service_areas + contractor_category_assignments.
// Filters to recommendation-eligible pros only, then ranks.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadRow {
  id: string;
  lead_type: "contractor" | "broker";
  city: string | null;
  project_category: string | null;
  specialty_needed: string | null;
  budget_min: number | null;
  budget_max: number | null;
  language: string | null;
}

interface ContractorRow {
  id: string;
  business_name: string | null;
  city: string | null;
  aipp_score: number | null;
  rating: number | null;
  review_count: number | null;
  years_experience: number | null;
  verification_status: string | null;
  languages_spoken: string[] | null;
}

function normCity(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function scoreContractor(
  c: ContractorRow,
  servesCity: boolean,
  matchesCategory: boolean,
  lead: LeadRow,
) {
  let score = 0;
  const reasons: string[] = [];

  if (servesCity) {
    score += 25;
    reasons.push("Dessert la zone");
  }
  if (matchesCategory) {
    score += 25;
    reasons.push("Catégorie exacte");
  }

  const aipp = c.aipp_score ?? 0;
  if (aipp > 0) {
    score += Math.round(aipp * 0.2); // up to +20
    reasons.push(`Score AIPP ${aipp}`);
  }

  const rating = c.rating ?? 0;
  const rc = c.review_count ?? 0;
  if (rating > 0 && rc > 0) {
    score += Math.min(Math.round(rating * 2), 10);
    reasons.push(`${rating.toFixed(1)}★ (${rc} avis)`);
  }

  const exp = c.years_experience ?? 0;
  if (exp > 0) {
    score += Math.min(exp, 10);
    reasons.push(`${exp} ans d'expérience`);
  }

  if (c.verification_status === "verified") {
    score += 5;
    reasons.push("Vérifié");
  }

  if (
    lead.language &&
    Array.isArray(c.languages_spoken) &&
    c.languages_spoken.map((l) => l.toLowerCase()).includes(lead.language.toLowerCase())
  ) {
    score += 5;
    reasons.push("Même langue");
  }

  return {
    id: c.id,
    business_name: c.business_name,
    plan: null,
    score: Math.min(score, 100),
    reasons,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await (supabaseAuth.auth as any).getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typedLead = lead as unknown as LeadRow;

    // ── Broker path (unchanged legacy) ─────────────────────────────────
    if (typedLead.lead_type === "broker") {
      const { data: brokers } = await supabase
        .from("broker_profiles")
        .select("id, city, service_areas, specialties, languages, years_experience");

      const scoredBrokers = (brokers ?? [])
        .map((b: any) => {
          let s = 0;
          const reasons: string[] = [];
          const areas = (b.service_areas as string[]) || [];
          const specs = (b.specialties as string[]) || [];
          if (
            typedLead.city &&
            (areas.map(normCity).includes(normCity(typedLead.city)) ||
              normCity(b.city) === normCity(typedLead.city))
          ) {
            s += 25;
            reasons.push("Dessert la zone");
          }
          if (typedLead.project_category && specs.includes(typedLead.project_category)) {
            s += 20;
            reasons.push("Spécialité correspondante");
          }
          return { id: b.id as string, score: s, reasons };
        })
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (scoredBrokers.length > 0) {
        const rows = scoredBrokers.map((m, i) => ({
          lead_id: leadId,
          match_type: "broker",
          broker_id: m.id,
          score: m.score,
          rank_position: i + 1,
          reasons: m.reasons,
          status: i === 0 ? "primary" : "suggested",
          response_status: "pending",
        }));
        const { data: inserted } = await supabase.from("matches").insert(rows).select("id, rank_position");
        const primaryId = inserted?.find((m: any) => m.rank_position === 1)?.id ?? null;
        await supabase
          .from("leads")
          .update({ status: "matched", matching_status: "matched", assigned_match_id: primaryId })
          .eq("id", leadId);
      } else {
        await supabase
          .from("leads")
          .update({ status: "no_match", matching_status: "empty" })
          .eq("id", leadId);
      }

      return new Response(
        JSON.stringify({ ok: true, matches_count: scoredBrokers.length, matches: scoredBrokers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Contractor path (real schema) ──────────────────────────────────
    // 1. Pull recommendation-eligible contractors only.
    const { data: contractors } = await supabase
      .from("contractors")
      .select(
        "id, business_name, city, aipp_score, rating, review_count, years_experience, verification_status, languages_spoken",
      )
      .eq("account_status", "active")
      .eq("booking_enabled", true)
      .eq("is_accepting_appointments", true)
      .in("verification_status", ["verified", "pending"]);

    const contractorIds = (contractors ?? []).map((c: any) => c.id);
    if (contractorIds.length === 0) {
      await supabase
        .from("leads")
        .update({ status: "no_match", matching_status: "empty" })
        .eq("id", leadId);
      return new Response(
        JSON.stringify({ ok: true, matches_count: 0, matches: [], reason: "no_eligible_pool" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Load service areas + category assignments + compatibility rules in parallel.
    const [{ data: areas }, { data: cats }, { data: catRow }, { data: compatRules }] = await Promise.all([
      supabase
        .from("contractor_service_areas")
        .select("contractor_id, city_name")
        .in("contractor_id", contractorIds),
      supabase
        .from("contractor_category_assignments")
        .select("contractor_id, category_id, service_categories!inner(slug)")
        .in("contractor_id", contractorIds),
      typedLead.project_category
        ? supabase
            .from("service_categories")
            .select("id, slug")
            .eq("slug", typedLead.project_category)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase
        .from("contractor_matching_rules")
        .select("contractor_id, rule_type, rule_key, payload, source, confirmed_by_contractor")
        .in("contractor_id", contractorIds)
        .eq("is_active", true),
    ]);

    // Profil de compatibilité → règles appliquées au classement.
    // Les règles `inferred` n'excluent JAMAIS : elles modulent seulement le score.
    interface CompatRules {
      excludedServices: Set<string>;
      priorityServices: Set<string>;
      blockedCities: Set<string>;
      priorityCities: Set<string>;
      cityMin: Map<string, number>;
      floorCents: number | null;
      paused: boolean;
      softHits: number;
    }
    const rulesByContractor = new Map<string, CompatRules>();
    for (const r of (compatRules ?? []) as any[]) {
      const key = r.contractor_id as string;
      if (!rulesByContractor.has(key)) {
        rulesByContractor.set(key, {
          excludedServices: new Set(),
          priorityServices: new Set(),
          blockedCities: new Set(),
          priorityCities: new Set(),
          cityMin: new Map(),
          floorCents: null,
          paused: false,
          softHits: 0,
        });
      }
      const bucket = rulesByContractor.get(key)!;
      const hard = r.source !== "inferred" && r.confirmed_by_contractor === true;
      const p = (r.payload ?? {}) as any;
      if (r.rule_type === "hard_exclusion" && hard) {
        if (p.service_slug) bucket.excludedServices.add(String(p.service_slug));
        if (p.city_slug) bucket.blockedCities.add(normCity(String(p.city_slug)));
      } else if (r.rule_type === "priority") {
        if (p.service_slug) bucket.priorityServices.add(String(p.service_slug));
        if (p.city_slug) bucket.priorityCities.add(normCity(String(p.city_slug)));
      } else if (r.rule_type === "soft_preference") {
        bucket.softHits += 1;
        if (p.city_slug && typeof p.min_project_cents === "number") {
          bucket.cityMin.set(normCity(String(p.city_slug)), p.min_project_cents);
        }
        if (r.rule_key === "floor_project" && typeof p.min_project_cents === "number") {
          bucket.floorCents = p.min_project_cents;
        }
      } else if (r.rule_type === "capacity" && hard) {
        bucket.paused = p.paused === true;
      }
    }

    const areasByContractor = new Map<string, Set<string>>();
    (areas ?? []).forEach((a: any) => {
      const key = a.contractor_id as string;
      if (!areasByContractor.has(key)) areasByContractor.set(key, new Set());
      areasByContractor.get(key)!.add(normCity(a.city_name));
    });

    const catsByContractor = new Map<string, Set<string>>();
    (cats ?? []).forEach((c: any) => {
      const key = c.contractor_id as string;
      if (!catsByContractor.has(key)) catsByContractor.set(key, new Set());
      const slug = (c.service_categories?.slug as string) ?? "";
      if (slug) catsByContractor.get(key)!.add(slug);
    });

    const leadCitySlug = normCity(typedLead.city);
    const targetCategorySlug = (catRow as any)?.data?.slug ?? typedLead.project_category ?? null;
    // NOTE: supabase-js may not unwrap `.maybeSingle()` into `.data.data`; handle both shapes.
    const wantedCat =
      (catRow as any)?.slug ?? (catRow as any)?.data?.slug ?? typedLead.project_category ?? null;

    const scored = (contractors ?? [])
      .map((c: any) => {
        const areaSet = areasByContractor.get(c.id) ?? new Set<string>();
        const servesCity =
          !!leadCitySlug &&
          (areaSet.has(leadCitySlug) || normCity(c.city) === leadCitySlug);
        const catSet = catsByContractor.get(c.id) ?? new Set<string>();
        const matchesCategory = !!wantedCat && catSet.has(wantedCat);
        const base = scoreContractor(c as ContractorRow, servesCity, matchesCategory, typedLead);

        // ── Profil de compatibilité ───────────────────────────────────
        const compat = rulesByContractor.get(c.id);
        if (!compat) return base;

        const wanted = wantedCat ?? typedLead.specialty_needed ?? null;
        const budget = typedLead.budget_max ?? typedLead.budget_min ?? null;
        const budgetCents = budget != null ? Math.round(Number(budget) * 100) : null;

        if (compat.paused) return { ...base, score: 0, reasons: [...base.reasons, "Agenda en pause"] };
        if (wanted && compat.excludedServices.has(wanted)) {
          return { ...base, score: 0, reasons: [...base.reasons, "Service non recherché"] };
        }
        if (leadCitySlug && compat.blockedCities.has(leadCitySlug)) {
          return { ...base, score: 0, reasons: [...base.reasons, "Territoire exclu"] };
        }

        let score = base.score;
        const reasons = [...base.reasons];
        if (wanted && compat.priorityServices.has(wanted)) {
          score += 15;
          reasons.push("Service prioritaire");
        }
        if (leadCitySlug && compat.priorityCities.has(leadCitySlug)) {
          score += 10;
          reasons.push("Territoire prioritaire");
        }
        const cityMin = leadCitySlug ? compat.cityMin.get(leadCitySlug) ?? null : null;
        const minRequired = Math.max(cityMin ?? 0, compat.floorCents ?? 0) || null;
        if (minRequired && budgetCents != null && budgetCents < minRequired) {
          score -= 25;
          reasons.push("Sous le minimum de projet déclaré");
        }
        return { ...base, score: Math.max(0, Math.min(score, 100)), reasons };
      })
      // require at least city OR category to qualify
      .filter((m) => m.score >= 25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length > 0) {
      const matchRows = scored.map((m, i) => ({
        lead_id: leadId,
        match_type: "contractor",
        contractor_id: m.id,
        broker_id: null,
        score: m.score,
        rank_position: i + 1,
        reasons: m.reasons,
        status: i === 0 ? "primary" : "suggested",
        response_status: "pending",
      }));

      const { data: insertedMatches } = await supabase
        .from("matches")
        .insert(matchRows)
        .select("id, rank_position");

      const primaryMatchId =
        insertedMatches?.find((m: any) => m.rank_position === 1)?.id ?? null;

      await supabase
        .from("leads")
        .update({
          status: "matched",
          matching_status: "matched",
          assigned_match_id: primaryMatchId,
          assigned_contractor_id: scored[0].id,
          last_matched_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else {
      await supabase
        .from("leads")
        .update({ status: "no_match", matching_status: "empty" })
        .eq("id", leadId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        matches_count: scored.length,
        matches: scored,
        eligible_pool: contractorIds.length,
        target_city: typedLead.city,
        target_category: targetCategorySlug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
