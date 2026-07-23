// Public edge function: resolves a war_prospect by slug or tracking_token,
// logs the landing view, increments view counter, and returns sanitized payload
// for the personalized /pro/:slug landing page.
//
// No auth required — this is the public entry from sniper-email CTA.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ResolveRequest {
  slug?: string;
  token?: string;
  user_agent?: string;
  referrer?: string;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function isUuid(value: string | undefined | null): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSideEffectFreeVisit(req: Request, userAgent?: string | null): boolean {
  const purpose = (req.headers.get("purpose") || req.headers.get("sec-purpose") || "").toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview")) return true;
  const ua = (userAgent || req.headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true;
  return /unpro-qa|bot|crawler|spider|preview|slackbot|discordbot|whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegrambot|skypeuripreview|embedly|pinterest|redditbot|applebot|bingpreview|googlebot|headless|curl|wget/i.test(ua);
}

// Heuristic scoring fallback when DB scores missing.
function deriveScores(p: {
  rating?: number | null;
  reviews_count?: number | null;
  website?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  email?: string | null;
  phone?: string | null;
  lead_score?: number | null;
}) {
  const rating = Number(p.rating ?? 0);
  const reviews = Number(p.reviews_count ?? 0);
  const hasWeb = p.website ? 1 : 0;
  const socialCount = (p.facebook_url ? 1 : 0) + (p.instagram_url ? 1 : 0);
  const hasContact = (p.email ? 1 : 0) + (p.phone ? 1 : 0);

  const visibility = clamp(
    25 +
      (hasWeb ? 25 : 0) +
      socialCount * 12 +
      Math.min(reviews / 4, 25)
  );
  const trust = clamp(
    20 +
      rating * 12 +
      Math.min(reviews / 5, 25) +
      (hasContact === 2 ? 8 : hasContact * 4)
  );
  const conversion = clamp(
    25 + (hasWeb ? 18 : 0) + (p.email ? 15 : 0) + (rating >= 4 ? 12 : 0)
  );
  const speed = clamp(35 + (hasWeb ? 25 : 0) + (p.phone ? 20 : 0));
  const opportunity = clamp(
    100 - Math.round((visibility + trust + conversion + speed) / 5)
  );

  // Estimated missed leads/month — bigger gap = more leads being missed
  const baseDemand = 35; // Laval baseline for these trades
  const performanceFactor = (visibility + trust + conversion) / 300; // 0..1
  const missed = Math.max(
    8,
    Math.round(baseDemand * (1 - performanceFactor) * 1.4)
  );

  return { visibility, trust, conversion, speed, opportunity, missed };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = (await req.json().catch(() => ({}))) as ResolveRequest;
    const { slug, token, user_agent, referrer } = body;

    if (!slug && !token) {
      return new Response(
        JSON.stringify({ error: "slug or token required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let query = supabase.from("war_prospects").select("*").limit(1);
    if (token) query = query.eq("tracking_token", token);
    else if (slug) query = query.eq("slug", slug);

    const { data: warProspect, error: fetchErr } = await query.maybeSingle();

    if (fetchErr) {
      console.error("[pro-landing-resolve] fetch error", fetchErr);
      return new Response(
        JSON.stringify({ error: "lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prospect = warProspect;
    let sourceTable: "war_prospects" | "contractor_prospects" = "war_prospects";

    // Current first-dollar SMS links resolve to /pro/<contractor_prospects.id>.
    // Preserve the original war_prospects behavior, but recover canonical
    // contractor_prospects UUID destinations without requiring a duplicate row.
    if (!prospect && isUuid(slug)) {
      const { data: contractorProspect, error: contractorErr } = await supabase
        .from("contractor_prospects")
        .select("id, business_name, category_slug, trade, city, website_url, phone, email, review_rating, review_count, google_business_url, address, postal_code, acquisition_score, priority_score, aipp_score")
        .eq("id", slug)
        .maybeSingle();

      if (contractorErr) {
        console.error("[pro-landing-resolve] contractor prospect fetch error", contractorErr);
        return new Response(
          JSON.stringify({ error: "lookup failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (contractorProspect) {
        sourceTable = "contractor_prospects";
        prospect = {
          id: contractorProspect.id,
          company_name: contractorProspect.business_name,
          category: contractorProspect.category_slug ?? contractorProspect.trade ?? "general",
          city: contractorProspect.city ?? "Québec",
          website: contractorProspect.website_url,
          phone: contractorProspect.phone,
          email: contractorProspect.email,
          rating: contractorProspect.review_rating,
          reviews_count: contractorProspect.review_count,
          facebook_url: null,
          instagram_url: null,
          google_maps_url: contractorProspect.google_business_url,
          address: contractorProspect.address,
          postal_code: contractorProspect.postal_code,
          lead_score: contractorProspect.acquisition_score ?? contractorProspect.priority_score ?? contractorProspect.aipp_score,
          slug: contractorProspect.id,
          tracking_token: token ?? null,
          visibility_score: null,
          trust_score: null,
          conversion_score: null,
          speed_score: null,
          opportunity_score: null,
          estimated_missed_leads_monthly: null,
          landing_views_count: 0,
        };
      }
    }

    if (!prospect) {
      return new Response(
        JSON.stringify({ error: "not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sideEffectFree = isSideEffectFreeVisit(req, user_agent);

    // Derive scores (use DB values if present, fallback to heuristics)
    const derived = deriveScores(prospect);
    const scores = {
      visibility: prospect.visibility_score ?? derived.visibility,
      trust: prospect.trust_score ?? derived.trust,
      conversion: prospect.conversion_score ?? derived.conversion,
      speed: prospect.speed_score ?? derived.speed,
      opportunity: prospect.opportunity_score ?? derived.opportunity,
      missed: prospect.estimated_missed_leads_monthly ?? derived.missed,
    };

    // Persist derived scores if missing
    if (
      sourceTable === "war_prospects" &&
      !sideEffectFree &&
      (prospect.visibility_score == null ||
        prospect.estimated_missed_leads_monthly == null)
    ) {
      await supabase
        .from("war_prospects")
        .update({
          visibility_score: scores.visibility,
          trust_score: scores.trust,
          conversion_score: scores.conversion,
          speed_score: scores.speed,
          opportunity_score: scores.opportunity,
          estimated_missed_leads_monthly: scores.missed,
        })
        .eq("id", prospect.id);
    }

    // Log the landing view
    if (!sideEffectFree) {
      await supabase.from("pro_landing_views").insert({
        prospect_id: prospect.id,
        slug: prospect.slug,
        tracking_token: token ?? null,
        user_agent: user_agent ?? null,
        referrer: referrer ?? null,
      });
    }

    // Safety net for Stage 3 of the Critical Path Audit: if the user reached
    // this landing via a tokenized share/SMS, also record a click event so the
    // funnel doesn't show 0 when the /r/ redirect was bypassed.
    if (token && !sideEffectFree) {
      try {
        await supabase.from("outreach_click_events").insert({
          clicked_url: `pro_landing:${prospect.slug}`,
          resolved_url: referrer ?? `pro_landing:${prospect.slug}`,
        });
      } catch (e) {
        console.warn("[pro-landing-resolve] click event insert failed", e);
      }
    }

    // Increment view counter (non-blocking semantics ok)
    if (sourceTable === "war_prospects" && !sideEffectFree) {
      await supabase
        .from("war_prospects")
        .update({
          landing_views_count: (prospect.landing_views_count ?? 0) + 1,
          last_landing_view_at: new Date().toISOString(),
        })
        .eq("id", prospect.id);
    }

    // Sanitized public payload (NO email, NO phone exposed to wire)
    const payload = {
      id: prospect.id,
      company_name: prospect.company_name,
      city: prospect.city,
      category: prospect.category,
      slug: prospect.slug,
      rating: prospect.rating,
      reviews_count: prospect.reviews_count,
      has_website: !!prospect.website,
      scores,
    };

    return new Response(JSON.stringify({ prospect: payload }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[pro-landing-resolve] fatal", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
