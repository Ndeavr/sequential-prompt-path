// UNPRO — reputation-refresh
// Runs entity-matched Firecrawl scan for a contractor slug and caches into
// contractor_reputation_snapshots. Only Tier 1-3 sources with confidence >= 85 are approved.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";

interface Identity {
  company: string;
  aliases: string[];
  websites: string[]; // canonical domains
  phones: string[];
  neq?: string;
  rbq?: string;
  cities: string[];
  google_query: string;
  blocklist: string[]; // competitor names to hard-block
}

const REGISTRY: Record<string, Identity> = {
  "isolation-solution-royal": {
    company: "Isolation Solution Royal",
    aliases: ["isolation solution royal", "isr", "9480-0976 québec inc"],
    websites: ["isroyal.ca", "isolationsolutionroyal.ca"],
    phones: ["5142499522", "5149413141"],
    cities: ["laval", "terrebonne", "montréal", "montreal", "lanaudière"],
    google_query: "\"Isolation Solution Royal\" Laval avis",
    blocklist: [
      "isolation toit",
      "isolation grand montréal",
      "isolation grand montreal",
      "toiture",
      "isolation majeau",
    ],
  },
};

const TIER1_DOMAINS = [
  "google.com", "google.ca", "g.co", "maps.google", "business.google",
  "facebook.com", "fb.com", "bbb.org", "rbq.gouv.qc.ca",
  "registreentreprises.gouv.qc.ca", "opc.gouv.qc.ca", "youtube.com",
];
const TIER2_DOMAINS = [
  "birdeye.com", "homestars.com", "trustedpros.ca", "pagesjaunes.ca", "yelp.com", "yelp.ca",
];

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function digits(s: string): string { return (s || "").replace(/\D/g, ""); }
function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
function tierOf(domain: string, identity: Identity): 1 | 2 | 3 {
  if (identity.websites.some((w) => domain === w || domain.endsWith("." + w))) return 1;
  if (TIER1_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) return 1;
  if (TIER2_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) return 2;
  return 3;
}

function scoreSource(item: { url?: string; title?: string; description?: string; snippet?: string }, identity: Identity): { score: number; matched: Record<string, boolean> } {
  const url = item.url || "";
  const domain = domainOf(url);
  const text = normalize([item.title, item.description, item.snippet, url].filter(Boolean).join(" "));
  const matched: Record<string, boolean> = {};
  let score = 0;

  if (identity.websites.some((w) => domain === w || domain.endsWith("." + w))) { score += 40; matched.website = true; }
  const normCompany = normalize(identity.company);
  if (identity.aliases.some((a) => text.includes(normalize(a))) || text.includes(normCompany)) { score += 25; matched.name = true; }
  if (identity.phones.some((p) => digits(text).includes(p))) { score += 20; matched.phone = true; }
  if (identity.cities.some((c) => text.includes(normalize(c)))) { score += 10; matched.city = true; }
  if (identity.neq && text.includes(normalize(identity.neq))) { score += 15; matched.neq = true; }
  if (identity.rbq && text.includes(normalize(identity.rbq))) { score += 15; matched.rbq = true; }

  return { score: Math.min(100, score), matched };
}

function isBlocked(item: { title?: string; description?: string; snippet?: string; url?: string }, identity: Identity): string | null {
  const text = normalize([item.title, item.description, item.snippet].filter(Boolean).join(" "));
  for (const bad of identity.blocklist) {
    if (text.includes(normalize(bad))) return `competitor:${bad}`;
  }
  return null;
}

async function firecrawlSearch(query: string, apiKey: string) {
  const r = await fetch(`${FIRECRAWL}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 15, lang: "fr", country: "ca" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return { error: j?.error || r.statusText, items: [] as any[] };
  const items = Array.isArray(j?.data) ? j.data : (j?.web ?? j?.results ?? j?.data?.web ?? []);
  return { error: null, items };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { slug } = await req.json();
    const identity = REGISTRY[slug];
    if (!identity) {
      return new Response(JSON.stringify({ error: "unknown_slug" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    // Mark refreshing
    await supabase.from("contractor_reputation_snapshots").upsert({
      slug, status: "refreshing", updated_at: new Date().toISOString(),
    }, { onConflict: "slug" });

    if (!firecrawlKey) {
      await supabase.from("contractor_reputation_snapshots").update({
        status: "failed", last_refresh_error: "missing_firecrawl_key",
      }).eq("slug", slug);
      return new Response(JSON.stringify({ error: "missing_firecrawl_key" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fan out queries: company name + each website + phone
    const queries = [
      identity.google_query,
      `"${identity.company}" ${identity.cities[0]}`,
      ...identity.websites.map((w) => `site:${w} OR "${w}"`),
      `"${identity.phones[0]}" ${identity.company}`,
    ];
    const results = await Promise.all(queries.map((q) => firecrawlSearch(q, firecrawlKey)));
    const rawItems = results.flatMap((r) => r.items);

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = rawItems.filter((it: any) => {
      const u = it?.url || "";
      if (!u || seen.has(u)) return false;
      seen.add(u); return true;
    });

    const sources = unique.map((it: any) => {
      const url = it.url || "";
      const domain = domainOf(url);
      const tier = tierOf(domain, identity);
      const blocked = isBlocked(it, identity);
      const { score, matched } = scoreSource(it, identity);
      const approved = !blocked && tier <= 3 && score >= 85;
      return {
        url,
        domain,
        title: it.title ?? null,
        snippet: it.description ?? it.snippet ?? null,
        tier,
        confidence_score: score,
        match: matched,
        approved,
        blocked_reason: blocked ?? (score < 85 ? "confidence_below_85" : null),
      };
    });

    const approvedSources = sources.filter((s) => s.approved);

    const now = new Date();
    const next = new Date(now.getTime() + 30 * 86400_000);

    await supabase.from("contractor_reputation_snapshots").update({
      scan_date: now.toISOString(),
      next_scan_date: next.toISOString(),
      source_count: approvedSources.length,
      review_count: 0,
      average_rating: null,
      sources: approvedSources as any,
      raw_payload: { all_sources: sources, queries } as any,
      status: "fresh",
      last_refresh_error: null,
    }).eq("slug", slug);

    return new Response(JSON.stringify({ ok: true, approved: approvedSources.length, total: sources.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
