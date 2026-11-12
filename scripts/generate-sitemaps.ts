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
 *   public/sitemap-seo-pages.xml    → seo_pages (published, routable, non-thin) → /s/:slug
 *   public/sitemap-articles.xml     → seo_articles (published, completed) → /articles/:slug
 *   public/llms-full.txt            → full markdown corpus for LLM crawlers
 *
 * Fail-soft: the build never blocks, but a failed (or suspiciously empty)
 * read NEVER overwrites a valid artifact — the previous file is kept and the
 * error is reported. The index lists only sub-sitemaps that contain URLs.
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { EDITORIAL_REVISIONS, editorialModifiedDate } from "../src/seo/editorialDates";
import {
  type FetchResult,
  type SeoArticleRow,
  type SeoPageRow,
  countLocs,
  dedupeByLoc,
  escapeXml,
  isSitemapEligibleSeoArticle,
  isSitemapEligibleSeoPage,
  lastmodFrom,
  planSitemapWrite,
  CLARA_PUBLIC_PATH,
} from "../src/seo/sitemapSources";

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
  ...["/vision", "/en/vision", "/articles/economiser-ensemble", "/en/articles/saving-together", "/communique", "/en/press-release"].map(path => ({ path, changefreq: "monthly", priority: "0.8" })),
  { path: "/c/isolation-solution-royal/subventions-renoclimat-logisvert", changefreq: "monthly", priority: "0.8" },
  { path: "/", changefreq: "weekly", priority: "1.0" },
  // Public Clara entry. Legacy /alex aliases render the same page with a canonical to it and are not listed.
  { path: CLARA_PUBLIC_PATH, changefreq: "weekly", priority: "0.9" },
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
  { path: "/calculateur-subventions", changefreq: "monthly", priority: "0.9" },
  { path: "/subventions/isolation-entretoit", changefreq: "monthly", priority: "0.8" },
  { path: "/subventions/fenetres-portes-patio", changefreq: "monthly", priority: "0.8" },
  { path: "/subventions/murs-exterieurs", changefreq: "monthly", priority: "0.8" },
  { path: "/subventions/isolation-fondations", changefreq: "monthly", priority: "0.8" },
  { path: "/subventions/thermopompes-logisvert", changefreq: "monthly", priority: "0.8" },
  { path: "/subventions/calfeutrage-logisvert", changefreq: "monthly", priority: "0.8" },
  { path: "/services", changefreq: "weekly", priority: "0.8" },
  { path: "/insonorisation", changefreq: "monthly", priority: "0.7" },
  { path: "/en/soundproofing", changefreq: "monthly", priority: "0.6" },
  { path: "/commission", changefreq: "monthly", priority: "0.6" },
  { path: "/en/commission", changefreq: "monthly", priority: "0.5" },
  { path: "/partenariat-performance", changefreq: "monthly", priority: "0.6" },
  { path: "/en/performance-partnership", changefreq: "monthly", priority: "0.5" },
  { path: "/problemes", changefreq: "weekly", priority: "0.8" },
  { path: "/tarifs", changefreq: "weekly", priority: "0.7" },
  { path: "/communaute", changefreq: "monthly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/a-propos", changefreq: "monthly", priority: "0.6" },
  { path: "/journal", changefreq: "weekly", priority: "0.8" },
  { path: "/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/articles", changefreq: "weekly", priority: "0.8" },
  { path: "/articles/fournisseur-peinture-plus-contrats", changefreq: "monthly", priority: "0.8" },
  { path: "/articles/moins-de-soumissions-plus-de-factures", changefreq: "monthly", priority: "0.8" },
  { path: "/articles/badges-choix-consommateur-2026", changefreq: "monthly", priority: "0.7" },
  { path: "/articles/verifier-grenier-avant-fenetres-thermopompe", changefreq: "monthly", priority: "0.7" },
  // Fiche canonique ISR (les pages /ai, /aipp, /ai-indexed-profiles en double sont retirées).
  { path: "/entrepreneur/isolation-solution-royal", changefreq: "weekly", priority: "0.7" },
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

const isoDate = lastmodFrom;

const failures: string[] = [];

function readPublic(file: string): string | null {
  const p = resolve(`public/${file}`);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

/** Writes a sitemap only when the plan allows it; returns the number of URLs now in the file. */
function writeSitemap(file: string, urls: string[], ok = true): number {
  const previous = countLocs(readPublic(file));
  if (planSitemapWrite(ok, urls.length, previous) === "keep") {
    const why = ok ? "empty result would wipe existing URLs" : "source read failed";
    failures.push(`${file}: ${why} — kept previous file (${previous} URLs)`);
    return previous;
  }
  const xml = `${xmlHeader("urlset")}\n${urls.join("\n")}${urls.length ? "\n" : ""}</urlset>\n`;
  writeFileSync(resolve(`public/${file}`), xml);
  return urls.length;
}

async function sbr<T = unknown>(path: string): Promise<FetchResult<T>> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, error: "missing backend config" };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    const rows = await r.json();
    if (!Array.isArray(rows)) return { ok: false, error: "unexpected payload" };
    return { ok: true, rows: rows as T[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Fetch + log; returns rows and whether the read succeeded. */
async function sb<T = unknown>(path: string): Promise<{ ok: boolean; rows: T[] }> {
  const res = await sbr<T>(path);
  if (!res.ok) {
    console.warn(`[sitemaps] ${path.split("?")[0]} → ${res.error}`);
    return { ok: false, rows: [] };
  }
  return { ok: true, rows: res.rows };
}

// --------------------------------------------------------------------------
// Per-source builders
// --------------------------------------------------------------------------
async function buildPages() {
  const urls = PILLAR_ROUTES.map((r) =>
    urlNode(`${BASE_URL}${r.path}`, EDITORIAL_REVISIONS[r.path], r.changefreq, r.priority),
  );
  writeSitemap("sitemap-pages.xml", urls);
  return urls.length;
}

async function buildBlog() {
  const { ok, rows } = await sb<{ slug: string; published_at: string | null; schema_json: { dateModified?: string } | null }>(
    "blog_articles?select=slug,published_at,schema_json&status=eq.published&order=published_at.desc.nullslast",
  );
  const urls = rows.map((r) =>
    urlNode(
      `${BASE_URL}/blog/${r.slug}`,
      isoDate(editorialModifiedDate(r.published_at, r.schema_json?.dateModified)),
      "weekly",
      "0.7",
    ),
  );
  return writeSitemap("sitemap-blog.xml", urls, ok);
}

async function buildJournal() {
  const { ok, rows } = await sb<{ slug: string; updated_at: string; published_at: string | null }>(
    "journal_articles?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc.nullslast",
  );
  const urls = rows.map((r) =>
    urlNode(
      `${BASE_URL}/journal/${r.slug}`,
      isoDate(editorialModifiedDate(r.published_at, undefined)),
      "weekly",
      "0.8",
    ),
  );
  return writeSitemap("sitemap-journal.xml", urls, ok);
}

async function buildAiEntities() {
  const { ok, rows } = await sb<{ slug: string; updated_at: string }>(
    "ai_entities?select=slug,updated_at&published=eq.true&order=updated_at.desc",
  );
  const urls = rows.map((r) =>
    urlNode(`${BASE_URL}/ai/${r.slug}`, isoDate(r.updated_at), "weekly", "0.8"),
  );
  return writeSitemap("sitemap-ai-entities.xml", urls, ok);
}

async function buildProblems() {
  const { ok: okProblems, rows: problems } = await sb<{ slug: string; updated_at: string }>(
    "home_problems?select=slug,updated_at&is_active=eq.true",
  );
  const { ok: okCities, rows: cityPages } = await sb<{
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
  return writeSitemap("sitemap-problems.xml", urls, okProblems && okCities);
}

async function buildContractors() {
  const { ok, rows } = await sb<{ slug: string }>(
    "v_contractor_full_public?select=slug&is_published=eq.true&slug=not.is.null",
  );
  const urls = rows.map((r) =>
    urlNode(`${BASE_URL}/entrepreneur/${r.slug}`, undefined, "weekly", "0.6"),
  );
  return writeSitemap("sitemap-contractors.xml", urls, ok);
}

/** Static pillar paths win over dynamic duplicates. */
const PILLAR_LOCS = new Set(PILLAR_ROUTES.map((r) => `${BASE_URL}${r.path}`));

async function buildSeoPages() {
  const { ok, rows } = await sb<SeoPageRow>(
    "seo_pages?select=slug,updated_at,title,meta_description,h1,body_md&is_published=eq.true&status=eq.published&order=updated_at.desc",
  );
  const items = dedupeByLoc(
    rows
      .filter(isSitemapEligibleSeoPage)
      .map((r) => ({ loc: `${BASE_URL}/s/${r.slug}`, lastmod: isoDate(r.updated_at) }))
      .filter((i) => !PILLAR_LOCS.has(i.loc)),
  );
  if (ok) console.log(`[sitemaps] seo_pages: ${items.length}/${rows.length} published pages pass the quality filter`);
  return writeSitemap("sitemap-seo-pages.xml", items.map((i) => urlNode(i.loc, i.lastmod, "monthly", "0.6")), ok);
}

async function buildSeoArticles() {
  const { ok, rows } = await sb<SeoArticleRow>(
    "seo_articles?select=slug,updated_at,title,meta_description,content_html,word_count,generation_status&published=eq.true&order=updated_at.desc",
  );
  const items = dedupeByLoc(
    rows
      .filter(isSitemapEligibleSeoArticle)
      .map((r) => ({ loc: `${BASE_URL}/articles/${r.slug}`, lastmod: isoDate(r.updated_at) }))
      .filter((i) => !PILLAR_LOCS.has(i.loc)),
  );
  if (ok) console.log(`[sitemaps] seo_articles: ${items.length}/${rows.length} published articles pass the quality filter`);
  return writeSitemap("sitemap-articles.xml", items.map((i) => urlNode(i.loc, i.lastmod, "monthly", "0.7")), ok);
}

// --------------------------------------------------------------------------
// Sitemap index
// --------------------------------------------------------------------------
function buildIndex(candidates: string[]) {
  // Only list sub-sitemaps that exist and contain at least one URL (an empty urlset is invalid).
  const children = candidates.filter((c) => countLocs(readPublic(c)) > 0);
  const entries = children.map(
    (c) => `  <sitemap>\n    <loc>${BASE_URL}/${c}</loc>\n  </sitemap>`,
  );
  const xml = `${xmlHeader("sitemapindex")}\n${entries.join("\n")}\n</sitemapindex>\n`;
  writeFileSync(resolve("public/sitemap.xml"), xml);
}

// --------------------------------------------------------------------------
// llms-full.txt — full markdown corpus for LLM crawlers
// --------------------------------------------------------------------------
async function buildLlmsFull() {
  const blogRes = await sb<{
    title: string;
    slug: string;
    content_markdown: string | null;
    meta_description: string | null;
    published_at: string | null;
    tags: string[] | null;
  }>(
    "blog_articles?select=title,slug,content_markdown,meta_description,published_at,tags&status=eq.published&order=published_at.desc.nullslast",
  );

  const journalRes = await sb<{
    title: string;
    slug: string;
    body_md: string | null;
    summary_short: string | null;
    published_at: string | null;
  }>(
    "journal_articles?select=title,slug,body_md,summary_short,published_at&status=eq.published&order=published_at.desc.nullslast",
  );

  const aiRes = await sb<{
    slug: string;
    company_name: string;
    primary_service: string | null;
    primary_city: string | null;
    ai_summary: string | null;
  }>(
    "ai_entities?select=slug,company_name,primary_service,primary_city,ai_summary&published=eq.true",
  );

  if (!blogRes.ok || !journalRes.ok || !aiRes.ok) {
    failures.push("llms-full.txt: source read failed — kept previous file");
    return null;
  }
  const blog = blogRes.rows;
  const journal = journalRes.rows;
  const aiEntities = aiRes.rows;

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

  // Skip rewrites that would only change the generation timestamp.
  const next = out.join("\n");
  const prev = readPublic("llms-full.txt");
  const strip = (t: string) => t.replace(/^> Généré: .*$/m, "");
  if (!prev || strip(prev) !== strip(next)) writeFileSync(resolve("public/llms-full.txt"), next);
  return { blog: blog.length, journal: journal.length, aiEntities: aiEntities.length };
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
const SUB_SITEMAPS = [
  "sitemap-pages.xml",
  "sitemap-blog.xml",
  "sitemap-journal.xml",
  "sitemap-ai-entities.xml",
  "sitemap-problems.xml",
  "sitemap-contractors.xml",
  "sitemap-seo-pages.xml",
  "sitemap-articles.xml",
];

async function main() {
  try {
    const [pages, blog, journal, ai, problems, contractors, seoPages, seoArticles] = await Promise.all([
      buildPages(),
      buildBlog(),
      buildJournal(),
      buildAiEntities(),
      buildProblems(),
      buildContractors(),
      buildSeoPages(),
      buildSeoArticles(),
    ]);
    buildIndex(SUB_SITEMAPS);
    const corpus = await buildLlmsFull();
    console.log(
      `[sitemaps] pages=${pages} blog=${blog} journal=${journal} ai=${ai} problems=${problems} contractors=${contractors} seo_pages=${seoPages} articles=${seoArticles}` +
        (corpus ? ` | llms-full: blog=${corpus.blog} journal=${corpus.journal} ai=${corpus.aiEntities}` : " | llms-full: kept"),
    );
  } catch (e) {
    // Never replace valid artifacts with empty fallbacks: keep what is on disk.
    failures.push(`fatal: ${e instanceof Error ? e.message : e}`);
  }
  if (failures.length) {
    console.error(`[sitemaps] ⚠️ ${failures.length} issue(s) — previous artifacts preserved:\n  - ${failures.join("\n  - ")}`);
  }
}

main();
