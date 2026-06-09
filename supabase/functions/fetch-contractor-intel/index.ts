// UNPRO — fetch-contractor-intel
// Scrapes contractor website + Google reviews via Firecrawl, caches in DB.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Known contractors (extendable). Slug => identity + scrape targets.
const REGISTRY: Record<string, {
  company: string;
  legal: string;
  website: string;
  rbq?: string;
  neq?: string;
  phones: string[];
  email?: string;
  territory: string[];
  services: string[];
  positioning: string;
  google_query: string;
}> = {
  "isolation-solution-royal": {
    company: "Isolation Solution Royal",
    legal: "9480-0976 Québec inc.",
    website: "https://isroyal.ca",
    phones: ["514-249-9522", "514-941-3141"],
    territory: ["Laval", "Montréal", "Rive-Nord", "Lanaudière"],
    services: [
      "Isolation d'entretoit",
      "Décontamination moisissure",
      "Étanchéité / calfeutrage",
      "Ventilation",
      "Déblocage des soffites",
      "Trappes d'accès",
      "Tuyaux de sécheuse",
      "Vermiculite",
      "Animaux nuisibles",
    ],
    positioning: "Spécialiste de l'entretoit",
    google_query: "Isolation Solution Royal Laval avis Google",
  },
};

async function firecrawl(path: string, body: unknown, apiKey: string) {
  const r = await fetch(`${FIRECRAWL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { error: json?.error || r.statusText, status: r.status };
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") ?? "";
    const force = url.searchParams.get("force") === "1";

    const identity = REGISTRY[slug];
    if (!identity) {
      return new Response(
        JSON.stringify({ error: "unknown_slug" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supaUrl, supaKey);

    // Cache check
    if (!force) {
      const { data: cached } = await supabase
        .from("contractor_intel_snapshots")
        .select("*")
        .eq("slug", slug)
        .eq("source", "firecrawl")
        .maybeSingle();
      if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({ identity, snapshot: cached, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    let scrape: any = null;
    let reviews: any = null;
    let scrapeError: string | null = null;

    if (firecrawlKey) {
      const [scrapeRes, reviewsRes] = await Promise.all([
        firecrawl("/scrape", {
          url: identity.website,
          formats: ["markdown", "summary", "links"],
          onlyMainContent: true,
        }, firecrawlKey),
        firecrawl("/search", {
          query: identity.google_query,
          limit: 8,
          lang: "fr",
          country: "ca",
        }, firecrawlKey),
      ]);
      if (scrapeRes?.error) scrapeError = scrapeRes.error;
      scrape = scrapeRes?.data ?? scrapeRes;
      reviews = reviewsRes?.data ?? reviewsRes;
    } else {
      scrapeError = "missing_firecrawl_key";
    }

    const payload = {
      identity,
      summary: scrape?.summary ?? scrape?.data?.summary ?? null,
      markdown_excerpt: (scrape?.markdown ?? scrape?.data?.markdown ?? "").slice(0, 4000),
      links: (scrape?.links ?? scrape?.data?.links ?? []).slice(0, 30),
      reviews_search: Array.isArray(reviews) ? reviews.slice(0, 8) : (reviews?.web ?? reviews?.results ?? []).slice?.(0, 8) ?? [],
      scrape_error: scrapeError,
      fetched_at: new Date().toISOString(),
    };

    const { data: upserted } = await supabase
      .from("contractor_intel_snapshots")
      .upsert(
        { slug, source: "firecrawl", payload, fetched_at: new Date().toISOString() },
        { onConflict: "slug,source" },
      )
      .select("*")
      .maybeSingle();

    return new Response(
      JSON.stringify({ identity, snapshot: upserted ?? { payload }, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
