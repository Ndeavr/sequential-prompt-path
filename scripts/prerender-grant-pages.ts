/**
 * Crawlable SEO snapshots for the public UNPRO grant calculator routes.
 * Runs locally after Vite build, no Lovable credits, no service calls.
 *
 * The static HTML includes useful text even without JavaScript. When JS
 * loads, React's createRoot replaces the snapshot with the full calculator.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GRANT_SEO_PAGES, GRANT_SOURCES, GRANT_WORKS } from "../src/lib/grantCalculator2026";

const root = resolve("dist");
const index = readFileSync(join(root, "index.html"), "utf8");

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const routes = [
  { path: "/calculateur-subventions", key: "calculateur-subventions" },
  ...GRANT_WORKS.map((work) => ({
    path: work.page,
    key: work.page.split("/").at(-1)!,
  })),
];

for (const { path, key } of routes) {
  const content = GRANT_SEO_PAGES[key];
  if (!content) throw new Error(`No grant content for ${path}`);
  const url = `https://unpro.ca${path}`;
  const title = escapeHtml(content.title);
  const description = escapeHtml(content.description);
  const faqHtml = content.faq.map(f => `<section><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></section>`).join("\n");
  const routeLinks = GRANT_WORKS.map(w => `<li><a href="${w.page}">${escapeHtml(w.label)}</a></li>`).join("\n");
  const sourceLinks = Object.entries(GRANT_SOURCES).map(([name, href]) => `<li><a href="${href}">${escapeHtml(name)}</a></li>`).join("\n");
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org", "@type": "WebPage", name: content.title, url,
    description: content.description, inLanguage: "fr-CA",
    isPartOf: { "@type": "WebSite", name: "UNPRO", url: "https://unpro.ca/" },
  }).replace(/</g, "\\u003c");
  const staticBody = `<main aria-label="Calculateur et informations sur les subventions de rénovation au Québec">
    <header><p>UNPRO · Outil de rénovation énergétique gratuit · Québec · Novembre 2026</p><h1>${escapeHtml(content.h1)}</h1>
      <p>${escapeHtml(content.intro)}</p><p>Estimation indicative seulement. UNPRO n'est affiliée ni au gouvernement du Québec ni à Hydro-Québec.</p></header>
    <section><h2>Estimer les aides disponibles</h2><p>Le calculateur interactif est disponible lorsque JavaScript est activé.</p></section>
    <section><h2>Questions fréquentes</h2>${faqHtml}</section>
    <nav aria-label="Guides sur les subventions"><h2>Autres aides financières</h2><ul>${routeLinks}</ul></nav>
    <footer><h2>Sources officielles</h2><ul>${sourceLinks}</ul></footer>
  </main>`;

  let html = index
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta data-static-head name="description"[^>]*>/, `<meta data-static-head name="description" content="${description}" />`)
    .replace(/<link data-static-head rel="canonical"[^>]*>/, `<link data-static-head rel="canonical" href="${url}" />`)
    .replace(/<meta data-static-head property="og:title"[^>]*>/, `<meta data-static-head property="og:title" content="${title}" />`)
    .replace(/<meta data-static-head property="og:description"[^>]*>/, `<meta data-static-head property="og:description" content="${description}" />`)
    .replace(/<meta data-static-head property="og:url"[^>]*>/, `<meta data-static-head property="og:url" content="${url}" />`)
    .replace('<div id="root"></div>', `<div id="root">${staticBody}</div>`)
    .replace('</head>', `  <script type="application/ld+json">${jsonLd}</script>\n  </head>`);
  if (!html.includes('<main aria-label="Calculateur') || !html.includes(`rel="canonical" href="${url}"`)) {
    throw new Error(`Invalid SEO snapshot for ${path}`);
  }
  const outdir = join(root, path.slice(1));
  mkdirSync(outdir, { recursive: true });
  writeFileSync(join(outdir, "index.html"), html, "utf8");
  process.stdout.write(`[grants-seo] ${path} generated\n`);
}
