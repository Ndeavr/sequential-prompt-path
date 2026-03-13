import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// RBQ subcategory → homeowner-friendly work types
const RBQ_SCOPE_MAP: Record<string, { label_fr: string; work_types: string[] }> = {
  "1.1": { label_fr: "Bâtiments résidentiels neufs", work_types: ["Construction neuve", "Maison neuve", "Jumelé", "Cottage"] },
  "1.2": { label_fr: "Bâtiments résidentiels existants (rénovation)", work_types: ["Rénovation générale", "Agrandissement", "Sous-sol", "Cuisine", "Salle de bain"] },
  "2.1": { label_fr: "Excavation et terrassement", work_types: ["Excavation", "Terrassement", "Drain français", "Fondation"] },
  "3.1": { label_fr: "Structures de béton", work_types: ["Fondation béton", "Dalle", "Mur de soutènement", "Réparation de fissures"] },
  "4.1": { label_fr: "Maçonnerie, pierre", work_types: ["Brique", "Pierre", "Bloc de béton", "Cheminée", "Rejointoiement"] },
  "5.1": { label_fr: "Acier, métaux ouvrés", work_types: ["Structure acier", "Escalier métal", "Rampe", "Balcon"] },
  "6.1": { label_fr: "Menuiserie, charpenterie", work_types: ["Charpente", "Menuiserie", "Plancher bois", "Escalier bois", "Terrasse"] },
  "7.1": { label_fr: "Couverture (toiture)", work_types: ["Remplacement toiture", "Réparation toiture", "Bardeaux", "Membrane", "Toit plat"] },
  "8.1": { label_fr: "Revêtement extérieur", work_types: ["Revêtement vinyle", "Canexel", "Crépi", "Stucco", "Bardage"] },
  "9.1": { label_fr: "Isolation générale", work_types: ["Isolation murs", "Isolation entretoit", "Pare-vapeur"] },
  "9.2": { label_fr: "Isolation thermique", work_types: ["Isolation cellulose", "Laine soufflée", "Uréthane giclé", "Polystyrène"] },
  "10.1": { label_fr: "Gypse, plâtrage", work_types: ["Pose gypse", "Tirage de joints", "Plâtrage", "Crépi intérieur"] },
  "11.1": { label_fr: "Peinture", work_types: ["Peinture intérieure", "Peinture extérieure", "Teinture", "Vernissage"] },
  "12.1": { label_fr: "Carrelage, céramique", work_types: ["Céramique plancher", "Céramique murale", "Mosaïque", "Porcelaine"] },
  "15.1": { label_fr: "Électricité", work_types: ["Filage", "Panneau électrique", "Prises", "Éclairage", "Mise aux normes"] },
  "15.7": { label_fr: "Systèmes d'alarme", work_types: ["Alarme incendie", "Système sécurité", "Caméras"] },
  "16.1": { label_fr: "Plomberie", work_types: ["Plomberie générale", "Chauffe-eau", "Tuyauterie", "Robinetterie", "Toilette"] },
  "17.1": { label_fr: "Chauffage", work_types: ["Fournaise", "Thermopompe", "Plancher chauffant", "Chaudière"] },
  "17.2": { label_fr: "Ventilation, climatisation", work_types: ["Échangeur d'air", "Climatisation", "VRC", "Conduits"] },
  "18.1": { label_fr: "Portes, fenêtres", work_types: ["Remplacement fenêtres", "Portes d'entrée", "Portes-fenêtres", "Fenêtres PVC"] },
};

function normalizePhone(input: string): string {
  return input.replace(/[\s\-\(\)\.]/g, "").replace(/^\+?1/, "");
}

function normalizeBusinessName(input: string): string {
  return input
    .trim()
    .replace(/\b(inc|ltée|ltd|enr|senc|s\.e\.n\.c|llc|corp|cie)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectInputType(input: string): string {
  const cleaned = input.trim();
  if (/^\d{4}[\-\s]?\d{4}[\-\s]?\d{2}$/.test(cleaned.replace(/[\s\-]/g, ""))) return "rbq";
  if (/^\d{10}$/.test(cleaned.replace(/[\s\-\(\)\.+]/g, "").replace(/^1/, ""))) return "phone";
  if (/^\d{10}$/.test(cleaned.replace(/[\s\-]/g, ""))) return "neq";
  if (/^https?:\/\//i.test(cleaned) || /\.\w{2,}$/.test(cleaned)) return "website";
  return "name";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { input, project_description } = await req.json();
    if (!input || typeof input !== "string" || input.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Input requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const inputType = detectInputType(input.trim());
    const normalizedInput = inputType === "phone" ? normalizePhone(input) : inputType === "name" ? normalizeBusinessName(input) : input.trim();

    // Step 1: Search existing contractors in DB
    let dbMatches: any[] = [];
    if (inputType === "phone") {
      const { data } = await supabase.from("contractors").select("id, business_name, phone, email, city, license_number, website, slug, verification_status, rating, review_count").ilike("phone", `%${normalizedInput.slice(-7)}%`).limit(5);
      dbMatches = data || [];
    } else if (inputType === "name") {
      const { data } = await supabase.from("contractors").select("id, business_name, phone, email, city, license_number, website, slug, verification_status, rating, review_count").ilike("business_name", `%${normalizedInput}%`).limit(5);
      dbMatches = data || [];
    } else if (inputType === "rbq") {
      const clean = normalizedInput.replace(/[\s\-]/g, "");
      const { data } = await supabase.from("contractors").select("id, business_name, phone, email, city, license_number, website, slug, verification_status, rating, review_count").eq("license_number", clean).limit(5);
      dbMatches = data || [];
    } else if (inputType === "website") {
      const { data } = await supabase.from("contractors").select("id, business_name, phone, email, city, license_number, website, slug, verification_status, rating, review_count").ilike("website", `%${normalizedInput.replace(/^https?:\/\/(www\.)?/, "")}%`).limit(5);
      dbMatches = data || [];
    }

    // Step 2: Use AI to reconstruct identity, validate, and score
    const systemPrompt = `Tu es un moteur de vérification d'entrepreneurs au Québec pour la plateforme UNPRO.
Tu dois analyser les informations fournies et produire un rapport de vérification structuré.

IMPORTANT:
- Ne jamais affirmer de certitude légale
- Utiliser "selon les informations disponibles", "cohérence détectée", "vérification complémentaire recommandée"
- Être factuel et prudent
- Le score de confiance (trust_score) va de 0 à 100
- Le score de compatibilité licence (license_fit_score) va de 0 à 100 (seulement si un projet est décrit)
- Le verdict est: "succes", "attention", "non_succes", ou "se_tenir_loin"

Catégories RBQ connues et leurs travaux associés:
${Object.entries(RBQ_SCOPE_MAP).map(([code, v]) => `${code} - ${v.label_fr}: ${v.work_types.join(", ")}`).join("\n")}`;

    const userPrompt = `Entrée utilisateur: "${input}"
Type détecté: ${inputType}
Valeur normalisée: ${normalizedInput}
${project_description ? `Projet décrit: "${project_description}"` : "Aucun projet décrit."}

Correspondances trouvées dans la base de données UNPRO:
${dbMatches.length > 0 ? JSON.stringify(dbMatches, null, 2) : "Aucune correspondance trouvée."}

Produis un rapport de vérification JSON avec cette structure exacte:
{
  "contractor_identity": {
    "business_name": string ou null,
    "legal_name": string ou null,
    "phone": string ou null,
    "website": string ou null,
    "rbq_license": string ou null,
    "neq": string ou null,
    "city": string ou null,
    "confidence": number (0-100),
    "source_notes": string
  },
  "rbq_validation": {
    "status": "valid" | "expired" | "not_found" | "unknown",
    "license_number": string ou null,
    "subcategories": [string],
    "contractor_type": string ou null,
    "notes": string
  },
  "neq_validation": {
    "status": "active" | "inactive" | "not_found" | "unknown",
    "legal_name": string ou null,
    "registration_status": string ou null,
    "notes": string
  },
  "license_scope": {
    "declared_subcategories": [{"code": string, "label": string, "work_types": [string]}],
    "project_compatibility": "compatible" | "partial" | "verify" | "not_compatible" | null,
    "compatibility_notes": string ou null
  },
  "visual_validation": {
    "status": "not_requested",
    "notes": "Aucune image soumise"
  },
  "risk_signals": [{"signal": string, "severity": "low" | "medium" | "high", "detail": string}],
  "trust_score": number (0-100),
  "license_fit_score": number ou null (0-100, null si pas de projet),
  "verdict": "succes" | "attention" | "non_succes" | "se_tenir_loin",
  "verdict_summary": string (explication courte en français du verdict)
}

Sois réaliste: si tu manques d'informations, indique "unknown" et baisse le score de confiance.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_verification_report",
              description: "Submit the structured verification report",
              parameters: {
                type: "object",
                properties: {
                  contractor_identity: { type: "object" },
                  rbq_validation: { type: "object" },
                  neq_validation: { type: "object" },
                  license_scope: { type: "object" },
                  visual_validation: { type: "object" },
                  risk_signals: { type: "array", items: { type: "object" } },
                  trust_score: { type: "number" },
                  license_fit_score: { type: ["number", "null"] },
                  verdict: { type: "string", enum: ["succes", "attention", "non_succes", "se_tenir_loin"] },
                  verdict_summary: { type: "string" },
                },
                required: ["contractor_identity", "rbq_validation", "neq_validation", "license_scope", "visual_validation", "risk_signals", "trust_score", "verdict", "verdict_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_verification_report" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const report = JSON.parse(toolCall.function.arguments);

    // Save to DB
    const authHeader = req.headers.get("authorization");
    let userId = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    await supabase.from("verification_reports").insert({
      user_id: userId,
      input_type: inputType,
      input_value: input.trim(),
      project_description: project_description || null,
      contractor_identity: report.contractor_identity,
      rbq_validation: report.rbq_validation,
      neq_validation: report.neq_validation,
      license_scope: report.license_scope,
      visual_validation: report.visual_validation,
      risk_signals: report.risk_signals,
      trust_score: report.trust_score,
      license_fit_score: report.license_fit_score,
      verdict: report.verdict,
      matched_contractor_id: dbMatches.length === 1 ? dbMatches[0].id : null,
    });

    return new Response(JSON.stringify({ success: true, report, db_matches: dbMatches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-contractor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
