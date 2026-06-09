// Edge function: popular-questions
// Returns top trending homeowner questions from last 7 days,
// or seasonal fallback when volume is too low. Public, no auth required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Intent =
  | "renovation"
  | "repair"
  | "emergency"
  | "comparison"
  | "contractor"
  | "generic";

interface ResultItem {
  label: string;
  topic: string;
  intent: Intent;
  score?: number;
}

const SEASONAL: Record<number, ResultItem[]> = {
  1:  [{label:"Glace au bord du toit",topic:"les barrages de glace sur votre toit",intent:"repair"},{label:"Tuyaux gelés",topic:"vos tuyaux gelés",intent:"emergency"},{label:"Facture de chauffage trop élevée",topic:"votre facture de chauffage",intent:"repair"},{label:"Humidité dans les fenêtres",topic:"la condensation dans vos fenêtres",intent:"repair"},{label:"Rénover ma salle de bain",topic:"votre projet de salle de bain",intent:"renovation"},{label:"Subvention Rénoclimat",topic:"les subventions Rénoclimat",intent:"generic"}],
  2:  [{label:"Glace au bord du toit",topic:"les barrages de glace sur votre toit",intent:"repair"},{label:"Tuyaux gelés",topic:"vos tuyaux gelés",intent:"emergency"},{label:"Thermopompe qui dégivre mal",topic:"votre thermopompe",intent:"repair"},{label:"Planifier rénovation printemps",topic:"votre projet de rénovation",intent:"renovation"},{label:"Comparer 3 soumissions",topic:"l'analyse de vos soumissions",intent:"comparison"},{label:"Subventions disponibles",topic:"vos subventions",intent:"generic"}],
  3:  [{label:"Drain français bouché",topic:"votre drain français",intent:"repair"},{label:"Eau au sous-sol",topic:"l'infiltration d'eau au sous-sol",intent:"emergency"},{label:"Refaire la toiture",topic:"votre projet de toiture",intent:"renovation"},{label:"Asphalte craquée",topic:"votre entrée d'asphalte",intent:"repair"},{label:"Rénover la cuisine",topic:"votre projet de cuisine",intent:"renovation"},{label:"Subvention thermopompe",topic:"les subventions pour thermopompe",intent:"generic"}],
  4:  [{label:"Drain français bouché",topic:"votre drain français",intent:"repair"},{label:"Eau au sous-sol",topic:"l'infiltration d'eau au sous-sol",intent:"emergency"},{label:"Fissure de fondation",topic:"les fissures de votre fondation",intent:"repair"},{label:"Refaire l'asphalte",topic:"votre projet d'asphalte",intent:"renovation"},{label:"Inspection avant achat",topic:"l'inspection de votre future maison",intent:"generic"},{label:"Comparer des soumissions",topic:"l'analyse de vos soumissions",intent:"comparison"}],
  5:  [{label:"Refaire la toiture",topic:"votre projet de toiture",intent:"renovation"},{label:"Pavé uni qui s'enfonce",topic:"votre pavé uni",intent:"repair"},{label:"Aménagement paysager",topic:"votre aménagement paysager",intent:"renovation"},{label:"Climatisation à installer",topic:"l'installation d'une climatisation",intent:"renovation"},{label:"Mon sous-sol sent l'humidité",topic:"l'humidité de votre sous-sol",intent:"repair"},{label:"Comparer des soumissions",topic:"l'analyse de vos soumissions",intent:"comparison"}],
  6:  [{label:"Mon sous-sol sent l'humidité",topic:"l'humidité de votre sous-sol",intent:"repair"},{label:"Climatisation qui ne refroidit pas",topic:"votre climatisation",intent:"repair"},{label:"Refaire la toiture",topic:"votre projet de toiture",intent:"renovation"},{label:"Drain français à vérifier",topic:"votre drain français",intent:"generic"},{label:"Patio et terrasse",topic:"votre projet de terrasse",intent:"renovation"},{label:"Comparer 3 soumissions",topic:"l'analyse de vos soumissions",intent:"comparison"}],
  7:  [{label:"Climatisation faible",topic:"votre climatisation",intent:"repair"},{label:"Toiture qui coule",topic:"votre toiture qui coule",intent:"emergency"},{label:"Mon sous-sol sent l'humidité",topic:"l'humidité de votre sous-sol",intent:"repair"},{label:"Asphalte à refaire",topic:"votre projet d'asphalte",intent:"renovation"},{label:"Rénover la cuisine",topic:"votre projet de cuisine",intent:"renovation"},{label:"Trouver entrepreneur disponible",topic:"trouver le bon entrepreneur",intent:"generic"}],
  8:  [{label:"Toiture qui coule",topic:"votre toiture qui coule",intent:"emergency"},{label:"Asphalte à sceller",topic:"le scellement de votre asphalte",intent:"repair"},{label:"Climatisation bruyante",topic:"votre climatisation",intent:"repair"},{label:"Préparer ma maison pour l'hiver",topic:"la préparation de votre maison pour l'hiver",intent:"generic"},{label:"Comparer des soumissions",topic:"l'analyse de vos soumissions",intent:"comparison"},{label:"Rénover la salle de bain",topic:"votre projet de salle de bain",intent:"renovation"}],
  9:  [{label:"Préparer la thermopompe",topic:"l'entretien de votre thermopompe",intent:"generic"},{label:"Ramonage de cheminée",topic:"le ramonage de votre cheminée",intent:"generic"},{label:"Isolation du grenier",topic:"l'isolation de votre grenier",intent:"renovation"},{label:"Toiture à inspecter",topic:"l'inspection de votre toiture",intent:"generic"},{label:"Calfeutrage des fenêtres",topic:"le calfeutrage de vos fenêtres",intent:"repair"},{label:"Subvention Rénoclimat",topic:"les subventions Rénoclimat",intent:"generic"}],
  10: [{label:"Isolation du grenier",topic:"l'isolation de votre grenier",intent:"renovation"},{label:"Calfeutrage des fenêtres",topic:"le calfeutrage de vos fenêtres",intent:"repair"},{label:"Thermopompe à entretenir",topic:"l'entretien de votre thermopompe",intent:"generic"},{label:"Ramonage de cheminée",topic:"le ramonage de votre cheminée",intent:"generic"},{label:"Drain français à vérifier",topic:"votre drain français",intent:"generic"},{label:"Subvention thermopompe",topic:"les subventions pour thermopompe",intent:"generic"}],
  11: [{label:"Préparer pour l'hiver",topic:"la préparation hivernale",intent:"generic"},{label:"Chauffe-eau qui fait du bruit",topic:"votre chauffe-eau",intent:"repair"},{label:"Thermopompe mal réglée",topic:"votre thermopompe",intent:"repair"},{label:"Calfeutrage des fenêtres",topic:"le calfeutrage de vos fenêtres",intent:"repair"},{label:"Subvention chauffage",topic:"les subventions de chauffage",intent:"generic"},{label:"Rénover la salle de bain",topic:"votre projet de salle de bain",intent:"renovation"}],
  12: [{label:"Tuyaux gelés",topic:"vos tuyaux gelés",intent:"emergency"},{label:"Chauffage faible",topic:"votre système de chauffage",intent:"repair"},{label:"Glace au bord du toit",topic:"les barrages de glace sur votre toit",intent:"repair"},{label:"Thermopompe qui ne chauffe plus",topic:"votre thermopompe",intent:"emergency"},{label:"Planifier rénovation 2027",topic:"votre projet de rénovation",intent:"renovation"},{label:"Subvention rénovation",topic:"vos subventions",intent:"generic"}],
};

function seasonal(): ResultItem[] {
  const m = new Date().getMonth() + 1;
  return SEASONAL[m] ?? SEASONAL[6];
}

function prettify(label: string): string {
  if (!label) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let limit = 6;
    try {
      const body = await req.json();
      if (typeof body?.limit === "number" && body.limit >= 1 && body.limit <= 20) {
        limit = Math.floor(body.limit);
      }
    } catch (_) {
      // no body — fine
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await client
      .from("v_popular_questions_7d")
      .select("normalized_label, topic, intent, weighted_score")
      .order("weighted_score", { ascending: false })
      .limit(limit);

    const items: ResultItem[] = [];
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const label = prettify(String(row.normalized_label ?? "").trim());
        if (!label) continue;
        items.push({
          label,
          topic: (row.topic as string | null) ?? label,
          intent: ((row.intent as Intent | null) ?? "generic") as Intent,
          score: (row.weighted_score as number | null) ?? undefined,
        });
      }
    }

    const useTrending = items.length >= 3;
    const responseBody = {
      source: useTrending ? "trending" : "seasonal",
      items: useTrending ? items : seasonal().slice(0, limit),
    };

    return new Response(JSON.stringify(responseBody), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
      status: 200,
    });
  } catch (_err) {
    return new Response(
      JSON.stringify({ source: "seasonal", items: seasonal().slice(0, 6) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});
