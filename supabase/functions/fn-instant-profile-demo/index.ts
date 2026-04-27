/**
 * UNPRO — fn-instant-profile-demo
 * Public cold-entry: takes ANY signal (phone | website | business_name | google_url)
 * and returns instantly:
 *   - Enriched business profile (logo, photos, address, rating, reviews)
 *   - AIPP score breakdown (8 categories)
 *   - Estimated revenue gap (lost clients/month)
 *   - Recommended plan
 * No auth required. No DB write required (demo-grade — caller can persist).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhone(p?: string | null): string {
  return (p || "").replace(/\D/g, "");
}
function extractDomain(url?: string | null): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return (url || "").replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0].toLowerCase();
  }
}

interface DemoInput {
  phone?: string;
  website?: string;
  business_name?: string;
  google_url?: string;
  city?: string;
}

interface ProfilePayload {
  business_name: string;
  phone: string;
  website: string;
  domain: string;
  address: string;
  city: string;
  province: string;
  rating: number;
  review_count: number;
  category: string;
  hours: string[];
  photos: { url: string }[];
  logo_url: string | null;
  description: string;
  years_active: number | null;
  is_mock: boolean;
  match_confidence: number;
}

async function gmbLookup(input: DemoInput): Promise<ProfilePayload> {
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  const phoneDigits = normalizePhone(input.phone);
  const domain = extractDomain(input.website || input.google_url);

  // Build a query that maximises hits across signals
  const query = [
    input.business_name,
    domain,
    input.phone,
    input.city,
    "Québec",
  ]
    .filter(Boolean)
    .join(" ");

  if (apiKey && query.trim().length > 2) {
    try {
      const res = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.regularOpeningHours,places.photos,places.editorialSummary,places.iconMaskBaseUri,places.addressComponents",
          },
          body: JSON.stringify({
            textQuery: query,
            languageCode: "fr",
            regionCode: "ca",
            maxResultCount: 5,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const places: any[] = data.places || [];
        if (places.length > 0) {
          // Score by phone / domain match if possible
          const ranked = places
            .map((p) => {
              let score = 0;
              if (phoneDigits && normalizePhone(p.internationalPhoneNumber) === phoneDigits) score += 50;
              if (domain && extractDomain(p.websiteUri) === domain) score += 40;
              if (input.business_name) {
                const a = input.business_name.toLowerCase();
                const b = (p.displayName?.text || "").toLowerCase();
                if (b.includes(a) || a.includes(b)) score += 20;
              }
              return { place: p, score };
            })
            .sort((a, b) => b.score - a.score);
          const best = ranked[0].place;
          const cityComp = best.addressComponents?.find((c: any) =>
            c.types?.includes("locality")
          );
          const provComp = best.addressComponents?.find((c: any) =>
            c.types?.includes("administrative_area_level_1")
          );
          return {
            business_name: best.displayName?.text || input.business_name || "Votre entreprise",
            phone: best.internationalPhoneNumber || input.phone || "",
            website: best.websiteUri || input.website || "",
            domain: extractDomain(best.websiteUri || input.website),
            address: best.formattedAddress || "",
            city: cityComp?.longText || input.city || "",
            province: provComp?.longText || "Québec",
            rating: best.rating || 0,
            review_count: best.userRatingCount || 0,
            category: best.primaryTypeDisplayName?.text || "Entrepreneur",
            hours: best.regularOpeningHours?.weekdayDescriptions || [],
            photos: (best.photos || []).slice(0, 6).map((ph: any) => ({
              url: `https://places.googleapis.com/v1/${ph.name}/media?key=${apiKey}&maxWidthPx=800`,
            })),
            logo_url: best.iconMaskBaseUri ? `${best.iconMaskBaseUri}.png` : null,
            description: best.editorialSummary?.text || "",
            years_active: null,
            is_mock: false,
            match_confidence: Math.min(1, ranked[0].score / 100),
          };
        }
      } else {
        console.warn("Google Places API non-OK:", res.status, await res.text());
      }
    } catch (err) {
      console.error("GMB lookup failed:", err);
    }
  }

  // Mock fallback — still magical UX
  const name = input.business_name || (domain ? domain.split(".")[0] : null) || "Votre entreprise";
  const city = input.city || "Montréal";
  return {
    business_name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
    phone: input.phone || "",
    website: input.website || (domain ? `https://${domain}` : ""),
    domain: domain || "",
    address: `Quelque part à ${city}, QC`,
    city,
    province: "Québec",
    rating: 4.2,
    review_count: 18,
    category: "Entrepreneur résidentiel",
    hours: [
      "Lun: 08h–17h", "Mar: 08h–17h", "Mer: 08h–17h",
      "Jeu: 08h–17h", "Ven: 08h–17h", "Sam: Fermé", "Dim: Fermé",
    ],
    photos: [],
    logo_url: null,
    description: `Services résidentiels à ${city} et environs.`,
    years_active: null,
    is_mock: true,
    match_confidence: 0.4,
  };
}

interface AippBreakdown {
  visibility: number;
  conversion: number;
  reviews: number;
  seo: number;
  trust: number;
  branding: number;
  speed: number;
  ai_structure: number;
}

function computeAipp(p: ProfilePayload): { score: number; breakdown: AippBreakdown } {
  const reviewsScore = Math.min(100, Math.round((p.review_count / 50) * 100));
  const visibility = Math.round(
    (p.rating ? Math.min(100, p.rating * 18) : 20) * 0.5 +
      reviewsScore * 0.5
  );
  const trust = p.rating >= 4.3 ? 70 : p.rating >= 3.5 ? 45 : 25;
  const branding = p.logo_url ? 55 : 30;
  const seo = p.website ? 45 : 12;
  const speed = p.website ? 58 : 0;
  const ai_structure = 5; // most contractors have nothing — honest baseline
  const conversion = p.website ? 28 : 8;

  const breakdown: AippBreakdown = {
    visibility,
    conversion,
    reviews: Math.min(100, reviewsScore),
    seo,
    trust,
    branding,
    speed,
    ai_structure,
  };

  const score = Math.round(
    visibility * 0.18 +
      conversion * 0.18 +
      breakdown.reviews * 0.12 +
      seo * 0.12 +
      trust * 0.14 +
      branding * 0.08 +
      speed * 0.08 +
      ai_structure * 0.10
  );

  return { score, breakdown };
}

function computeRevenueGap(score: number, rating: number): { lost_min: number; lost_max: number; lost_revenue_min: number } {
  // Lower score → more lost clients/month
  const base = Math.max(2, Math.round((100 - score) / 6));
  const ratingPenalty = rating < 4 ? 4 : 0;
  const lost_min = base + ratingPenalty;
  const lost_max = lost_min + Math.round(base * 0.7) + 4;
  return {
    lost_min,
    lost_max,
    lost_revenue_min: lost_min * 850, // average residential job value baseline
  };
}

function recommendPlan(score: number, reviewCount: number) {
  if (score < 35 || reviewCount < 5) {
    return { code: "recrue", label: "Recrue", price_monthly: 99, reason: "Démarrage rapide pour bâtir vos premiers signaux." };
  }
  if (score < 55) {
    return { code: "pro", label: "Pro", price_monthly: 199, reason: "Vous avez la base — il manque la machine de conversion." };
  }
  if (score < 75) {
    return { code: "premium", label: "Premium", price_monthly: 349, reason: "Vous êtes prêt pour 10 RDV qualifiés/mois et la domination locale." };
  }
  return { code: "elite", label: "Elite", price_monthly: 599, reason: "Opérateur fort — verrouillez votre territoire." };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as DemoInput;
    if (!body || (!body.phone && !body.website && !body.business_name && !body.google_url)) {
      return json({ error: "Provide at least one of: phone, website, business_name, google_url" }, 400);
    }

    const profile = await gmbLookup(body);
    const aipp = computeAipp(profile);
    const gap = computeRevenueGap(aipp.score, profile.rating);
    const plan = recommendPlan(aipp.score, profile.review_count);

    // Best-effort: log demo for funnel analytics (do not fail if RLS blocks)
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("contractor_funnel_events").insert({
        funnel_step: "instant_profile_demo",
        event_type: "demo_generated",
        payload: {
          input: body,
          score: aipp.score,
          plan: plan.code,
          is_mock: profile.is_mock,
        },
      });
    } catch (logErr) {
      console.warn("funnel log skipped:", (logErr as Error).message);
    }

    return json({
      profile,
      aipp: {
        score: aipp.score,
        breakdown: aipp.breakdown,
        level:
          aipp.score >= 75 ? "dominant" :
          aipp.score >= 55 ? "fort" :
          aipp.score >= 35 ? "moyen" : "faible",
      },
      revenue_gap: gap,
      recommended_plan: plan,
      narrative: {
        headline:
          aipp.score >= 70
            ? `${profile.business_name} est solide — verrouillons votre avance.`
            : aipp.score >= 45
            ? `${profile.business_name} a une base — mais vous laissez de l'argent sur la table.`
            : `${profile.business_name} est invisible pour la plupart des clients prêts à acheter.`,
        loss: `Vous perdez probablement ${gap.lost_min} à ${gap.lost_max} clients/mois — soit ~${gap.lost_revenue_min.toLocaleString("fr-CA")} $ en revenus manqués.`,
        cta: `Plan recommandé : ${plan.label}. ${plan.reason}`,
      },
    });
  } catch (err) {
    console.error("fn-instant-profile-demo error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
