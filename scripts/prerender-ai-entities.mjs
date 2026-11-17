/**
 * UNPRO: initial HTML for approved public /ai/:slug pages.
 * The existing Vite scripts replace this snapshot with the interactive
 * React page for browsers. Crawlers without JS can read the basic facts.
 * Snapshot is supplied by prebuild from published=true rows only.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const BASE = "https://unpro.ca";
const SNAPSHOT = resolve(".seo-cache/ai-entities.json");
const DIST = resolve("dist");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function escapeHtml(value) {
  return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}
function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function renderEntityHtml(template, entity) {
  const slug = entity?.slug;
  if (!slug || slug.length > 100 || !SLUG.test(slug)) return null;
  if (typeof entity.company_name !== "string" || !entity.company_name.trim()) return null;
  const name = entity.company_name.trim();
  const city = typeof entity.primary_city === "string" ? entity.primary_city.trim() : "";
  const service = typeof entity.primary_service === "string" ? entity.primary_service.trim() : "";
  const summary = typeof entity.ai_summary === "string" ? entity.ai_summary.trim().slice(0,3000) : "";
  const canonical = BASE + "/ai/" + slug;
  const title = name + (service ? " — " + service : "") + (city ? " à " + city : "") + " | UNPRO";
  const description = summary || name + " : fiche d'entreprise publiée sur UNPRO.";
  const business = {
    "@context": "https://schema.org", "@type": "LocalBusiness",
    "@id": canonical + "#business", name, url: canonical, description,
    ...(city ? { address: { "@type": "PostalAddress", addressLocality: city, addressRegion: "QC", addressCountry: "CA" } } : {}),
    ...(service ? { knowsAbout: [service] } : {}),
    isPartOf: { "@id": BASE + "/#website" },
  };
  const meta = [
    '<link rel="canonical" href="' + escapeHtml(canonical) + '" />',
    '<meta name="description" content="' + escapeHtml(description.slice(0,300)) + '" />',
    '<meta property="og:title" content="' + escapeHtml(title) + '" />',
    '<meta property="og:description" content="' + escapeHtml(description.slice(0,300)) + '" />',
    '<meta property="og:url" content="' + escapeHtml(canonical) + '" />',
    '<meta property="og:type" content="profile" />',
    '<meta name="robots" content="index,follow,max-image-preview:large" />',
    '<script type="application/ld+json">' + jsonForHtml(business) + '</script>',
    '<style>#unpro-seo-profile{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:3rem auto;padding:1.5rem;color:#202020}#unpro-seo-profile h1{font-size:2rem;line-height:1.2}#unpro-seo-profile a{color:#005b8f}</style>',
  ].join("\n");
  const body = [
    '<main id="unpro-seo-profile">',
    '<h1>' + escapeHtml(name) + '</h1>',
    (service || city ? '<p>' + escapeHtml([service,city].filter(Boolean).join(" · ")) + '</p>' : ""),
    '<p>' + escapeHtml(description) + '</p>',
    '<p>Fiche publiée sur UNPRO. Une licence, une assurance ou une disponibilité doit être confirmée individuellement; la publication seule ne constitue pas une vérification.</p>',
    '<p><a href="' + escapeHtml(BASE) + '">Découvrir UNPRO et parler à Clara</a></p>',
    '</main>',
  ].join("\n");
  let html = template
    .replace(/<(?:meta|link)\s+data-static-head\b[^>]*>/g,"")
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(title) + '</title>')
    .replace(/<meta name="robots" content="index,follow"\s*\/?>/,"");
  if (!html.includes("</head>") || !html.includes('<div id="root"></div>')) {
    throw new Error("Unexpected Vite HTML shell");
  }
  return html.replace("</head>",meta + "\n</head>")
    .replace('<div id="root"></div>','<div id="root">' + body + '</div>');
}

function main() {
  if (!existsSync(SNAPSHOT)) {
    console.warn("[seo-prerender] No fresh public snapshot. Interactive routes preserved.");
    return;
  }
  try {
    const entities = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
    if (!Array.isArray(entities)) throw new Error("Invalid published entity snapshot");
    const template = readFileSync(join(DIST,"index.html"),"utf8");
    let written = 0;
    for (const entity of entities) {
      const html = renderEntityHtml(template,entity);
      if (!html) continue;
      const dest = join(DIST,"ai",entity.slug,"index.html");
      mkdirSync(dirname(dest),{recursive:true});
      writeFileSync(dest,html,"utf8");
      written++;
    }
    console.log("[seo-prerender] Wrote " + written + " public AI profile HTML snapshots");
  } catch (e) {
    console.error("[seo-prerender] Failed:",e);
    process.exitCode = 1;
  } finally {
    rmSync(SNAPSHOT,{force:true});
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
