// scan-ia-run — Tunnel Scan IA UNPRO
// Prend un nom / site / téléphone → délègue à aipp-real-scan → produit un score IA
// UNPRO (6 sous-scores) + contexte marché + simulation Alex + persiste le rapport.
// Public (pas de gate email/auth).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Méthode non supportée." }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("scan-ia-run missing backend configuration");
      return json({ success: false, error: "Analyse temporairement indisponible." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const raw = String(body.input ?? "").trim();
    if (!raw) {
      return json({ success: false, error: "Entrez une entreprise, un site web ou un profil Google." }, 400);
    }

    const inputType = detectInputType(raw);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Délègue au scanner existant
    let scan: any = null;
    try {
      const scanPayload = inputType === "phone"
        ? { phone: raw }
        : { website_url: inputType === "website" ? normalizeWebsiteUrl(raw) : raw };
      const { data, error } = await withTimeout(
        supabase.functions.invoke("aipp-real-scan", { body: scanPayload }),
        8500,
      );
      if (!error && data?.success) scan = data;
    } catch (e) {
      console.warn("aipp-real-scan fallback:", e);
    }

    const signals = scan?.signals ?? {};
    const businessName =
      signals?.business_name_detected || extractDomain(raw) || raw;

    // 2. Scoring déterministe UNPRO IA (6 sous-scores)
    const subScores = computeSubScores(signals, scan);
    const overall = Math.round(
      (subScores.visibility_score +
        subScores.trust_score +
        subScores.review_score +
        subScores.compliance_score +
        subScores.proof_score +
        subScores.activity_score) / 6
    );

    // 3. Ville / catégorie détectées
    const citiesDetected: string[] = signals?.cities_detected ?? [];
    const servicesDetected: string[] = signals?.services_detected ?? [];
    const city = normalizeCity(citiesDetected[0]) || "Terrebonne";
    const category = normalizeCategory(servicesDetected[0]) || "Isolation";

    // 4. Opportunités marché
    const { data: opp, error: oppError } = await supabase
      .from("contractor_market_opportunity")
      .select("*")
      .eq("city", city)
      .eq("category", category)
      .maybeSingle();

    if (oppError) console.warn("market opportunity fallback:", oppError.message);

    const opportunities = opp
      ? {
          waiting_homeowners: opp.waiting_homeowners,
          estimated_revenue: opp.estimated_revenue_cents / 100,
          city,
          category,
          pressure_score: opp.pressure_score,
        }
      : {
          waiting_homeowners: 6,
          estimated_revenue: 18000,
          city,
          category,
          pressure_score: 60,
        };

    // 5. Menaces
    const { data: ranks, error: ranksError } = await supabase
      .from("ai_recommendation_rank")
      .select("contractor_name, rank, score, reasons")
      .eq("city", city)
      .eq("category", category)
      .order("rank", { ascending: true })
      .limit(3);

    if (ranksError) console.warn("ai ranks fallback:", ranksError.message);

    const topRanks = ranks?.length ? ranks : fallbackRanks(city, category);

    const threats = {
      competitors_ahead: opp?.competitors_ahead ?? topRanks.length,
      complete_profile_competitor: topRanks[0]?.contractor_name ?? null,
      top_competitors: topRanks,
    };

    const ownRank = topRanks.find((rank) => isLikelySameBusiness(raw, businessName, rank.contractor_name));

    // 6. Simulation Alex
    const alexSimulation = {
      question: `Qui recommandes-tu pour ${category.toLowerCase()} à ${city} ?`,
      recommended: topRanks[0]?.contractor_name ?? "Entrepreneur local vérifié",
      reasons: (topRanks[0]?.reasons as string[]) ?? [
        "profil complet",
        "avis vérifiés",
        "territoire défini",
        "disponibilité confirmée",
      ],
      your_business_visible: Boolean(ownRank),
      your_rank: ownRank?.rank ?? null,
      punchline: ownRank
        ? `${businessName} apparaît au rang ${ownRank.rank}. Le prochain levier est d'augmenter le score de confiance IA.`
        : `${businessName} n'apparaît pas encore.`,
    };

    // 7. Persist scan
    const sessionToken = crypto.randomUUID();
    const { data: report, error: insertError } = await supabase
      .from("scan_ia_reports")
      .insert({
        session_token: sessionToken,
        input_value: raw,
        input_type: inputType,
        normalized_url: scan?.normalized_url ?? null,
        business_name: businessName,
        city,
        category,
        overall_score: overall,
        sub_scores: subScores,
        signals,
        opportunities,
        threats,
        alex_simulation: alexSimulation,
      })
      .select("id, session_token")
      .single();

    if (insertError) {
      console.error("insert scan_ia_reports failed:", insertError);
      return json({ success: false, error: "Analyse temporairement ralentie. Réessayez dans un instant." }, 500);
    }

    return json({
      success: true,
      report_id: report.id,
      session_token: report.session_token,
      overall_score: overall,
      sub_scores: subScores,
      business_name: businessName,
      city,
      category,
      opportunities,
      threats,
      alex_simulation: alexSimulation,
      screenshot: scan?.screenshot ?? null,
    });
  } catch (e) {
    console.error("scan-ia-run error:", e);
    return json({ success: false, error: "Analyse temporairement ralentie. Réessayez dans un instant." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function detectInputType(raw: string): "website" | "phone" | "name" {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 11) return "phone";
  if (/\.(ca|com|net|org|io|co|app)/i.test(raw) || raw.includes("http")) return "website";
  return "name";
}

function extractDomain(input: string): string | null {
  try {
    const withProto = input.startsWith("http") ? input : `https://${input}`;
    return new URL(withProto).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("scan_timeout")), ms);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timer));
  });
}

function fallbackRanks(city: string, category: string) {
  return [
    {
      contractor_name: `${category} ${city} Vérifié`,
      rank: 1,
      score: 84,
      reasons: ["profil complet", "preuves visibles", "territoire défini"],
    },
    {
      contractor_name: `Groupe ${category} Québec`,
      rank: 2,
      score: 76,
      reasons: ["présence locale", "avis détectés"],
    },
  ];
}

function isLikelySameBusiness(input: string, detectedName: string, candidateName: string): boolean {
  const compactInput = normalizeBusinessKey(input.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].split(".")[0]);
  const compactDetected = normalizeBusinessKey(detectedName);
  const compactCandidate = normalizeBusinessKey(candidateName);
  if (!compactCandidate) return false;
  if (compactInput && compactCandidate.includes(compactInput)) return true;
  if (compactDetected && compactCandidate.includes(compactDetected)) return true;
  const initials = candidateName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toLowerCase();
  return Boolean(compactInput && initials.length >= 3 && compactInput.includes(initials));
}

function normalizeBusinessKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeCity(c?: string): string | null {
  if (!c) return null;
  return c
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeCategory(c?: string): string | null {
  if (!c) return null;
  const map: Record<string, string> = {
    isolation: "Isolation",
    toiture: "Toiture",
    roofing: "Toiture",
    plomberie: "Plomberie",
    plumbing: "Plomberie",
    électricité: "Électricité",
    rénovation: "Rénovation",
    renovation: "Rénovation",
    peinture: "Peinture",
    painting: "Peinture",
    chauffage: "Chauffage",
    heating: "Chauffage",
    climatisation: "Climatisation",
    menuiserie: "Menuiserie",
  };
  return map[c.toLowerCase()] ?? null;
}

function computeSubScores(signals: any, scan: any) {
  // Visibility : SSL + domaine + metadata + logo + sociaux
  const socialsCount = (signals?.socials_found?.length ?? 0);
  const visibility_score = clamp(
    (signals?.has_ssl ? 20 : 0) +
      (scan?.normalized_url ? 15 : 0) +
      (signals?.title ? 10 : 0) +
      (signals?.has_logo ? 15 : 0) +
      Math.min(socialsCount * 8, 40)
  );

  // Trust : email + téléphone + logo + business name propre
  const trust_score = clamp(
    (signals?.emails_found?.length ? 25 : 0) +
      (signals?.phones_found?.length ? 25 : 0) +
      (signals?.has_logo ? 20 : 0) +
      (signals?.business_name_detected ? 30 : 0)
  );

  // Reviews : détection mots-clés avis
  const review_score = clamp(signals?.has_reviews ? 65 : 25);

  // Compliance : SSL + structured data + description
  const compliance_score = clamp(
    (signals?.has_ssl ? 40 : 0) +
      (signals?.has_structured_hints ? 30 : 0) +
      (signals?.description ? 20 : 0) + 10
  );

  // Proof : services listés + villes couvertes
  const proof_score = clamp(
    Math.min((signals?.services_detected?.length ?? 0) * 12, 40) +
      Math.min((signals?.cities_detected?.length ?? 0) * 10, 30) + 10
  );

  // Activity : nombre de liens internes / pages
  const linksCount = scan?.links_count ?? 0;
  const activity_score = clamp(Math.min(linksCount * 2, 80) + 10);

  return {
    visibility_score,
    trust_score,
    review_score,
    compliance_score,
    proof_score,
    activity_score,
  };
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
