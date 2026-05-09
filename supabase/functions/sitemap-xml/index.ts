/**
 * UNPRO — Sitemap (Index + Sub-sitemaps)
 *
 * Default → returns the sitemap_index.xml referencing sub-sitemaps via ?type=.
 * ?type=core|solutions-fr|solutions-en|contractors|guides|projects|neighborhoods
 *      → returns that sub-sitemap.
 *
 * Each sub-sitemap is capped at 50 000 URLs per protocol.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ROOT = "https://unpro.ca";
const SITEMAP_BASE = `${ROOT}/sitemap.xml`;
const MAX_URLS = 50_000;

const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/proprietaires", changefreq: "weekly", priority: "0.9" },
  { path: "/entrepreneurs", changefreq: "weekly", priority: "0.9" },
  { path: "/condo", changefreq: "weekly", priority: "0.8" },
  { path: "/pricing", changefreq: "weekly", priority: "0.8" },
  { path: "/compare-quotes", changefreq: "weekly", priority: "0.7" },
  { path: "/verifier-entrepreneur", changefreq: "weekly", priority: "0.7" },
  { path: "/score-maison", changefreq: "weekly", priority: "0.7" },
  { path: "/aipp-score", changefreq: "weekly", priority: "0.7" },
  { path: "/comment-fonctionne-ia", changefreq: "monthly", priority: "0.6" },
  { path: "/roadmap", changefreq: "monthly", priority: "0.5" },
  { path: "/couverture", changefreq: "monthly", priority: "0.6" },
  { path: "/guides", changefreq: "weekly", priority: "0.7" },
  { path: "/avis-verifies", changefreq: "weekly", priority: "0.6" },
  { path: "/courtiers", changefreq: "monthly", priority: "0.6" },
  { path: "/services", changefreq: "weekly", priority: "0.8" },
  { path: "/audit", changefreq: "monthly", priority: "0.6" },
  { path: "/alex", changefreq: "weekly", priority: "0.7" },
];

// Service & city slugs mirror src/seo/data — keep small inline list to avoid bundling.
// (Phase 2 reads from DB-backed `seo_pages` for the long tail; these are the canonical money pages.)
const SERVICES = [
  "isolation-entretoit", "couvreur", "renovation-salle-de-bain", "plomberie",
  "electricite", "fenetre-pvc", "drain-francais", "ventilation-entretoit",
  "gouttiere", "inspection-batiment",
];
const CITIES = [
  "montreal", "laval", "longueuil", "brossard", "terrebonne", "saint-laurent",
  "verdun", "lachine", "dorval", "pointe-claire", "saint-hubert", "boucherville",
  "saint-bruno", "la-prairie", "chambly", "candiac", "mascouche", "repentigny",
  "blainville", "quebec", "gatineau", "sherbrooke", "trois-rivieres",
];

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function todayW3C(): string { return new Date().toISOString().split("T")[0]; }
function toW3C(d: string | null | undefined): string {
  if (!d) return todayW3C();
  try { return new Date(d).toISOString().split("T")[0]; } catch { return todayW3C(); }
}

interface Entry { loc: string; lastmod: string; changefreq: string; priority: string; }

function urlsetXml(entries: Entry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
}

function indexXml(types: { name: string; lastmod: string }[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${types.map((t) => `  <sitemap>
    <loc>${SITEMAP_BASE}?type=${t.name}</loc>
    <lastmod>${t.lastmod}</lastmod>
  </sitemap>`).join("\n")}
</sitemapindex>`;
}

function dedupe(entries: Entry[]): Entry[] {
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.loc) ? false : (seen.add(e.loc), true))).slice(0, MAX_URLS);
}

async function buildCore(): Promise<Entry[]> {
  const today = todayW3C();
  return STATIC_PAGES.map((p) => ({ loc: `${ROOT}${p.path}`, lastmod: today, changefreq: p.changefreq, priority: p.priority }));
}

async function buildSolutions(lang: "fr" | "en"): Promise<Entry[]> {
  const today = todayW3C();
  const entries: Entry[] = [];
  const prefix = lang === "fr" ? "/solution" : "/en/solution";
  for (const svc of SERVICES) {
    entries.push({ loc: `${ROOT}${prefix}/${svc}`, lastmod: today, changefreq: "weekly", priority: "0.8" });
    for (const city of CITIES) {
      entries.push({ loc: `${ROOT}${prefix}/${svc}/${city}`, lastmod: today, changefreq: "monthly", priority: "0.9" });
    }
  }
  return entries;
}

async function buildContractors(sb: ReturnType<typeof createClient>): Promise<Entry[]> {
  const entries: Entry[] = [];
  const { data: contractors } = await sb
    .from("contractors")
    .select("slug, city, updated_at")
    .not("slug", "is", null);
  if (!contractors) return entries;
  for (const c of contractors as any[]) {
    if (!c.slug) continue;
    const city = (c.city || "quebec").toLowerCase().replace(/\s+/g, "-");
    const slug = String(c.slug).toLowerCase();
    const lm = toW3C(c.updated_at);
    // New canonical
    entries.push({ loc: `${ROOT}/contractor/${escapeXml(slug)}/${escapeXml(city)}`, lastmod: lm, changefreq: "weekly", priority: "0.8" });
    entries.push({ loc: `${ROOT}/contractor/${escapeXml(slug)}/${escapeXml(city)}/reviews`, lastmod: lm, changefreq: "weekly", priority: "0.6" });
    entries.push({ loc: `${ROOT}/contractor/${escapeXml(slug)}/${escapeXml(city)}/projects`, lastmod: lm, changefreq: "monthly", priority: "0.6" });
    // Legacy URL (still indexed during Phase 1)
    entries.push({ loc: `${ROOT}/entrepreneur/${escapeXml(slug)}`, lastmod: lm, changefreq: "monthly", priority: "0.5" });
  }
  return entries;
}

async function buildGuides(sb: ReturnType<typeof createClient>): Promise<Entry[]> {
  const entries: Entry[] = [];
  // DB-backed articles
  const { data: articles } = await sb.from("seo_articles").select("slug, updated_at, word_count").eq("published", true);
  if (articles) {
    for (const a of articles as any[]) {
      if (a.slug && (a.word_count == null || a.word_count >= 200)) {
        entries.push({ loc: `${ROOT}/blog/${escapeXml(a.slug)}`, lastmod: toW3C(a.updated_at), changefreq: "monthly", priority: "0.7" });
      }
    }
  }
  return entries;
}

async function buildProjects(_sb: ReturnType<typeof createClient>): Promise<Entry[]> {
  // Phase 2 will populate from contractor portfolios
  return [];
}

async function buildNeighborhoods(_sb: ReturnType<typeof createClient>): Promise<Entry[]> {
  // Phase 3 — empty for now
  return [];
}

async function buildSeoPages(sb: ReturnType<typeof createClient>): Promise<Entry[]> {
  const entries: Entry[] = [];
  const { data: pages } = await sb.from("seo_pages").select("slug, updated_at").eq("is_published", true);
  if (pages) {
    for (const p of pages as any[]) {
      if (p.slug) {
        entries.push({ loc: `${ROOT}/s/${escapeXml(p.slug)}`, lastmod: toW3C(p.updated_at), changefreq: "weekly", priority: "0.7" });
      }
    }
  }
  return entries;
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    if (!type) {
      const today = todayW3C();
      const xml = indexXml([
        { name: "core", lastmod: today },
        { name: "solutions-fr", lastmod: today },
        { name: "solutions-en", lastmod: today },
        { name: "contractors", lastmod: today },
        { name: "guides", lastmod: today },
        { name: "projects", lastmod: today },
        { name: "neighborhoods", lastmod: today },
        { name: "seo-pages", lastmod: today },
      ]);
      return new Response(xml, {
        status: 200,
        headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
      });
    }

    let entries: Entry[] = [];
    switch (type) {
      case "core": entries = await buildCore(); break;
      case "solutions-fr": entries = await buildSolutions("fr"); break;
      case "solutions-en": entries = await buildSolutions("en"); break;
      case "contractors": entries = await buildContractors(sb); break;
      case "guides": entries = await buildGuides(sb); break;
      case "projects": entries = await buildProjects(sb); break;
      case "neighborhoods": entries = await buildNeighborhoods(sb); break;
      case "seo-pages": entries = await buildSeoPages(sb); break;
      default:
        return new Response("Unknown sitemap type", { status: 400 });
    }

    const xml = urlsetXml(dedupe(entries));
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Sitemap-Count": String(entries.length),
      },
    });
  } catch (_err) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
