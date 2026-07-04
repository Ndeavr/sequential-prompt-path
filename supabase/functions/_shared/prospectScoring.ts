// Acquisition priority scoring — deterministic 0..100 score used to route
// contractor prospects into activation queues (A/B/C/D).

export interface ProspectScoringInput {
  review_count?: number | null;
  review_rating?: number | null;
  has_website: boolean;
  website_quality?: "none" | "weak" | "strong" | "agency";
  has_mobile: boolean;
  aggregator_email: boolean;
  valid_email: boolean;
  gbp_completeness?: "complete" | "partial" | "poor" | "none";
  service_area_count?: number | null;
}

export interface ProspectScoringResult {
  score: number;
  website_quality_score: number;
  breakdown: Record<string, number>;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export function scoreProspect(p: ProspectScoringInput): ProspectScoringResult {
  // Reviews
  const rc = p.review_count ?? 0;
  let review = 0;
  if (rc === 0) review = -50;
  else if (rc < 25) review = 15;
  else if (rc < 100) review = 25;
  else review = 35;
  if ((p.review_rating ?? 0) >= 4.7) review += 10;

  // Website (also the persisted website_quality_score column)
  let website = 0;
  if (!p.has_website || p.website_quality === "none") website = 20;
  else if (p.website_quality === "weak") website = 10;
  else if (p.website_quality === "strong") website = 0;
  else if (p.website_quality === "agency") website = -10;

  const mobile = p.has_mobile ? 10 : 0;

  let gbp = 0;
  switch (p.gbp_completeness) {
    case "complete": gbp = 15; break;
    case "partial":  gbp = 5;  break;
    default:         gbp = 0;
  }

  const email = p.valid_email && !p.aggregator_email ? 5 : 0;
  const serviceArea = (p.service_area_count ?? 0) >= 3 ? 5 : 0;

  const raw = 50 + review + website + mobile + gbp + email + serviceArea;
  const score = clamp(Math.round(raw), 0, 100);

  return {
    score,
    website_quality_score: website,
    breakdown: { review, website, mobile, gbp, email, serviceArea, base: 50 },
  };
}

export function queueTier(score: number): "A_ready" | "B_high" | "C_medium" | "D_ignore" {
  if (score >= 90) return "A_ready";
  if (score >= 75) return "B_high";
  if (score >= 50) return "C_medium";
  return "D_ignore";
}

// Fast website quality classifier (cheap HEAD + tiny GET). Never throws.
export async function classifyWebsite(url: string | null | undefined): Promise<{
  has_website: boolean;
  quality: "none" | "weak" | "strong" | "agency";
}> {
  if (!url) return { has_website: false, quality: "none" };
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(normalized, { method: "GET", redirect: "follow", signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return { has_website: false, quality: "none" };
    const isHttps = res.url.startsWith("https://");
    const html = (await res.text()).slice(0, 60_000).toLowerCase();
    const hasMeta = html.includes('name="description"') || html.includes("<meta property=\"og:");
    const hasViewport = html.includes('name="viewport"');
    const scriptCount = (html.match(/<script/g) ?? []).length;
    const hasTracking = html.includes("gtag(") || html.includes("googletagmanager.com") || html.includes("fbq(");
    const hasBlog = html.includes("/blog") || html.includes("wp-content");
    if (scriptCount >= 15 && hasTracking && hasBlog) return { has_website: true, quality: "agency" };
    if (isHttps && hasMeta && hasViewport) return { has_website: true, quality: "strong" };
    return { has_website: true, quality: "weak" };
  } catch (_) {
    return { has_website: false, quality: "none" };
  }
}
