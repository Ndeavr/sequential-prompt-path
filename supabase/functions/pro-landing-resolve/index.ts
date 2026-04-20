// Public edge function: resolves a war_prospect by slug or tracking_token,
// logs the landing view, increments view counter, and returns sanitized payload
// for the personalized /pro/:slug landing page.
//
// No auth required — this is the public entry from sniper-email CTA.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const { data: prospect, error: fetchErr } = await query.maybeSingle();

    if (fetchErr) {
      console.error("[pro-landing-resolve] fetch error", fetchErr);
      return new Response(
        JSON.stringify({ error: "lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!prospect) {
      return new Response(
        JSON.stringify({ error: "not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      prospect.visibility_score == null ||
      prospect.estimated_missed_leads_monthly == null
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
    await supabase.from("pro_landing_views").insert({
      prospect_id: prospect.id,
      slug: prospect.slug,
      tracking_token: token ?? null,
      user_agent: user_agent ?? null,
      referrer: referrer ?? null,
    });

    // Increment view counter (non-blocking semantics ok)
    await supabase
      .from("war_prospects")
      .update({
        landing_views_count: (prospect.landing_views_count ?? 0) + 1,
        last_landing_view_at: new Date().toISOString(),
      })
      .eq("id", prospect.id);

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
