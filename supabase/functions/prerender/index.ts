/**
 * UNPRO — Prerender Edge Function
 * Serves static HTML snapshots to search engine crawlers (Googlebot, Bingbot, etc.)
 * Non-bot requests get redirected to the SPA.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://unpro.ca";
const BOT_UA = /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|facebookexternalhit|twitterbot|linkedinbot|slurp|ia_archiver|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|gptbot|chatgpt|claude/i;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function html(opts: {
  title: string; desc: string; canonical: string; h1: string;
  body: string; jsonLd?: object[]; ogImage?: string;
}): Response {
  const schemas = (opts.jsonLd || []).map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n");
  const ogImg = opts.ogImage || `${BASE}/og-default.png`;
  const page = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.desc)}">
<link rel="canonical" href="${esc(opts.canonical)}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.desc)}">
<meta property="og:url" content="${esc(opts.canonical)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:site_name" content="UNPRO">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(opts.title)}">
<meta name="twitter:description" content="${esc(opts.desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">
<link rel="alternate" hreflang="fr-CA" href="${esc(opts.canonical)}">
${schemas}
</head>
<body>
<header><nav><a href="${BASE}">UNPRO</a></nav></header>
<main>
<h1>${esc(opts.h1)}</h1>
${opts.body}
</main>
<footer><p>&copy; ${new Date().getFullYear()} UNPRO — Intelligence immobilière pour tous</p></footer>
</body>
</html>`;
  return new Response(page, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ua = req.headers.get("user-agent") || "";
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";

  // Only serve to bots
  if (!BOT_UA.test(ua)) {
    return new Response(null, { status: 302, headers: { ...corsHeaders, Location: `${BASE}${path}` } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    // ─── Contractor profile /entrepreneur/:slug ───
    const entMatch = path.match(/^\/entrepreneur\/([^/]+)$/);
    if (entMatch) {
      const slug = entMatch[1];
      const { data } = await sb.from("contractor_public_pages").select("*, contractors(business_name, city, specialty_tags, bio, aipp_score_snapshot)").eq("slug", slug).eq("is_published", true).maybeSingle();
      if (data?.contractors) {
        const c = data.contractors as any;
        const title = `${c.business_name} — Entrepreneur vérifié | UNPRO`;
        const desc = `Profil vérifié de ${c.business_name}${c.city ? ` à ${c.city}` : ""}. Services, avis et score AIPP sur UNPRO.`;
        const jsonLd = [{
          "@context": "https://schema.org", "@type": "LocalBusiness",
          name: c.business_name, address: { "@type": "PostalAddress", addressLocality: c.city || "", addressRegion: "QC", addressCountry: "CA" },
          description: c.bio || desc,
        }, {
          "@context": "https://schema.org", "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: BASE },
            { "@type": "ListItem", position: 2, name: "Entrepreneurs", item: `${BASE}/entrepreneurs` },
            { "@type": "ListItem", position: 3, name: c.business_name, item: `${BASE}/entrepreneur/${slug}` },
          ],
        }];
        const specialties = Array.isArray(c.specialty_tags) ? c.specialty_tags.join(", ") : "";
        const bodyHtml = `
<article>
<p>${esc(c.bio || `${c.business_name} est un entrepreneur vérifié sur UNPRO.`)}</p>
${c.city ? `<p><strong>Ville :</strong> ${esc(c.city)}</p>` : ""}
${specialties ? `<p><strong>Spécialités :</strong> ${esc(specialties)}</p>` : ""}
${c.aipp_score_snapshot ? `<p><strong>Score AIPP :</strong> ${c.aipp_score_snapshot}/100</p>` : ""}
<p><a href="${BASE}/entrepreneur/${slug}">Voir le profil complet sur UNPRO</a></p>
</article>`;
        return html({ title, desc, canonical: `${BASE}/entrepreneur/${slug}`, h1: c.business_name, body: bodyHtml, jsonLd });
      }
    }

    // ─── Blog ───
    const blogMatch = path.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
      const { data } = await sb.from("blog_articles").select("title, meta_description, content_markdown, slug, published_at").eq("slug", blogMatch[1]).eq("status", "published").maybeSingle();
      if (data) {
        const desc = data.meta_description || data.title;
        const bodyText = (data.content_markdown || "").slice(0, 2000);
        const jsonLd = [{ "@context": "https://schema.org", "@type": "Article", headline: data.title, description: desc, url: `${BASE}/blog/${data.slug}`, datePublished: data.published_at, author: { "@type": "Organization", name: "UNPRO" }, inLanguage: "fr-CA" }];
        return html({ title: `${data.title} | UNPRO`, desc, canonical: `${BASE}/blog/${data.slug}`, h1: data.title, body: `<article><p>${esc(bodyText)}</p></article>`, jsonLd });
      }
    }

    // ─── City page /ville/:slug ───
    const villeMatch = path.match(/^\/ville\/([^/]+)$/);
    if (villeMatch) {
      const { data } = await sb.from("cities").select("name, slug, region").eq("slug", villeMatch[1]).eq("is_active", true).maybeSingle();
      if (data) {
        const title = `Entrepreneurs vérifiés à ${data.name} | UNPRO`;
        const desc = `Trouvez des entrepreneurs de confiance à ${data.name}${data.region ? `, ${data.region}` : ""}. Vérifiés par UNPRO.`;
        return html({ title, desc, canonical: `${BASE}/ville/${data.slug}`, h1: `Entrepreneurs à ${data.name}`, body: `<p>${esc(desc)}</p><p><a href="${BASE}/ville/${data.slug}">Voir les entrepreneurs disponibles</a></p>` });
      }
    }

    // ─── Problem page /probleme/:slug ───
    const probMatch = path.match(/^\/probleme\/([^/]+)$/);
    if (probMatch) {
      const { data } = await sb.from("home_problems").select("name, slug, description").eq("slug", probMatch[1]).eq("is_active", true).maybeSingle();
      if (data) {
        const title = `${data.name} — Solutions et entrepreneurs | UNPRO`;
        const desc = data.description || `Trouvez des solutions pour ${data.name} avec des entrepreneurs vérifiés sur UNPRO.`;
        return html({ title, desc, canonical: `${BASE}/probleme/${data.slug}`, h1: data.name, body: `<p>${esc(desc)}</p>` });
      }
    }

    // ─── Service location /services/:cat/:city ───
    const svcMatch = path.match(/^\/services\/([^/]+)\/([^/]+)$/);
    if (svcMatch) {
      const title = `${svcMatch[1].replace(/-/g, " ")} à ${svcMatch[2].replace(/-/g, " ")} | UNPRO`;
      const desc = `Services de ${svcMatch[1].replace(/-/g, " ")} à ${svcMatch[2].replace(/-/g, " ")}. Entrepreneurs vérifiés sur UNPRO.`;
      return html({ title, desc, canonical: `${BASE}/services/${svcMatch[1]}/${svcMatch[2]}`, h1: title.replace(" | UNPRO", ""), body: `<p>${esc(desc)}</p>` });
    }

    // ─── Homepage ───
    if (path === "/" || path === "") {
      return html({
        title: "UNPRO — Trouvez un entrepreneur de confiance",
        desc: "UNPRO vous aide à trouver, comparer et évaluer des entrepreneurs vérifiés grâce à l'intelligence artificielle.",
        canonical: BASE,
        h1: "UNPRO — Intelligence immobilière pour tous",
        body: `<p>UNPRO est la plateforme québécoise qui utilise l'IA pour connecter propriétaires et entrepreneurs de confiance. Estimation instantanée, vérification complète, prise de rendez-vous directe.</p>
<section><h2>Services</h2><ul><li>Estimation instantanée de vos travaux</li><li>Vérification d'entrepreneurs (RBQ, NEQ, avis)</li><li>Score AIPP — Performance numérique</li><li>Passeport Maison</li></ul></section>`,
        jsonLd: [
          { "@context": "https://schema.org", "@type": "WebSite", name: "UNPRO", url: BASE, potentialAction: { "@type": "SearchAction", target: `${BASE}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
          { "@context": "https://schema.org", "@type": "Organization", name: "UNPRO", url: BASE, logo: `${BASE}/logo.png` },
        ],
      });
    }

    // ─── Fallback: generic page ───
    const cleanTitle = path.replace(/\//g, " ").replace(/-/g, " ").trim();
    return html({
      title: `${cleanTitle} | UNPRO`,
      desc: `Découvrez ${cleanTitle} sur UNPRO — la plateforme québécoise d'intelligence immobilière.`,
      canonical: `${BASE}${path}`,
      h1: cleanTitle,
      body: `<p>Visitez <a href="${BASE}${path}">cette page sur UNPRO</a> pour plus de détails.</p>`,
    });

  } catch (err) {
    console.error("Prerender error:", err);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
