// Link-preview variants for tracked outreach URLs (SMS/email/social).
// Static pages public/p/<slug>.html carry the OG tags in the initial HTML
// (readable without JS) and forward humans to /r/<id> via JS, so preview bots
// never execute the redirect and are never counted as clicks.
// Priority: explicit campaign/objective > service+audience > destination page > neutral fallback.
// Images are versioned (-vN) for cache busting. Never a homeowner image for B2B.

export const PREVIEW_VERSION = "v1";
export const SITE = "https://unpro.ca";

export type PreviewVariant = { slug: string; lang: "fr" | "en"; title: string; description: string; cta: string; audience: "b2b" | "homeowner" | "neutral" };

export const PREVIEW_VARIANTS: Record<string, PreviewVariant> = {
  "activation": { slug: "activation", lang: "fr", audience: "b2b", title: "Votre expertise mérite les bons clients", description: "Activez votre profil UNPRO : 12 mois de présence IA UNPRO, 350 $ + taxes, paiement unique.", cta: "Voir mon activation" },
  "equipes-ventes": { slug: "equipes-ventes", lang: "fr", audience: "b2b", title: "Des rendez-vous adaptés à votre équipe", description: "Qualification progressive selon la capacité réelle de votre équipe de vente.", cta: "Voir la proposition" },
  "sales-teams-en": { slug: "sales-teams-en", lang: "en", audience: "b2b", title: "Appointments that fit your team", description: "Progressive qualification matched to your sales team's real capacity.", cta: "See the proposal" },
  "thermopompes": { slug: "thermopompes", lang: "fr", audience: "b2b", title: "Plus de projets de thermopompes centrales", description: "Pour les entrepreneurs qui ont déclaré installer des thermopompes centrales.", cta: "Voir l'offre" },
  "echange-demandes": { slug: "echange-demandes", lang: "fr", audience: "b2b", title: "Vos demandes hors cible peuvent encore servir", description: "Une proposition d'échange entre entrepreneurs pour les demandes hors spécialité, territoire ou capacité.", cta: "En savoir plus" },
  "proprietaires": { slug: "proprietaires", lang: "fr", audience: "homeowner", title: "Trouvez le bon pro pour vos travaux", description: "UNPRO vous aide à trouver le professionnel le plus compatible avec votre projet.", cta: "Décrire mon projet" },
  "unpro": { slug: "unpro", lang: "fr", audience: "neutral", title: "UNPRO", description: "Plateforme d'intelligence résidentielle québécoise.", cta: "Ouvrir" },
  "unpro-en": { slug: "unpro-en", lang: "en", audience: "neutral", title: "UNPRO", description: "Québec home intelligence platform.", cta: "Open" },
};

export type PreviewCtx = { objective?: string | null; campaign?: string | null; service?: string | null; audience?: string | null; lang?: string | null; destination_url?: string | null; heat_pump_declared?: boolean };

export function resolvePreviewSlug(ctx: PreviewCtx): string {
  const en = (ctx.lang ?? "").toLowerCase().startsWith("en");
  const pick = (fr: string, enSlug?: string) => (en && enSlug ? enSlug : fr);
  const obj = (ctx.objective ?? "").toLowerCase();
  if (obj && PREVIEW_VARIANTS[obj]) {
    if (obj === "thermopompes" && !ctx.heat_pump_declared) return pick("activation");
    return obj === "equipes-ventes" ? pick(obj, "sales-teams-en") : obj;
  }
  const camp = (ctx.campaign ?? "").toLowerCase();
  if (/sales[-_ ]?team|equipe|directeur/.test(camp)) return pick("equipes-ventes", "sales-teams-en");
  if (/echange|exchange|hors[-_ ]?cible/.test(camp)) return "echange-demandes";
  if (/activation|350|entrepreneur|contractor|relance/.test(camp)) {
    if (/thermopomp|heat[-_ ]?pump/.test(camp) && ctx.heat_pump_declared) return "thermopompes";
    return "activation";
  }
  const svc = (ctx.service ?? "").toLowerCase(); const aud = (ctx.audience ?? "").toLowerCase();
  if (aud === "contractor" || aud === "entrepreneur") return /thermopomp|heat/.test(svc) && ctx.heat_pump_declared ? "thermopompes" : "activation";
  if (aud === "homeowner" || aud === "proprietaire") return "proprietaires";
  let path = "";
  try { path = new URL(ctx.destination_url ?? "").pathname; } catch { /* ignore */ }
  if (/^\/directeur-des-ventes/.test(path)) return pick("equipes-ventes", "sales-teams-en");
  if (/^\/entrepreneurs?\/(activation|devis|plan|audit)|^\/entrepreneurs\/?$/.test(path)) return "activation";
  if (/^\/(proprietaires|diagnostic)/.test(path)) return "proprietaires";
  return pick("unpro", "unpro-en");
}

export function previewImageUrl(slug: string): string { return `${SITE}/og/link/${slug}-${PREVIEW_VERSION}.jpg`; }
export function previewLinkUrl(slug: string, trackingId: string): string { return `${SITE}/p/${slug}.html?c=${encodeURIComponent(trackingId)}`; }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function renderPreviewHtml(v: PreviewVariant): string {
  const img = previewImageUrl(v.slug); const url = `${SITE}/p/${v.slug}.html`;
  return `<!doctype html>
<html lang="${v.lang === "en" ? "en-CA" : "fr-CA"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(v.title)} — UNPRO</title>
<meta name="description" content="${esc(v.description)}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="UNPRO">
<meta property="og:locale" content="${v.lang === "en" ? "en_CA" : "fr_CA"}">
<meta property="og:title" content="${esc(v.title)}"><meta property="og:description" content="${esc(v.description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(v.title)}"><meta name="twitter:description" content="${esc(v.description)}"><meta name="twitter:image" content="${img}">
<script>(function(){var c=new URLSearchParams(location.search).get("c")||"";location.replace(/^[a-z0-9]{6,32}$/i.test(c)?"/r/"+c:"/");})();</script>
</head><body style="font-family:system-ui;padding:2rem"><p>${esc(v.title)}</p><p><a href="/">${esc(v.cta)}</a></p></body></html>
`;
}
