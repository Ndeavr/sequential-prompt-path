// ai-recommendation-audit — Public "Audit de recommandation IA" resolver.
//
// Entry point of the contractor acquisition funnel: a business NAME (or website
// / phone) is enough to obtain an evidence-labelled baseline built ONLY from
// data UNPRO already holds.
//
// Absolute rules:
//   - Nothing is ever invented. Every fact carries a provenance:
//     verified | declared | inferred | pending.
//   - Reviews, RBQ, insurance, demand, appointments, competitors are NEVER
//     fabricated. Missing => a gap, labelled "pending".
//   - Scarcity comes exclusively from public.market_capacity. No row => pending.
//
// Actions: search | audit | claim | event
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Provenance = "verified" | "declared" | "inferred" | "pending";
interface Fact {
  key: string;
  label: string;
  value: string;
  provenance: Provenance;
  source?: string;
}
interface Gap {
  key: string;
  label: string;
  why: string;
  impact: "high" | "medium" | "low";
}

const slug = (raw: unknown) =>
  String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Canonical company-name key: accent/punctuation free, legal suffixes removed. */
const nameKey = (raw: unknown) =>
  slug(raw)
    .replace(/-(inc|ltee|ltd|enr|senc|sencrl|srl|cie|co|corp|group|groupe|les|le|la)$/g, "")
    .replace(/^-|-$/g, "");

/** Canonical domain key from any URL-ish string. */
const domainKey = (raw: unknown) => {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0]
    .replace(/\.$/, "");
};

function push(facts: Fact[], f: Fact | null) {
  if (f && f.value) facts.push(f);
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ ok: false, reason: "server_misconfigured" }, 500);
  const db = createClient(url, key, { auth: { persistSession: false } });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: "invalid_body" }, 400);
  }
  const action = String(body.action ?? "search");

  try {
    /* ------------------------------------------------------------ HEALTH */
    // Real, non-destructive checks only. A system is "operational" solely when
    // the check actually ran and passed — never assumed.
    if (action === "health") {
      const checks: Record<string, { status: "operational" | "configured" | "unavailable"; detail: string }> = {};

      // Audit IA: real DB read on the audits table.
      const { error: auditErr } = await db.from("ai_recommendation_audits").select("id").limit(1);
      checks.audit_ia = auditErr
        ? { status: "unavailable", detail: "Lecture impossible" }
        : { status: "operational", detail: "Moteur d'audit en ligne" };

      // Capacity engine: real read on market_capacity.
      const { error: capErr } = await db.from("market_capacity").select("city_slug").limit(1);
      checks.capacity = capErr
        ? { status: "unavailable", detail: "Lecture impossible" }
        : { status: "operational", detail: "Capacité territoriale en ligne" };

      // AI attribution: real read on ai_agent_runs.
      const { error: agentErr } = await db.from("ai_agent_runs").select("id").limit(1);
      checks.attribution_ia = agentErr
        ? { status: "unavailable", detail: "Lecture impossible" }
        : { status: "operational", detail: "Journal d'attribution en ligne" };

      // Stripe / Twilio / Resend: configuration presence only (no paid calls).
      checks.stripe = Deno.env.get("STRIPE_SECRET_KEY")
        ? { status: "configured", detail: "Checkout configuré" }
        : { status: "unavailable", detail: "Clé Stripe absente" };
      checks.sms = Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN")
        ? { status: "configured", detail: "SMS configuré" }
        : { status: "unavailable", detail: "SMS non configuré" };
      checks.email = Deno.env.get("RESEND_API_KEY")
        ? { status: "configured", detail: "Courriel configuré" }
        : { status: "unavailable", detail: "Courriel non configuré" };

      return json({ ok: true, checked_at: new Date().toISOString(), checks });
    }

    /* ------------------------------------------------------------ SEARCH */
    if (action === "search") {
      const q = String(body.query ?? "").trim();
      if (q.length < 2) return json({ ok: true, candidates: [] });
      const like = `%${q}%`;

      const [{ data: contractors }, { data: prospects }] = await Promise.all([
        db
          .from("contractors")
          .select("id, business_name, legal_name, city, specialty, website, rbq_number")
          .or(`business_name.ilike.${like},legal_name.ilike.${like},normalized_website.ilike.${like},phone.ilike.${like}`)
          .limit(6),
        db
          .from("verified_contractor_prospects")
          .select("id, business_name, legal_name, city, category, website_url, rbq_number")
          .or(`business_name.ilike.${like},legal_name.ilike.${like},website_url.ilike.${like},phone_primary.ilike.${like}`)
          .limit(6),
      ]);

      const seen = new Set<string>();
      const candidates: Record<string, unknown>[] = [];
      for (const c of contractors ?? []) {
        const k = slug(c.business_name);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        candidates.push({
          kind: "contractor",
          id: c.id,
          business_name: c.business_name,
          city: c.city,
          trade: c.specialty,
          has_rbq: Boolean(c.rbq_number),
        });
      }
      for (const p of prospects ?? []) {
        const k = slug(p.business_name);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        candidates.push({
          kind: "prospect",
          id: p.id,
          business_name: p.business_name,
          city: p.city,
          trade: p.category,
          has_rbq: Boolean(p.rbq_number),
        });
      }
      return json({ ok: true, candidates: candidates.slice(0, 8) });
    }

    /* ------------------------------------------------------------- AUDIT */
    if (action === "audit") {
      const kind = String(body.kind ?? "");
      const id = String(body.id ?? "");
      const queryText = String(body.query ?? "").slice(0, 200);
      if (!["contractor", "prospect", "unknown"].includes(kind)) {
        return json({ ok: false, reason: "invalid_kind" }, 400);
      }

      const CONTRACTOR_COLS =
        "id, business_name, legal_name, city, specialty, website, normalized_website, phone, email, rbq_number, neq, rating, review_count, google_business_url, service_areas, verification_status, rbq_compliance_status, is_published, logo_url";
      const PROSPECT_COLS =
        "id, business_name, legal_name, city, region, category, website_url, google_business_url, phone_primary, email, rbq_number, service_areas, verification_status, data_quality_score";

      type Row = Record<string, any> | null;
      let contractor: Row = null;
      let prospect: Row = null;

      /* --------------------------- 1. Anchor record --------------------- */
      if (kind === "contractor" && id) {
        const { data } = await db.from("contractors").select(CONTRACTOR_COLS).eq("id", id).maybeSingle();
        contractor = data ?? null;
      } else if (kind === "prospect" && id) {
        const { data } = await db.from("verified_contractor_prospects").select(PROSPECT_COLS).eq("id", id).maybeSingle();
        prospect = data ?? null;
      }

      const rawQuery = String(body.business_name ?? "").slice(0, 160) || queryText;

      /* -------- 2. Name-based resolution when nothing was selected ------- */
      if (!contractor && !prospect && rawQuery.trim().length >= 2) {
        const like = `%${rawQuery.trim()}%`;
        const key = nameKey(rawQuery);
        const [{ data: cs }, { data: ps }] = await Promise.all([
          db.from("contractors").select(CONTRACTOR_COLS).or(`business_name.ilike.${like},legal_name.ilike.${like}`).limit(10),
          db
            .from("verified_contractor_prospects")
            .select(PROSPECT_COLS)
            .or(`business_name.ilike.${like},legal_name.ilike.${like}`)
            .limit(10),
        ]);
        const bestOf = (rows: any[] | null) => {
          if (!rows?.length) return null;
          return (
            rows.find((r) => nameKey(r.business_name) === key || nameKey(r.legal_name) === key) ??
            rows.find((r) => nameKey(r.business_name).startsWith(key) || key.startsWith(nameKey(r.business_name))) ??
            null
          );
        };
        contractor = bestOf(cs as any[]);
        prospect = bestOf(ps as any[]);
      }

      /* ------- 3. Cross-link the sibling record (same real company) ------ */
      const anchorName = nameKey(contractor?.business_name ?? prospect?.business_name);
      const anchorDomain = domainKey(
        contractor?.normalized_website ?? contractor?.website ?? prospect?.website_url
      );

      if (contractor && !prospect && (anchorName || anchorDomain)) {
        const filters: string[] = [];
        if (contractor.business_name) filters.push(`business_name.ilike.%${String(contractor.business_name).slice(0, 60)}%`);
        if (anchorDomain) filters.push(`website_url.ilike.%${anchorDomain}%`);
        if (filters.length) {
          const { data } = await db.from("verified_contractor_prospects").select(PROSPECT_COLS).or(filters.join(",")).limit(5);
          prospect =
            (data as any[])?.find(
              (p) => nameKey(p.business_name) === anchorName || (anchorDomain && domainKey(p.website_url) === anchorDomain)
            ) ?? null;
        }
      }
      if (prospect && !contractor && (anchorName || anchorDomain)) {
        const filters: string[] = [];
        if (prospect.business_name) filters.push(`business_name.ilike.%${String(prospect.business_name).slice(0, 60)}%`);
        if (anchorDomain) filters.push(`normalized_website.ilike.%${anchorDomain}%`);
        if (filters.length) {
          const { data } = await db.from("contractors").select(CONTRACTOR_COLS).or(filters.join(",")).limit(5);
          contractor =
            (data as any[])?.find(
              (c) =>
                nameKey(c.business_name) === anchorName ||
                (anchorDomain && domainKey(c.normalized_website ?? c.website) === anchorDomain)
            ) ?? null;
        }
      }

      if (kind !== "unknown" && id && !contractor && !prospect) {
        return json({ ok: false, reason: "not_found" }, 404);
      }

      /* --------------------- 4. Canonical merged entity ------------------ */
      const first = <T,>(...vals: (T | null | undefined)[]) => vals.find((v) => v !== null && v !== undefined && v !== "") ?? null;
      const contractorId: string | null = contractor?.id ?? null;
      const prospectId: string | null = prospect?.id ?? null;

      const businessName: string | null =
        first<string>(contractor?.business_name, prospect?.business_name) ?? (rawQuery.trim() || null);
      const legalName = first<string>(contractor?.legal_name, prospect?.legal_name);
      const trade = first<string>(contractor?.specialty, prospect?.category);
      const city = first<string>(contractor?.city, prospect?.city, String(body.city ?? "").slice(0, 120) || null);
      const region = first<string>(prospect?.region);
      const areas = Array.from(
        new Set([...(contractor?.service_areas ?? []), ...(prospect?.service_areas ?? [])].filter(Boolean).map(String))
      );
      const website = first<string>(contractor?.website, contractor?.normalized_website, prospect?.website_url);
      const gmb = first<string>(contractor?.google_business_url, prospect?.google_business_url);
      const phone = first<string>(contractor?.phone, prospect?.phone_primary);
      const email = first<string>(contractor?.email, prospect?.email);
      const rbq = first<string>(contractor?.rbq_number, prospect?.rbq_number);
      const neq = first<string>(contractor?.neq);
      const reviewCount = Number(contractor?.review_count ?? 0);
      const rating = contractor?.rating ?? null;

      const rbqVerified = contractor?.rbq_compliance_status === "verified";
      const officialProspect = Boolean(prospect);

      const facts: Fact[] = [];
      push(facts, legalName ? { key: "legal_name", label: "Nom légal", value: legalName, provenance: "verified", source: "Registre" } : null);
      push(
        facts,
        businessName
          ? {
              key: "business_name",
              label: "Entreprise",
              value: businessName,
              provenance: officialProspect && nameKey(prospect?.business_name) === nameKey(businessName) ? "verified" : "declared",
              source: officialProspect && nameKey(prospect?.business_name) === nameKey(businessName) ? "Source officielle" : undefined,
            }
          : null
      );
      push(
        facts,
        trade
          ? {
              key: "trade",
              label: "Spécialité",
              value: trade,
              provenance: contractor?.specialty ? "declared" : "inferred",
              source: contractor?.specialty ? undefined : "Classification UNPRO",
            }
          : null
      );
      push(
        facts,
        city
          ? {
              key: "city",
              label: "Territoire principal",
              value: city,
              provenance: prospect?.city === city ? "verified" : "declared",
              source: prospect?.city === city ? "Source officielle" : undefined,
            }
          : null
      );
      push(facts, region ? { key: "region", label: "Région", value: region, provenance: "inferred" } : null);
      {
        const other = [contractor?.city, prospect?.city].filter(Boolean).map(String).find((v) => v !== city);
        push(other ? facts : facts, other ? { key: "city_alt", label: "Autre ville détectée", value: other, provenance: "inferred", source: "Fiches UNPRO" } : null);
      }
      push(facts, areas.length ? { key: "areas", label: "Zones desservies", value: areas.slice(0, 4).join(", "), provenance: "declared" } : null);
      push(facts, rbq ? { key: "rbq", label: "Licence RBQ", value: rbq, provenance: rbqVerified ? "verified" : "declared", source: "RBQ" } : null);
      push(facts, neq ? { key: "neq", label: "NEQ", value: neq, provenance: "verified", source: "Registraire des entreprises" } : null);
      push(
        facts,
        website
          ? { key: "website", label: "Site web", value: domainKey(website), provenance: "verified", source: "Site officiel" }
          : null
      );
      push(facts, gmb ? { key: "gmb", label: "Fiche Google", value: "Détectée", provenance: "verified", source: "Google" } : null);
      push(
        facts,
        phone
          ? {
              key: "phone",
              label: "Téléphone",
              value: String(phone),
              provenance: prospect?.phone_primary === phone ? "verified" : "declared",
              source: prospect?.phone_primary === phone ? "Source officielle" : undefined,
            }
          : null
      );
      push(facts, email ? { key: "email", label: "Courriel", value: String(email), provenance: "declared" } : null);
      if (reviewCount > 0) {
        push(facts, {
          key: "reviews",
          label: "Avis publics",
          value: `${reviewCount} avis${rating ? ` · ${rating}/5` : ""}`,
          provenance: "verified",
          source: "Google",
        });
      }

      const reviewNote = reviewCount > 0 ? null : "Aucun avis vérifié par UNPRO pour le moment.";

      /* ------------- 5. Missions: confirmed / detected / missing --------- */
      type MissionStatus = "confirmed" | "detected" | "missing";
      interface Mission {
        key: string;
        label: string;
        status: MissionStatus;
        points: number;
        earned: number;
        impact: "high" | "medium" | "low";
        detected_value: string | null;
        why: string;
        unlocks: string;
        cta: string;
      }

      const mk = (
        key: string,
        label: string,
        points: number,
        impact: "high" | "medium" | "low",
        confirmed: boolean,
        detectedValue: string | null,
        why: string,
        unlocks: string
      ): Mission => {
        const status: MissionStatus = confirmed ? "confirmed" : detectedValue ? "detected" : "missing";
        return {
          key,
          label,
          status,
          points,
          earned: status === "confirmed" ? points : status === "detected" ? Math.round(points * 0.6) : 0,
          impact,
          detected_value: detectedValue,
          why,
          unlocks,
          cta: status === "confirmed" ? "Confirmé" : status === "detected" ? "Confirmer en 1 clic" : "Compléter",
        };
      };

      const missions: Mission[] = [
        mk("identity", "Identité d'entreprise", 10, "high", Boolean(legalName || officialProspect), businessName,
          "Sans identité confirmée, aucune IA ne peut vous nommer.", "Votre nom devient citable par l'IA"),
        mk("trade", "Spécialité principale", 15, "high", Boolean(contractor?.specialty), trade,
          "L'IA doit savoir exactement ce que vous faites.", "Éligible aux recommandations de votre métier"),
        mk("territory", "Territoire desservi", 15, "high", areas.length > 0, city ?? (areas[0] ?? null),
          "Sans territoire confirmé, aucune recommandation locale.", "+ visibilité locale"),
        mk("contact", "Canal de rendez-vous", 20, "high", Boolean(contractor?.phone || contractor?.email), phone ?? email,
          "Un rendez-vous exclusif exige un canal joignable.", "Rendez-vous activables"),
        mk("website", "Source officielle en ligne", 15, "medium", Boolean(website), website ? domainKey(website) : null,
          "Une source vérifiable confirme vos informations.", "Vos données deviennent vérifiables"),
        mk("rbq", "Licence RBQ", 15, "high", rbqVerified, rbq,
          "Signal de confiance exigé avant toute recommandation.", "Badge de conformité"),
        mk("reviews", "Avis publics vérifiés", 10, "medium", reviewCount > 0, gmb ? "Fiche Google détectée" : null,
          "UNPRO n'invente aucun avis.", "Bonus confiance"),
      ];

      const score = Math.min(100, missions.reduce((s, m) => s + m.earned, 0));
      const remainingSteps = missions.filter((m) => m.status !== "confirmed").length;
      const level =
        score >= 85 ? "Recommandable" : score >= 60 ? "Presque recommandable" : score >= 35 ? "Partiellement visible" : "Invisible pour l'IA";

      // Legacy-compatible payloads
      const checks = missions.map((m) => ({ key: m.key, label: m.label, ok: m.status === "confirmed" }));
      const gaps: Gap[] = missions
        .filter((m) => m.status !== "confirmed")
        .map((m) => ({ key: m.key, label: m.label, why: m.why, impact: m.impact }));

      const recommendable =
        Boolean(businessName) && Boolean(trade) && Boolean(city || areas.length) && Boolean(phone || email) && Boolean(rbq || website);

      /* -------------------- 6. Real capacity (never fabricated) ---------- */
      let capacity: Record<string, unknown> = {
        status: "needs_confirmation",
        label: "Confirmez votre territoire et votre spécialité pour voir les places disponibles.",
      };
      if (city && trade) {
        const { data: cap } = await db
          .from("market_capacity")
          .select("city, specialty, max_contractors, active_contractors, remaining_positions, capacity_status, market_open")
          .eq("city_slug", slug(city))
          .eq("service_slug", slug(trade))
          .maybeSingle();
        if (cap && cap.max_contractors != null && cap.active_contractors != null) {
          const remaining = cap.remaining_positions ?? Math.max(0, Number(cap.max_contractors) - Number(cap.active_contractors));
          capacity = {
            status: "verified",
            city: cap.city,
            trade: cap.specialty,
            max: cap.max_contractors,
            active: cap.active_contractors,
            remaining,
            market_open: cap.market_open !== false,
          };
        } else {
          capacity = {
            status: "not_tracked",
            city,
            trade,
            label: `Aucune limite de place publiée pour ${trade} à ${city}.`,
          };
        }
      }

      const baseline = {
        facts,
        checks,
        missions,
        level,
        remaining_steps: remainingSteps,
        recommendable,
        review_note: reviewNote,
        matched: {
          contractor_id: contractorId,
          prospect_id: prospectId,
          merged_sources: [contractorId ? "contractor" : null, prospectId ? "official_prospect" : null].filter(Boolean),
        },
      };

      const { data: audit, error } = await db
        .from("ai_recommendation_audits")
        .insert({
          query_text: queryText || businessName,
          source: String(body.source ?? "public_audit").slice(0, 60),
          utm: (body.utm as Record<string, unknown>) ?? {},
          contractor_id: contractorId,
          prospect_id: prospectId,
          business_name: businessName,
          city,
          trade,
          readiness_score: score,
          baseline,
          gaps,
          capacity,
          status: "completed",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select("id, session_token")
        .single();
      if (error) return json({ ok: false, reason: "audit_write_failed" }, 500);

      await db.from("ai_recommendation_audit_events").insert([
        { audit_id: audit.id, event_type: "audit_started", metadata: { query: queryText, kind } },
        { audit_id: audit.id, event_type: "audit_completed", metadata: { score, gaps: gaps.length } },
      ]);

      return json({
        ok: true,
        audit_id: audit.id,
        token: audit.session_token,
        generated_at: new Date().toISOString(),
        business_name: businessName,
        city,
        trade,
        readiness_score: score,
        baseline,
        gaps,
        capacity,
      });
    }


    /* ------------------------------------------------------------- CLAIM */
    if (action === "claim") {
      const auditId = String(body.audit_id ?? "");
      const token = String(body.token ?? "");
      const contact = (body.contact as Record<string, unknown>) ?? {};
      if (!auditId || !token) return json({ ok: false, reason: "missing_audit" }, 400);

      const { data: audit } = await db
        .from("ai_recommendation_audits")
        .select("id, session_token, claimed_contact")
        .eq("id", auditId)
        .maybeSingle();
      if (!audit || audit.session_token !== token) return json({ ok: false, reason: "invalid_token" }, 403);

      const merged = { ...((audit.claimed_contact as Record<string, unknown>) ?? {}), ...contact };
      await db
        .from("ai_recommendation_audits")
        .update({ claimed_contact: merged, claimed_at: new Date().toISOString(), status: "claimed" })
        .eq("id", auditId);
      await db.from("ai_recommendation_audit_events").insert({
        audit_id: auditId,
        event_type: "profile_claimed",
        metadata: { fields: Object.keys(contact) },
      });
      return json({ ok: true });
    }

    /* ------------------------------------------------------------- EVENT */
    if (action === "event") {
      const auditId = String(body.audit_id ?? "");
      const token = String(body.token ?? "");
      const type = String(body.event_type ?? "");
      const allowed = new Set([
        "activation_started",
        "checkout_created",
        "audit_abandoned",
        "eligible_or_existing_business",
        "claim_started",
        "profile_completed",
        "recommendation_eligible",
      ]);
      if (!auditId || !token || !allowed.has(type)) return json({ ok: false, reason: "invalid_event" }, 400);

      const { data: audit } = await db
        .from("ai_recommendation_audits")
        .select("id, session_token")
        .eq("id", auditId)
        .maybeSingle();
      if (!audit || audit.session_token !== token) return json({ ok: false, reason: "invalid_token" }, 403);

      await db.from("ai_recommendation_audit_events").insert({
        audit_id: auditId,
        event_type: type,
        metadata: (body.metadata as Record<string, unknown>) ?? {},
      });
      if (type === "activation_started") {
        await db
          .from("ai_recommendation_audits")
          .update({ activation_started_at: new Date().toISOString(), status: "activation_started" })
          .eq("id", auditId);
      }
      if (type === "checkout_created") {
        await db
          .from("ai_recommendation_audits")
          .update({ checkout_created_at: new Date().toISOString(), status: "checkout_created" })
          .eq("id", auditId);
      }
      return json({ ok: true });
    }

    return json({ ok: false, reason: "unknown_action" }, 400);
  } catch (e) {
    console.error("[AI_RECOMMENDATION_AUDIT_ERROR]", e);
    return json({ ok: false, reason: "internal_error" }, 500);
  }
});
