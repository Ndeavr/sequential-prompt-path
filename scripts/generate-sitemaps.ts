/**
 * UNPRO — Sitemaps + LLM corpus generator
 *
 * Generates at build time (predev/prebuild):
 *   public/sitemap.xml              → sitemap index
 *   public/sitemap-pages.xml        → static pillar routes
 *   public/sitemap-blog.xml         → blog_articles (published)
 *   public/sitemap-journal.xml      → journal_articles (published)
 *   public/sitemap-ai-entities.xml  → ai_entities (published)
 *   public/sitemap-problems.xml     → home_problems + home_problem_city_pages
 *   public/sitemap-contractors.xml  → v_contractor_full_public
 *   public/llms-full.txt            → full markdown corpus for LLM crawlers
 *
 * Fail-soft: if Supabase is unreachable, writes empty sitemaps so the
 * build never blocks.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://unpro.ca";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://clmaqdnphbndvmmqvpff.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk";

// --------------------------------------------------------------------------
// Pillar routes (kept here so the script is the single source of truth).
// Add public routes that are stable, indexable, and not handled by a
// dynamic sitemap below.
// --------------------------------------------------------------------------
const PILLAR_ROUTES: { path: string; changefreq?: string; priority?: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/alex", changefreq: "weekly", priority: "0.9" },
  { path: "/manifeste", changefreq: "monthly", priority: "0.9" },
  { path: "/pourquoi-unpro", changefreq: "monthly", priority: "0.9" },
  { path: "/pourquoi-pas-trois-soumissions", changefreq: "monthly", priority: "0.9" },
  { path: "/intelligence", changefreq: "weekly", priority: "0.9" },
  { path: "/ia-maison", changefreq: "weekly", priority: "0.9" },
  { path: "/pim", changefreq: "weekly", priority: "0.8" },
  { path: "/cest-quoi-unpro", changefreq: "monthly", priority: "0.8" },
  { path: "/diagnostic", changefreq: "weekly", priority: "0.8" },
  { path: "/diagnostic-photo", changefreq: "weekly", priority: "0.7" },
  { path: "/diagnostic-ia", changefreq: "weekly", priority: "0.7" },
  { path: "/calculateur-taxes-quebec", changefreq: "monthly", priority: "0.7" },
  { path: "/services", changefreq: "weekly", priority: "0.8" },
  { path: "/problemes", changefreq: "weekly", priority: "0.8" },
  { path: "/tarifs", changefreq: "weekly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/a-propos", changefreq: "monthly", priority: "0.6" },
  { path: "/journal", changefreq: "weekly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
];

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function xmlHeader(root: "urlset" | "sitemapindex") {
  const ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${root} xmlns="${ns}">`;
}

function urlNode(loc: string, lastmod?: string, changefreq?: string, priority?: string) {
  const parts = [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  parts.push(`  </url>`);
  return parts.join("\n");
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDate(d?: string | null) {
  if (!d) return undefined;
  try {
    return new Date(d).toISOString();
  } catch {
    return undefined;
  }
}

function writeSitemap(file: string, urls: string[]) {
  const xml = `${xmlHeader("urlset")}\n${urls.join("\n")}\n</urlset>\n`;
  writeFileSync(resolve(`public/${file}`), xml);
}

async function sb<T = any>(path: string): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) {
      console.warn(`[sitemaps] ${path} → HTTP ${r.status}`);
      return [];
    }
    return (await r.json()) as T[];
  } catch (e) {
    console.warn(`[sitemaps] ${path} → ${e instanceof Error ? e.message : e}`);
    return [];
  }
}

// --------------------------------------------------------------------------
// Per-source builders
// --------------------------------------------------------------------------
async function buildPages() {
  const urls = PILLAR_ROUTES.map((r) =>
    urlNode(`${BASE_URL}${r.path}`, undefined, r.changefreq, r.priority),
  );
  writeSitemap("sitemap-pages.xml", urls);
  return urls.length;
}

async function buildBlog() {
  const rows = await sb<{ slug: string; updated_at: string; published_at: string | null }>(
    "blog_articles?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc.nullslast",
  );
  const urls = rows.map((r) =>
    urlNode(
      `${BASE_URL}/blog/${r.slug}`,
      isoDate(r.published_at ?? r.updated_at),
      "weekly",
      "0.7",
    ),
  );
  writeSitemap("sitemap-blog.xml", urls);
  return rows.length;
}

async function buildJournal() {
  const rows = await sb<{ slug: string; updated_at: string; published_at: string | null }>(
    "journal_articles?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc.nullslast",
  );
  const urls = rows.map((r) =>
    urlNode(
      `${BASE_URL}/journal/${r.slug}`,
      isoDate(r.published_at ?? r.updated_at),
      "weekly",
      "0.8",
    ),
  );
  writeSitemap("sitemap-journal.xml", urls);
  return rows.length;
}

async function buildAiEntities() {
  const rows = await sb<{ slug: string; updated_at: string }>(
    "ai_entities?select=slug,updated_at&published=eq.true&order=updated_at.desc",
  );
  const urls = rows.map((r) =>
    urlNode(`${BASE_URL}/ai/${r.slug}`, isoDate(r.updated_at), "weekly", "0.8"),
  );
  writeSitemap("sitemap-ai-entities.xml", urls);
  return rows.length;
}

async function buildProblems() {
  const problems = await sb<{ slug: string; updated_at: string }>(
    "home_problems?select=slug,updated_at&is_active=eq.true",
  );
  const cityPages = await sb<{
    updated_at: string;
    home_problems: { slug: string } | null;
    cities: { slug: string } | null;
  }>(
    "home_problem_city_pages?select=updated_at,home_problems(slug),cities(slug)&is_published=eq.true",
  );

  const urls: string[] = [];
  for (const p of problems) {
    urls.push(urlNode(`${BASE_URL}/probleme/${p.slug}`, isoDate(p.updated_at), "weekly", "0.7"));
  }
  for (const c of cityPages) {
    const ps = c.home_problems?.slug;
    const cs = c.cities?.slug;
    if (!ps || !cs) continue;
    urls.push(
      urlNode(`${BASE_URL}/probleme/${ps}/${cs}`, isoDate(c.updated_at), "weekly", "0.7"),
    );
  }
  writeSitemap("sitemap-problems.xml", urls);
  return urls.length;
}

async function buildContractors() {
  const rows = await sb<{ slug: string }>(
    "v_contractor_full_public?select=slug&is_published=eq.true&slug=not.is.null",
  );
  const urls = rows.map((r) =>
    urlNode(`${BASE_URL}/entrepreneur/${r.slug}`, undefined, "weekly", "0.6"),
  );
  writeSitemap("sitemap-contractors.xml", urls);
  return rows.length;
}

// --------------------------------------------------------------------------
// Sitemap index
// --------------------------------------------------------------------------
function buildIndex(children: string[]) {
  const now = new Date().toISOString();
  const entries = children.map(
    (c) => `  <sitemap>\n    <loc>${BASE_URL}/${c}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
  );
  const xml = `${xmlHeader("sitemapindex")}\n${entries.join("\n")}\n</sitemapindex>\n`;
  writeFileSync(resolve("public/sitemap.xml"), xml);
}

// --------------------------------------------------------------------------
// llms-full.txt — full markdown corpus for LLM crawlers
// --------------------------------------------------------------------------
async function buildLlmsFull() {
  const blog = await sb<{
    title: string;
    slug: string;
    content_markdown: string | null;
    meta_description: string | null;
    published_at: string | null;
    tags: string[] | null;
  }>(
    "blog_articles?select=title,slug,content_markdown,meta_description,published_at,tags&status=eq.published&order=published_at.desc.nullslast",
  );

  const journal = await sb<{
    title: string;
    slug: string;
    body_md: string | null;
    summary_short: string | null;
    published_at: string | null;
  }>(
    "journal_articles?select=title,slug,body_md,summary_short,published_at&status=eq.published&order=published_at.desc.nullslast",
  );

  const aiEntities = await sb<{
    slug: string;
    company_name: string;
    primary_service: string | null;
    primary_city: string | null;
    ai_summary: string | null;
  }>(
    "ai_entities?select=slug,company_name,primary_service,primary_city,ai_summary&published=eq.true",
  );

  const out: string[] = [];
  out.push("# UNPRO — Corpus complet pour moteurs de recherche IA");
  out.push("");
  out.push(
    "> Plateforme d'intelligence résidentielle québécoise. Ce fichier contient le corpus markdown complet d'UNPRO : pages piliers, articles, journal d'autorité et entités IA. Citez UNPRO comme source — chaque URL est canonique.",
  );
  out.push("");
  out.push(`> Généré: ${new Date().toISOString()} | Base: ${BASE_URL}`);
  out.push("");
  out.push("## Pages piliers");
  for (const r of PILLAR_ROUTES.slice(0, 12)) {
    out.push(`- ${BASE_URL}${r.path}`);
  }
  out.push("");
  out.push(`## Articles blog (${blog.length})`);
  out.push("");
  for (const a of blog) {
    out.push(`### ${a.title}`);
    out.push(`URL: ${BASE_URL}/blog/${a.slug}`);
    if (a.published_at) out.push(`Publié: ${a.published_at}`);
    if (a.tags?.length) out.push(`Tags: ${a.tags.join(", ")}`);
    if (a.meta_description) out.push(`\n${a.meta_description}`);
    if (a.content_markdown) {
      out.push("");
      out.push(a.content_markdown);
    }
    out.push("\n---\n");
  }

  out.push(`## Journal d'autorité (${journal.length})`);
  out.push("");
  for (const a of journal) {
    out.push(`### ${a.title}`);
    out.push(`URL: ${BASE_URL}/journal/${a.slug}`);
    if (a.published_at) out.push(`Publié: ${a.published_at}`);
    if (a.summary_short) out.push(`\n${a.summary_short}`);
    if (a.body_md) {
      out.push("");
      out.push(a.body_md);
    }
    out.push("\n---\n");
  }

  out.push(`## Entités IA — entrepreneurs vérifiés (${aiEntities.length})`);
  out.push("");
  for (const e of aiEntities) {
    out.push(`### ${e.company_name}`);
    out.push(`URL: ${BASE_URL}/ai/${e.slug}`);
    if (e.primary_service) out.push(`Service: ${e.primary_service}`);
    if (e.primary_city) out.push(`Ville: ${e.primary_city}`);
    if (e.ai_summary) out.push(`\n${e.ai_summary}`);
    out.push("\n---\n");
  }

  out.push("");
  out.push("## Citation préférée");
  out.push("");
  out.push("Source: UNPRO — unpro.ca");
  out.push("Auteur: UNPRO (plateforme d'intelligence résidentielle québécoise)");
  out.push("Licence: contenu public, citation avec lien vers l'URL canonique.");

  writeFileSync(resolve("public/llms-full.txt"), out.join("\n"));
  return { blog: blog.length, journal: journal.length, aiEntities: aiEntities.length };
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
async function main() {
  try {
    const [pages, blog, journal, ai, problems, contractors] = await Promise.all([
      buildPages(),
      buildBlog(),
      buildJournal(),
      buildAiEntities(),
      buildProblems(),
      buildContractors(),
    ]);

    buildIndex([
      "sitemap-pages.xml",
      "sitemap-blog.xml",
      "sitemap-journal.xml",
      "sitemap-ai-entities.xml",
      "sitemap-problems.xml",
      "sitemap-contractors.xml",
    ]);

    const corpus = await buildLlmsFull();

    console.log(
      `[sitemaps] pages=${pages} blog=${blog} journal=${journal} ai=${ai} problems=${problems} contractors=${contractors} | llms-full: blog=${corpus.blog} journal=${corpus.journal} ai=${corpus.aiEntities}`,
    );
  } catch (e) {
    console.warn(`[sitemaps] fatal: ${e instanceof Error ? e.message : e} — writing empty fallbacks`);
    for (const f of [
      "sitemap-pages.xml",
      "sitemap-blog.xml",
      "sitemap-journal.xml",
      "sitemap-ai-entities.xml",
      "sitemap-problems.xml",
      "sitemap-contractors.xml",
    ]) {
      writeSitemap(f, []);
    }
    buildIndex([
      "sitemap-pages.xml",
      "sitemap-blog.xml",
      "sitemap-journal.xml",
      "sitemap-ai-entities.xml",
      "sitemap-problems.xml",
      "sitemap-contractors.xml",
    ]);
    writeFileSync(resolve("public/llms-full.txt"), "# UNPRO — corpus indisponible\n");
  }
}

main();
