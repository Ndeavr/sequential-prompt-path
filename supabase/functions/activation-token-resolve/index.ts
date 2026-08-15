// activation-token-resolve — Public resolver for /unpro/activate/:token
//
// Resolves an outreach activation token into a RICH, PRE-BUILT company profile
// assembled ONLY from data UNPRO already holds. Every field carries an explicit
// provenance: "verified" | "declared" | "inferred". Nothing is ever invented —
// a missing field is simply absent so the UI can degrade elegantly.
//
// Also records the canonical funnel events (landing_viewed, profile_viewed,
// landing_engaged, checkout_cta_clicked, correction_requested) into the real
// engagement store via public.record_engagement_event.
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

type Provenance = "verified" | "declared" | "inferred";
interface Fact {
  key: string;
  label: string;
  value: string;
  provenance: Provenance;
  source?: string;
}

const TRACKABLE = new Set([
  "landing_viewed",
  "landing_engaged",
  "profile_viewed",
  "profile_section_expanded",
  "correction_requested",
  "checkout_cta_clicked",
  "checkout_cta_failed",
]);

/** Deterministic variant bucket so the same prospect always sees the same page. */
function bucket(id: string, variants: string[]): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return variants[h % variants.length];
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String((body as { token?: string })?.token ?? "").trim();
    const trackEvent = String((body as { event?: string })?.event ?? "").trim();
    const meta = ((body as { meta?: Record<string, unknown> })?.meta ?? {}) as Record<string, unknown>;

    if (!token || token.length > 128) {
      return json({ ok: false, reason: "invalid_token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---------------------------------------------------------------- tracking
    if (trackEvent) {
      if (!TRACKABLE.has(trackEvent)) return json({ ok: false, reason: "unsupported_event" }, 400);
      try {
        const { data: tk } = await supabase
          .from("verified_prospect_tokens")
          .select("prospect_id")
          .eq("token", token)
          .maybeSingle();
        await supabase.rpc("record_engagement_event", {
          _event_type: trackEvent,
          _channel: "web",
          _status: trackEvent,
          _provider: "app",
          _tracking_id: token,
          _prospect_id: tk?.prospect_id ?? null,
          _source_table: "verified_prospect_tokens",
          _source_row_id: token,
          _metadata: { surface: "unpro_activate", ...meta },
          // One event of each kind per token — no double counting.
          _idempotency_key: `${trackEvent}:${token}`,
        });
      } catch (e) {
        console.error("[activation-token-resolve] track_failed", String(e));
      }
      return json({ ok: true, tracked: trackEvent });
    }

    // ---------------------------------------------------------------- resolve
    const cols = "token, prospect_id, created_at, clicked_at, click_count, campaign_id";
    const { data: row, error } = await supabase
      .from("verified_prospect_tokens")
      .select(cols)
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("[activation-token-resolve] token_lookup_failed", error.message);
      return json({ ok: false, reason: "lookup_failed" }, 500);
    }

    // Messaging apps sometimes truncate the link — unambiguous prefix fallback.
    let resolved = row;
    if (!resolved && token.length >= 10) {
      const { data: candidates, error: prefixError } = await supabase
        .from("verified_prospect_tokens")
        .select(cols)
        .like("token", `${token}%`)
        .limit(2);
      if (prefixError) {
        console.error("[activation-token-resolve] prefix_lookup_failed", prefixError.message);
      } else if (candidates && candidates.length === 1) {
        resolved = candidates[0];
      } else if (candidates && candidates.length > 1) {
        return json({ ok: false, reason: "token_ambiguous" }, 404);
      }
    }
    if (!resolved) return json({ ok: false, reason: "token_not_found" }, 404);

    const { data: prospect } = await supabase
      .from("verified_contractor_prospects")
      .select(
        "id, business_name, legal_name, city, category, email, website_url, phone_e164, rbq_number, " +
          "google_place_id, google_business_url, service_areas, verification_status, data_quality_score, " +
          "source_urls, phone_source_url, rbq_source_url, verified_at",
      )
      .eq("id", resolved.prospect_id)
      .maybeSingle();

    if (!prospect) return json({ ok: false, reason: "prospect_not_found" }, 404);

    // Supplementary real signals (reviews, ratings, photos) — best effort.
    let extra:
      | {
          review_count: number | null;
          review_rating: number | null;
          photo_count: number | null;
          rbq_license: string | null;
          rbq_verified: boolean | null;
          trade: string | null;
          avg_job_value_cad: number | null;
        }
      | null = null;
    try {
      const { data: cp } = await supabase
        .from("contractor_prospects")
        .select("review_count, review_rating, photo_count, rbq_license, rbq_verified, trade, avg_job_value_cad")
        .ilike("business_name", prospect.business_name ?? "___never___")
        .limit(1)
        .maybeSingle();
      extra = (cp as typeof extra) ?? null;
    } catch { /* non-blocking */ }

    let aipp: { logo_url: string | null; short_ai_summary: string | null; google_rating: number | null; google_review_count: number | null } | null = null;
    try {
      const { data: ap } = await supabase
        .from("aipp_profiles")
        .select("logo_url, short_ai_summary, google_rating, google_review_count")
        .ilike("company_name", prospect.business_name ?? "___never___")
        .limit(1)
        .maybeSingle();
      aipp = (ap as typeof aipp) ?? null;
    } catch { /* non-blocking */ }

    // ------------------------------------------------------- build the profile
    const facts: Fact[] = [];
    const push = (f: Fact | null) => { if (f && f.value) facts.push(f); };

    const legal = prospect.legal_name?.trim() || null;
    const display = prospect.business_name?.trim() || legal || null;

    if (legal && legal !== display) {
      push({ key: "legal_name", label: "Dénomination légale", value: legal, provenance: "verified", source: "Registre" });
    }

    const rawTrade = prospect.category?.trim() || extra?.trade?.trim() || null;
    // Les catégories brutes sont en minuscules ; on les présente proprement.
    const trade = rawTrade ? titleCase(rawTrade.replace(/[_-]+/g, " ")) : null;
    if (trade) {
      push({ key: "trade", label: "Spécialité", value: trade, provenance: "verified", source: "Fiche publique" });
    }

    if (prospect.city) {
      push({ key: "city", label: "Ville principale", value: prospect.city, provenance: "verified", source: "Fiche publique" });
    }

    const areas = Array.isArray(prospect.service_areas)
      ? (prospect.service_areas as unknown[]).map(String).filter(Boolean)
      : [];
    if (areas.length) {
      push({
        key: "service_areas",
        label: "Territoire desservi",
        value: areas.slice(0, 6).join(" · "),
        provenance: "inferred",
        source: "Déduit de vos zones d'activité",
      });
    }

    const rbq = prospect.rbq_number?.trim() || extra?.rbq_license?.trim() || null;
    if (rbq) {
      push({
        key: "rbq",
        label: "Licence RBQ",
        value: rbq,
        provenance: extra?.rbq_verified ? "verified" : "declared",
        source: extra?.rbq_verified ? "Registre RBQ" : "Source publique",
      });
    }

    const site = hostOf(prospect.website_url);
    if (site) {
      push({ key: "website", label: "Site web", value: site, provenance: "verified", source: "Site officiel" });
    }

    // Reviews — ONLY when real numbers exist. Never fabricated, never rounded up.
    const rating = extra?.review_rating != null ? Number(extra.review_rating) : (aipp?.google_rating ?? null);
    const reviewCount = extra?.review_count != null ? Number(extra.review_count) : (aipp?.google_review_count ?? null);
    const hasReviews = rating != null && reviewCount != null && reviewCount > 0;

    // Grounded review summary: derived arithmetically from the real numbers only.
    let reviewSummary: string | null = null;
    if (hasReviews) {
      const r = Number(rating);
      const n = Number(reviewCount);
      const strength =
        r >= 4.7 ? "Réputation excellente" : r >= 4.3 ? "Réputation solide" : r >= 3.8 ? "Réputation correcte" : "Réputation à renforcer";
      const volume = n >= 100 ? "un volume d'avis élevé" : n >= 30 ? "un bon volume d'avis" : "un volume d'avis encore limité";
      reviewSummary = `${strength} : ${r.toFixed(1)}/5 sur ${n} avis publics, ${volume}.`;
    }

    const photoCount = extra?.photo_count != null ? Number(extra.photo_count) : null;

    // Recommendation readiness — computed from what is actually present.
    const readinessChecks = [
      { key: "identity", label: "Identité d'entreprise", ok: Boolean(display) },
      { key: "trade", label: "Spécialité identifiée", ok: Boolean(trade) },
      { key: "territory", label: "Territoire défini", ok: Boolean(prospect.city || areas.length) },
      { key: "contact", label: "Contact joignable", ok: Boolean(prospect.phone_e164 || prospect.email) },
      { key: "web", label: "Présence web", ok: Boolean(site || prospect.google_business_url || prospect.google_place_id) },
      { key: "reviews", label: "Signaux d'avis publics", ok: hasReviews },
      { key: "credentials", label: "Licence RBQ", ok: Boolean(rbq) },
      { key: "media", label: "Photos de réalisations", ok: Boolean(photoCount && photoCount > 0) },
    ];
    const okCount = readinessChecks.filter((c) => c.ok).length;
    const readinessScore = Math.round((okCount / readinessChecks.length) * 100);

    const landingVariant = bucket(prospect.id, ["profile_first", "value_first"]);
    const profileVariant = bucket(prospect.id + "p", ["standard"]);

    // Persist the variant assignment (idempotent) so the Conversion Lab can compare.
    if (!preview) {
      try {
        await supabase.from("conversion_variant_assignments").upsert(
          [
            { prospect_id: prospect.id, surface: "landing", variant: landingVariant, cohort_city: prospect.city, cohort_trade: trade },
            { prospect_id: prospect.id, surface: "profile", variant: profileVariant, cohort_city: prospect.city, cohort_trade: trade },
          ],
          { onConflict: "prospect_id,surface", ignoreDuplicates: true },
        );
      } catch (e) {
        console.error("[activation-token-resolve] variant_assign_failed", String(e));
      }
    }

    // ------------------------------------------------------------ click + events
    const now = new Date().toISOString();
    const realToken = resolved.token;
    try {
      if (preview) throw new Error("preview_mode_no_write");
      await supabase
        .from("verified_prospect_tokens")
        .update({ clicked_at: resolved.clicked_at ?? now, click_count: (resolved.click_count ?? 0) + 1 })
        .eq("token", realToken);

      await supabase
        .from("verified_contractor_prospects")
        .update({ outreach_clicked_at: now, last_action_at: now })
        .eq("id", prospect.id);

      const base = {
        _channel: "web",
        _provider: "app",
        _tracking_id: realToken,
        _prospect_id: prospect.id,
        _destination_url: `/unpro/activate/${realToken}`,
        _source_table: "verified_prospect_tokens",
        _source_row_id: realToken,
      };
      await supabase.rpc("record_engagement_event", {
        ...base,
        _event_type: "clicked",
        _channel: "sms",
        _status: "clicked",
        _metadata: { campaign_id: resolved.campaign_id ?? null },
        _idempotency_key: `click:${realToken}`,
      });
      await supabase.rpc("record_engagement_event", {
        ...base,
        _event_type: "landing_viewed",
        _status: "landing_viewed",
        _metadata: { campaign_id: resolved.campaign_id ?? null, landing_variant: landingVariant },
        _idempotency_key: `landing_viewed:${realToken}`,
      });
      await supabase.rpc("record_engagement_event", {
        ...base,
        _event_type: "profile_viewed",
        _status: "profile_viewed",
        _metadata: { profile_variant: profileVariant, readiness_score: readinessScore },
        _idempotency_key: `profile_viewed:${realToken}`,
      });
    } catch (e) {
      console.error("[activation-token-resolve] click_track_failed", String(e));
    }

    return json({
      ok: true,
      token: realToken,
      campaign_id: resolved.campaign_id ?? null,
      first_click: !resolved.clicked_at,
      landing_variant: landingVariant,
      profile_variant: profileVariant,
      prospect: {
        id: prospect.id,
        business_name: display,
        city: prospect.city ?? null,
        category: trade,
        email: prospect.email ?? null,
        website_url: prospect.website_url ?? null,
      },
      profile: {
        display_name: display,
        legal_name: legal,
        trade,
        city: prospect.city ?? null,
        service_areas: areas,
        logo_url: aipp?.logo_url ?? null, // only if a real logo was already stored
        website_url: prospect.website_url ?? null,
        website_host: site,
        google_business_url: prospect.google_business_url ?? null,
        has_google_listing: Boolean(prospect.google_place_id || prospect.google_business_url),
        rating: hasReviews ? Number(rating) : null,
        review_count: hasReviews ? Number(reviewCount) : null,
        review_summary: reviewSummary,
        photo_count: photoCount,
        rbq,
        rbq_verified: Boolean(extra?.rbq_verified),
        verification_status: prospect.verification_status ?? null,
        verified_at: prospect.verified_at ?? null,
        data_quality_score: prospect.data_quality_score ?? null,
        facts,
        readiness: { score: readinessScore, checks: readinessChecks },
      },
    });
  } catch (e) {
    console.error("[activation-token-resolve] fatal", String(e));
    return json({ ok: false, reason: "internal_error" }, 500);
  }
});
