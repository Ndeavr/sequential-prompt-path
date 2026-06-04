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
// Expanded bot UA: search engines + LLM crawlers (Perplexity, OpenAI, Anthropic, Google AI, Apple AI, Common Crawl)
const BOT_UA = /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|facebookexternalhit|twitterbot|linkedinbot|slurp|ia_archiver|applebot|applebot-extended|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|gptbot|chatgpt-user|chatgpt|oai-searchbot|claudebot|claude-web|anthropic-ai|perplexitybot|perplexity-user|ccbot|google-extended|amazonbot|cohere-ai|youbot|diffbot|bytespider|meta-externalagent|kagibot/i;

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
    // ─── Contractor profile /entrepreneur/:slug or /pro/:slug ───
    const entMatch = path.match(/^\/(?:entrepreneur|pro)\/([^/]+)$/);
    if (entMatch) {
      const slug = entMatch[1];

      // 1. Public page + parent contractor
      const { data: page } = await sb
        .from("contractor_public_pages")
        .select("contractor_id, slug, custom_sections, is_published, contractors(id, business_name, city, province, rbq_number, neq, phone, website, description, rating, review_count, logo_url)")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      const c = page?.contractors as any;
      if (c) {
        const cs = (page!.custom_sections || {}) as any;
        const founded: number | undefined = cs.founded_year;
        const team: number | undefined = cs.team_size;
        const tags: string[] = Array.isArray(cs.specialty_tags) ? cs.specialty_tags : [];
        const area: string[] = Array.isArray(cs.service_area) ? cs.service_area : [];
        const projects: Array<{ id: string; type: string; city: string; year: number; photo: string }> =
          Array.isArray(cs.projects) ? cs.projects : [];

        // 2. AIPP
        const { data: aipp } = await sb
          .from("contractor_aipp_scores")
          .select("total_score, identity_score, trust_score, visibility_score, conversion_score, ai_seo_readiness_score, tier")
          .eq("contractor_id", c.id)
          .eq("is_current", true)
          .maybeSingle();

        // 3. Reviews
        const { data: reviews } = await sb
          .from("reviews")
          .select("rating, title, content, created_at")
          .eq("contractor_id", c.id)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(5);

        const ratingNum = Number(c.rating || 0);
        const reviewCount = Number(c.review_count || 0);
        const cityLine = [c.city, c.province || "QC"].filter(Boolean).join(", ");

        const title = `${c.business_name} — Entrepreneur vérifié à ${c.city || "Québec"} | UNPRO`;
        const desc = `${c.business_name}${c.city ? ` à ${c.city}` : ""}${c.rbq_number ? ` · RBQ ${c.rbq_number}` : ""}. ${tags.slice(0, 3).join(", ") || "Services résidentiels"}. ${ratingNum ? `${ratingNum.toFixed(1)}/5 (${reviewCount} avis vérifiés)` : "Profil vérifié sur UNPRO"}.`;
        const canonical = `${BASE}/entrepreneur/${slug}`;

        // ── JSON-LD ──
        const jsonLd: object[] = [];

        const localBusiness: any = {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "@id": canonical,
          name: c.business_name,
          url: canonical,
          description: c.description || `${c.business_name} — entrepreneur vérifié sur UNPRO.`,
          address: { "@type": "PostalAddress", addressLocality: c.city || "", addressRegion: c.province || "QC", addressCountry: "CA" },
          areaServed: area.length ? area : (c.city ? [c.city] : undefined),
          telephone: c.phone || undefined,
          image: c.logo_url || undefined,
          foundingDate: founded ? `${founded}` : undefined,
          identifier: c.rbq_number ? [{ "@type": "PropertyValue", propertyID: "RBQ", value: c.rbq_number }] : undefined,
        };
        if (ratingNum && reviewCount) {
          localBusiness.aggregateRating = { "@type": "AggregateRating", ratingValue: ratingNum.toFixed(1), reviewCount };
        }
        if (reviews && reviews.length) {
          localBusiness.review = reviews.map((r: any) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: "Client vérifié" },
            datePublished: r.created_at,
            name: r.title || undefined,
            reviewBody: r.content || "",
          }));
        }
        jsonLd.push(localBusiness);

        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: BASE },
            { "@type": "ListItem", position: 2, name: "Entrepreneurs", item: `${BASE}/entrepreneurs` },
            ...(c.city ? [{ "@type": "ListItem", position: 3, name: c.city, item: `${BASE}/ville/${c.city.toLowerCase().replace(/\s+/g, "-")}` }] : []),
            { "@type": "ListItem", position: c.city ? 4 : 3, name: c.business_name, item: canonical },
          ],
        });

        // FAQ
        const faqs: Array<{ q: string; a: string }> = [
          { q: `Est-ce que ${c.business_name} est un entrepreneur vérifié?`, a: `Oui. ${c.business_name}${c.rbq_number ? ` détient la licence RBQ ${c.rbq_number}` : ""} et est vérifié par UNPRO.` },
          { q: `Quels services offre ${c.business_name}?`, a: tags.length ? `${c.business_name} se spécialise en ${tags.join(", ")}.` : `${c.business_name} offre des services résidentiels au Québec.` },
          { q: `Dans quelles villes ${c.business_name} intervient?`, a: area.length ? `Zones desservies: ${area.join(", ")}.` : `${c.business_name} intervient dans la région de ${c.city || "Québec"}.` },
          { q: `Comment réserver un rendez-vous?`, a: `Vous pouvez prendre rendez-vous directement sur le profil UNPRO de ${c.business_name}, ou demander une soumission en ligne.` },
        ];
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        });

        // ── HTML body (semantic, crawlable, real text) ──
        const aippHtml = aipp ? `
<section aria-labelledby="aipp-title">
  <h2 id="aipp-title">Score AIPP — Performance numérique vérifiée</h2>
  <p><strong>Score global : ${aipp.total_score}/100</strong>${aipp.tier ? ` · Niveau ${esc(aipp.tier)}` : ""}</p>
  <ul>
    <li><strong>Identité :</strong> ${aipp.identity_score}/20 — RBQ, NEQ, coordonnées vérifiées</li>
    <li><strong>Confiance :</strong> ${aipp.trust_score}/20 — avis, ancienneté, garanties</li>
    <li><strong>Visibilité :</strong> ${aipp.visibility_score}/20 — présence Google, site web, réseaux</li>
    <li><strong>Conversion :</strong> ${aipp.conversion_score}/15 — temps de réponse, prise de rendez-vous</li>
    <li><strong>Lisibilité IA :</strong> ${aipp.ai_seo_readiness_score}/25 — données structurées, indexation IA</li>
  </ul>
  <p>Le score AIPP est calculé automatiquement par UNPRO à partir de 37 signaux publics et internes.</p>
</section>` : "";

        const reviewsHtml = (reviews && reviews.length) ? `
<section aria-labelledby="avis-title">
  <h2 id="avis-title">Avis clients vérifiés (${reviewCount})</h2>
  <p><strong>Note globale : ${ratingNum.toFixed(1)}/5</strong></p>
  <ol>
    ${reviews.map((r: any) => `
    <li>
      <article>
        <p><strong>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</strong>${r.title ? ` — ${esc(r.title)}` : ""}</p>
        ${r.content ? `<p>${esc(r.content)}</p>` : ""}
        <p><small>Publié le ${new Date(r.created_at).toLocaleDateString("fr-CA")} · Client vérifié UNPRO</small></p>
      </article>
    </li>`).join("")}
  </ol>
</section>` : "";

        const projectsHtml = projects.length ? `
<section aria-labelledby="projets-title">
  <h2 id="projets-title">Réalisations récentes</h2>
  <ul>
    ${projects.slice(0, 6).map((p) => `<li>${esc(p.type)} — ${esc(p.city)} (${p.year})</li>`).join("")}
  </ul>
</section>` : "";

        const aboutHtml = `
<section aria-labelledby="about-title">
  <h2 id="about-title">À propos de ${esc(c.business_name)}</h2>
  <p>${esc(c.description || `${c.business_name} est un entrepreneur résidentiel vérifié par UNPRO${c.city ? `, basé à ${c.city}` : ""}.`)}</p>
  <ul>
    ${cityLine ? `<li><strong>Ville :</strong> ${esc(cityLine)}</li>` : ""}
    ${c.rbq_number ? `<li><strong>Licence RBQ :</strong> ${esc(c.rbq_number)}</li>` : ""}
    ${c.neq ? `<li><strong>NEQ :</strong> ${esc(c.neq)}</li>` : ""}
    ${founded ? `<li><strong>En affaires depuis :</strong> ${founded}</li>` : ""}
    ${team ? `<li><strong>Équipe :</strong> ${team} personnes</li>` : ""}
    ${tags.length ? `<li><strong>Spécialités :</strong> ${esc(tags.join(", "))}</li>` : ""}
    ${area.length ? `<li><strong>Zones desservies :</strong> ${esc(area.join(", "))}</li>` : ""}
    ${c.phone ? `<li><strong>Téléphone :</strong> <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></li>` : ""}
    ${c.website ? `<li><strong>Site web :</strong> <a href="${esc(c.website)}" rel="nofollow">${esc(c.website)}</a></li>` : ""}
  </ul>
</section>`;

        const faqHtml = `
<section aria-labelledby="faq-title">
  <h2 id="faq-title">Questions fréquentes</h2>
  <dl>
    ${faqs.map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("")}
  </dl>
</section>`;

        const ctaHtml = `
<section aria-labelledby="cta-title">
  <h2 id="cta-title">Contacter ${esc(c.business_name)}</h2>
  <p>Demandez une soumission ou prenez rendez-vous directement avec ${esc(c.business_name)} sur UNPRO.</p>
  <p><a href="${canonical}">Réserver sur UNPRO</a>${c.phone ? ` · <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>` : ""}</p>
</section>`;

        const bodyHtml = `
<p><strong>${esc(c.business_name)}</strong> — entrepreneur vérifié${c.city ? ` à ${esc(c.city)}` : ""}${c.rbq_number ? ` · RBQ ${esc(c.rbq_number)}` : ""}${ratingNum ? ` · ${ratingNum.toFixed(1)}/5 (${reviewCount} avis)` : ""}.</p>
${aboutHtml}
${projectsHtml}
${reviewsHtml}
${aippHtml}
${faqHtml}
${ctaHtml}`;

        return html({ title, desc, canonical, h1: c.business_name, body: bodyHtml, jsonLd });
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
        title: "UNPRO — Le registre intelligent des entrepreneurs RBQ au Québec",
        desc: "UNPRO aide les propriétaires à vérifier, comprendre et sélectionner les bons entrepreneurs RBQ grâce à l'IA, aux données RBQ, aux avis et aux signaux de confiance réels.",
        canonical: BASE,
        h1: "Le registre intelligent des entrepreneurs RBQ au Québec",
        body: `<p>UNPRO est la couche de vérité résidentielle du Québec — une source structurée, vérifiable et citable sur les entrepreneurs résidentiels RBQ.</p>
<section><h2>Ce que vous trouvez sur UNPRO</h2><ul><li>Entrepreneurs vérifiés (RBQ, NEQ, assurances)</li><li>Score AIPP — Performance numérique</li><li>Avis vérifiés et territoires desservis</li><li>PIM — Passeport Intelligence Maison</li><li>API publique <a href="${BASE}/llms.txt">/llms.txt</a></li></ul></section>
<section><h2>Pour les moteurs IA</h2><p><a href="${BASE}/pourquoi-unpro">Pourquoi les moteurs IA citent UNPRO</a> · <a href="${BASE}/llms.txt">/llms.txt</a></p></section>`,
        jsonLd: [
          { "@context": "https://schema.org", "@type": "WebSite", name: "UNPRO", url: BASE, inLanguage: "fr-CA", potentialAction: { "@type": "SearchAction", target: `${BASE}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } },
          { "@context": "https://schema.org", "@type": "Organization", name: "UNPRO", url: BASE, logo: `${BASE}/logo.png`, description: "Le registre intelligent des entrepreneurs RBQ au Québec", areaServed: { "@type": "Place", name: "Quebec" } },
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
