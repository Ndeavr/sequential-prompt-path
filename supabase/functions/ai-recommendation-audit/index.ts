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

      const facts: Fact[] = [];
      const gaps: Gap[] = [];
      let businessName = String(body.business_name ?? "").slice(0, 160) || null;
      let city: string | null = null;
      let trade: string | null = null;
      let contractorId: string | null = null;
      let prospectId: string | null = null;
      let hasRbq = false;
      let hasWebsite = false;
      let hasReviews = false;
      let hasTerritory = false;
      let hasTrade = false;
      let hasContact = false;
      let hasIdentity = false;
      let reviewNote: string | null = null;

      if (kind === "contractor" && id) {
        const { data: c } = await db
          .from("contractors")
          .select(
            "id, business_name, legal_name, city, specialty, website, phone, email, rbq_number, neq, rating, review_count, google_business_url, service_areas, verification_status, rbq_compliance_status, is_published, logo_url"
          )
          .eq("id", id)
          .maybeSingle();
        if (!c) return json({ ok: false, reason: "not_found" }, 404);
        contractorId = c.id;
        businessName = c.business_name ?? businessName;
        city = c.city ?? null;
        trade = c.specialty ?? null;
        hasIdentity = Boolean(c.business_name);
        hasRbq = Boolean(c.rbq_number);
        hasWebsite = Boolean(c.website);
        hasTrade = Boolean(c.specialty);
        hasTerritory = Boolean(c.city || (c.service_areas ?? []).length);
        hasContact = Boolean(c.phone || c.email);
        hasReviews = Boolean(c.review_count && Number(c.review_count) > 0);

        push(facts, c.legal_name ? { key: "legal_name", label: "Nom légal", value: c.legal_name, provenance: "verified", source: "Registre" } : null);
        push(facts, c.business_name ? { key: "business_name", label: "Entreprise", value: c.business_name, provenance: "declared" } : null);
        push(facts, c.specialty ? { key: "trade", label: "Spécialité", value: c.specialty, provenance: "declared" } : null);
        push(facts, c.city ? { key: "city", label: "Territoire principal", value: c.city, provenance: "declared" } : null);
        push(facts, (c.service_areas ?? []).length ? { key: "areas", label: "Zones desservies", value: (c.service_areas as string[]).slice(0, 4).join(", "), provenance: "declared" } : null);
        push(facts, c.rbq_number ? { key: "rbq", label: "Licence RBQ", value: c.rbq_number, provenance: c.rbq_compliance_status === "verified" ? "verified" : "declared", source: "RBQ" } : null);
        push(facts, c.neq ? { key: "neq", label: "NEQ", value: c.neq, provenance: "verified", source: "Registraire des entreprises" } : null);
        push(facts, c.website ? { key: "website", label: "Site web", value: String(c.website).replace(/^https?:\/\//, ""), provenance: "verified", source: "Site officiel" } : null);
        push(facts, c.google_business_url ? { key: "gmb", label: "Fiche Google", value: "Détectée", provenance: "verified", source: "Google" } : null);
        if (hasReviews) {
          push(facts, { key: "reviews", label: "Avis publics", value: `${c.review_count} avis${c.rating ? ` · ${c.rating}/5` : ""}`, provenance: "verified", source: "Google" });
        }
      } else if (kind === "prospect" && id) {
        const { data: p } = await db
          .from("verified_contractor_prospects")
          .select(
            "id, business_name, legal_name, city, region, category, website_url, google_business_url, phone_primary, email, rbq_number, service_areas, verification_status, data_quality_score"
          )
          .eq("id", id)
          .maybeSingle();
        if (!p) return json({ ok: false, reason: "not_found" }, 404);
        prospectId = p.id;
        businessName = p.business_name ?? businessName;
        city = p.city ?? null;
        trade = p.category ?? null;
        hasIdentity = Boolean(p.business_name);
        hasRbq = Boolean(p.rbq_number);
        hasWebsite = Boolean(p.website_url);
        hasTrade = Boolean(p.category);
        hasTerritory = Boolean(p.city || (p.service_areas ?? []).length);
        hasContact = Boolean(p.phone_primary || p.email);

        push(facts, p.legal_name ? { key: "legal_name", label: "Nom légal", value: p.legal_name, provenance: "verified", source: "Registre" } : null);
        push(facts, p.business_name ? { key: "business_name", label: "Entreprise", value: p.business_name, provenance: "verified", source: "Source officielle" } : null);
        push(facts, p.category ? { key: "trade", label: "Spécialité détectée", value: p.category, provenance: "inferred", source: "Classification UNPRO" } : null);
        push(facts, p.city ? { key: "city", label: "Territoire principal", value: p.city, provenance: "verified", source: "Source officielle" } : null);
        push(facts, p.region ? { key: "region", label: "Région", value: p.region, provenance: "inferred" } : null);
        push(facts, p.rbq_number ? { key: "rbq", label: "Licence RBQ", value: p.rbq_number, provenance: "verified", source: "RBQ" } : null);
        push(facts, p.website_url ? { key: "website", label: "Site web", value: String(p.website_url).replace(/^https?:\/\//, ""), provenance: "verified", source: "Site officiel" } : null);
        push(facts, p.google_business_url ? { key: "gmb", label: "Fiche Google", value: "Détectée", provenance: "verified", source: "Google" } : null);
        reviewNote = "Aucun avis vérifié par UNPRO pour le moment.";
      } else {
        // Unknown company — UNPRO holds nothing yet. Honest empty baseline.
        hasIdentity = Boolean(businessName);
        city = (String(body.city ?? "").slice(0, 120) || null) as string | null;
        push(facts, businessName ? { key: "business_name", label: "Entreprise", value: businessName, provenance: "declared" } : null);
        push(facts, city ? { key: "city", label: "Territoire déclaré", value: city, provenance: "declared" } : null);
      }

      /* ------- Recommendation gaps: what blocks an AI recommendation ----- */
      const addGap = (ok: boolean, g: Gap) => { if (!ok) gaps.push(g); };
      addGap(hasIdentity, { key: "identity", label: "Identité d'entreprise confirmée", why: "Sans identité confirmée, aucune IA ne peut vous nommer.", impact: "high" });
      addGap(hasTrade, { key: "trade", label: "Spécialité principale", why: "L'IA doit savoir ce que vous faites exactement pour vous recommander.", impact: "high" });
      addGap(hasTerritory, { key: "territory", label: "Territoire desservi", why: "Sans territoire, vous n'apparaissez dans aucune recommandation locale.", impact: "high" });
      addGap(hasRbq, { key: "rbq", label: "Licence RBQ confirmée", why: "Signal de confiance exigé avant toute recommandation.", impact: "high" });
      addGap(hasWebsite, { key: "website", label: "Source officielle en ligne", why: "Sans source vérifiable, vos informations restent non confirmées.", impact: "medium" });
      addGap(hasReviews, { key: "reviews", label: "Avis publics vérifiés", why: "UNPRO n'invente aucun avis : sans avis vérifiés, la confiance reste incomplète.", impact: "medium" });
      addGap(hasContact, { key: "contact", label: "Canal de rendez-vous", why: "Un rendez-vous exclusif exige un canal joignable et confirmé.", impact: "high" });

      const checks = [
        { key: "identity", label: "Identité confirmée", ok: hasIdentity },
        { key: "trade", label: "Spécialité claire", ok: hasTrade },
        { key: "territory", label: "Territoire défini", ok: hasTerritory },
        { key: "rbq", label: "Licence RBQ", ok: hasRbq },
        { key: "website", label: "Source officielle", ok: hasWebsite },
        { key: "reviews", label: "Avis vérifiés", ok: hasReviews },
        { key: "contact", label: "Canal de rendez-vous", ok: hasContact },
      ];
      const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
      const recommendable = hasIdentity && hasTrade && hasTerritory && hasContact && (hasRbq || hasWebsite);

      /* -------------------- Real capacity (never fabricated) ------------- */
      let capacity: Record<string, unknown> = { status: "pending", label: "Capacité en cours d'analyse" };
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
        }
      }

      const baseline = { facts, checks, recommendable, review_note: reviewNote };

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
      const allowed = new Set(["activation_started", "checkout_created", "audit_abandoned"]);
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
