// compute-prospect-priority — scores every contractor_prospects row 0-100
// Reviews (max 60) + Website (max 40) + Response (max 30) + Territory (max varies), clamped to 100.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Prospect {
  id: string;
  review_count: number | null;
  review_rating: number | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  category_slug: string | null;
}

function scoreReviews(count: number | null): number {
  const n = count ?? 0;
  if (n >= 200) return 60;
  if (n >= 100) return 40;
  if (n >= 50) return 20;
  return 0;
}

function scoreWebsite(url: string | null): number {
  if (!url || !url.trim()) return 40; // no website = big AIPP gap
  const isHttps = url.startsWith("https://");
  const looksPoor = !isHttps || url.includes("facebook.com") || url.includes("wix.com/") || url.length < 15;
  return looksPoor ? 25 : 0;
}

function scoreResponse(phone: string | null, email: string | null): number {
  if (phone && phone.replace(/\D/g, "").length >= 10) return 30; // mobile
  if (email) return 5;
  return 0;
}

// Territory demand — reads city_service_demand_grid if available, else fallback 0-30.
async function scoreTerritory(
  supabase: ReturnType<typeof createClient>,
  city: string | null,
  category: string | null,
): Promise<number> {
  if (!city || !category) return 0;
  const { data } = await supabase
    .from("city_service_demand_grid")
    .select("gap_score")
    .eq("city", city)
    .eq("service_slug", category)
    .maybeSingle();
  const gap = (data as { gap_score?: number } | null)?.gap_score ?? null;
  if (gap === null) return 10; // unknown demand = neutral
  return Math.min(30, Math.round((gap / 100) * 30));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit ?? 500), 2000);
    const onlyMissing = body.only_missing !== false;

    let query = supabase
      .from("contractor_prospects")
      .select("id, review_count, review_rating, website_url, phone, email, city, category_slug")
      .limit(limit);

    if (onlyMissing) {
      // score prospects that don't have a priority row yet
      const { data: existing } = await supabase
        .from("contractor_prospect_priority")
        .select("prospect_id")
        .limit(5000);
      const seen = new Set((existing ?? []).map((r: { prospect_id: string }) => r.prospect_id));
      const { data: all, error } = await query;
      if (error) throw error;
      const filtered = (all as Prospect[] | null ?? []).filter(p => !seen.has(p.id)).slice(0, limit);
      const scored = await scoreBatch(supabase, filtered);
      return respond({ scored: scored.length, total_seen: (all ?? []).length });
    }

    const { data: prospects, error } = await query;
    if (error) throw error;
    const scored = await scoreBatch(supabase, (prospects as Prospect[] | null) ?? []);
    return respond({ scored: scored.length });
  } catch (e) {
    console.error("[compute-prospect-priority]", e);
    return respond({ error: String(e instanceof Error ? e.message : e) }, 500);
  }

  function respond(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function scoreBatch(
  supabase: ReturnType<typeof createClient>,
  prospects: Prospect[],
) {
  const rows: Array<{
    prospect_id: string;
    google_reviews_score: number;
    website_score: number;
    response_score: number;
    territory_score: number;
    total_score: number;
    score_breakdown: Record<string, unknown>;
    computed_at: string;
  }> = [];

  for (const p of prospects) {
    const reviews = scoreReviews(p.review_count);
    const website = scoreWebsite(p.website_url);
    const response = scoreResponse(p.phone, p.email);
    const territory = await scoreTerritory(supabase, p.city, p.category_slug);
    const total = Math.min(100, reviews + website + response + territory);
    rows.push({
      prospect_id: p.id,
      google_reviews_score: reviews,
      website_score: website,
      response_score: response,
      territory_score: territory,
      total_score: total,
      score_breakdown: {
        review_count: p.review_count,
        review_rating: p.review_rating,
        has_website: !!p.website_url,
        has_phone: !!p.phone,
        has_email: !!p.email,
      },
      computed_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("contractor_prospect_priority")
      .upsert(rows, { onConflict: "prospect_id" });
    if (error) throw error;
  }
  return rows;
}
