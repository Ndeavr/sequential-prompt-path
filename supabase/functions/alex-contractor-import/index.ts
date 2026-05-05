/**
 * alex-contractor-import — Unified router for contractor onboarding via Alex.
 *
 * Input: { phone?, website?, rbq?, business_name?, business_card_base64?, mime_type?, city? }
 * Output: { profile, aipp_report }
 *
 * Strategy:
 *  - If business_card_base64 → delegate to extract-business-card
 *  - Else if website/phone → delegate to aipp-real-scan
 *  - Then compute AIPP via aipp-v2-analyze (best-effort, fallback to deterministic stub)
 *
 * Never fabricates ratings/RBQ. Unknown fields are returned as null
 * so the client renders "À vérifier".
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callFn(name: string, body: unknown, authHeader: string | null) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    try {
      return { ok: res.ok, data: JSON.parse(text) };
    } catch {
      return { ok: res.ok, data: { raw: text } };
    }
  } catch (e) {
    return { ok: false, data: { error: String(e) } };
  }
}

interface ProfileOut {
  business_name: string | null;
  phone: string | null;
  website: string | null;
  rbq: string | null;
  neq: string | null;
  logo_url: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  services: string[];
  cities_served: string[];
  profile_completion: number;
}

function emptyProfile(): ProfileOut {
  return {
    business_name: null,
    phone: null,
    website: null,
    rbq: null,
    neq: null,
    logo_url: null,
    google_rating: null,
    google_reviews_count: null,
    services: [],
    cities_served: [],
    profile_completion: 0,
  };
}

function calcCompletion(p: ProfileOut): number {
  const fields: (keyof ProfileOut)[] = [
    "business_name", "phone", "website", "rbq",
    "logo_url", "google_rating", "services", "cities_served",
  ];
  let filled = 0;
  for (const f of fields) {
    const v = p[f];
    if (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined) filled++;
  }
  return Math.round((filled / fields.length) * 100);
}

function deriveAipp(p: ProfileOut) {
  // Deterministic baseline if AI scoring unavailable.
  let score = 30;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const fixes: string[] = [];

  if (p.google_rating && p.google_rating >= 4.5) { score += 15; strengths.push("Excellente note Google"); }
  else if (p.google_rating && p.google_rating >= 4.0) { score += 10; strengths.push("Bonne note Google"); }
  else weaknesses.push("Note Google à améliorer");

  if (p.google_reviews_count && p.google_reviews_count >= 50) { score += 10; strengths.push("Volume d'avis solide"); }
  else { weaknesses.push("Peu d'avis Google"); fixes.push("Demander plus d'avis clients"); }

  if (p.rbq) { score += 8; strengths.push("RBQ vérifiée"); }
  else { weaknesses.push("RBQ non confirmée"); fixes.push("Confirmer votre licence RBQ"); }

  if (p.website) { score += 6; strengths.push("Site web actif"); }
  else { weaknesses.push("Pas de site web"); }

  if (p.services.length >= 3) { score += 8; strengths.push("Services bien définis"); }
  else { weaknesses.push("Services à clarifier"); fixes.push("Ajouter vos services"); }

  if (p.cities_served.length >= 3) { score += 8; strengths.push("Couverture territoriale claire"); }
  else { weaknesses.push("Territoire à préciser"); fixes.push("Ajouter vos villes desservies"); }

  if (p.profile_completion < 80) fixes.push("Compléter le profil entrepreneur");
  fixes.push("Activer votre profil UNPRO");

  score = Math.max(0, Math.min(100, score));
  const tier =
    score >= 85 ? "Élite" :
    score >= 70 ? "Bon potentiel" :
    score >= 50 ? "À optimiser" : "Profil à bâtir";

  return {
    aipp_score: score,
    tier,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    fastest_improvements: fixes.slice(0, 4),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const auth = req.headers.get("Authorization");
    const profile = emptyProfile();

    // 1. Business card path
    if (body.business_card_base64) {
      const r = await callFn("extract-business-card", {
        image_base64: body.business_card_base64,
      }, auth);
      const d = r.data || {};
      profile.business_name = d.business_name || d.company_name || null;
      profile.phone = d.phone || null;
      profile.website = d.website || null;
      profile.rbq = d.rbq || null;
      profile.services = Array.isArray(d.services) ? d.services : [];
    }

    // Merge user-typed fields (always trusted)
    if (body.business_name) profile.business_name ||= body.business_name;
    if (body.phone) profile.phone ||= body.phone;
    if (body.website) profile.website ||= body.website;
    if (body.rbq) profile.rbq ||= body.rbq;

    // 2. Web/phone enrichment via aipp-real-scan if we have a website or phone
    if (profile.website || profile.phone) {
      const r = await callFn("aipp-real-scan", {
        website: profile.website,
        phone: profile.phone,
        business_name: profile.business_name,
      }, auth);
      const d = r.data || {};
      profile.business_name ||= d.business_name || null;
      profile.logo_url ||= d.logo_url || null;
      profile.google_rating ||= typeof d.google_rating === "number" ? d.google_rating : null;
      profile.google_reviews_count ||= typeof d.google_reviews_count === "number" ? d.google_reviews_count : null;
      profile.neq ||= d.neq || null;
      if (Array.isArray(d.services) && profile.services.length === 0) profile.services = d.services;
      if (Array.isArray(d.cities_served) && profile.cities_served.length === 0) profile.cities_served = d.cities_served;
    }

    if (body.city && !profile.cities_served.includes(body.city)) {
      profile.cities_served.unshift(body.city);
    }

    profile.profile_completion = calcCompletion(profile);

    // 3. AIPP score — try aipp-v2-analyze, fallback to deterministic.
    let aipp_report: any = null;
    const aippRes = await callFn("aipp-v2-analyze", { profile }, auth);
    if (aippRes.ok && aippRes.data && typeof aippRes.data.aipp_score === "number") {
      aipp_report = {
        aipp_score: aippRes.data.aipp_score,
        tier: aippRes.data.tier || deriveAipp(profile).tier,
        strengths: aippRes.data.strengths || [],
        weaknesses: aippRes.data.weaknesses || [],
        fastest_improvements: aippRes.data.fastest_improvements || [],
      };
    } else {
      aipp_report = deriveAipp(profile);
    }

    return new Response(JSON.stringify({ profile, aipp_report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
