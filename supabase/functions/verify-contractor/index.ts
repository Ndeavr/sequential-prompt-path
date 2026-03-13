import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════════════
// RBQ SCOPE MAP (duplicated here because edge functions can't import from src/)
// ══════════════════════════════════════════════════════════════
const RBQ_SCOPE_MAP: Record<string, { label_fr: string; work_types: string[] }> = {
  "1.1":  { label_fr: "Bâtiments résidentiels neufs", work_types: ["Construction neuve", "Maison neuve", "Jumelé", "Cottage"] },
  "1.2":  { label_fr: "Bâtiments résidentiels existants (rénovation)", work_types: ["Rénovation générale", "Agrandissement", "Sous-sol", "Cuisine", "Salle de bain"] },
  "2.1":  { label_fr: "Excavation et terrassement", work_types: ["Excavation", "Terrassement", "Drain français", "Fondation"] },
  "3.1":  { label_fr: "Structures de béton", work_types: ["Fondation béton", "Dalle", "Mur de soutènement", "Réparation de fissures"] },
  "4.1":  { label_fr: "Maçonnerie, pierre", work_types: ["Brique", "Pierre", "Bloc de béton", "Cheminée", "Rejointoiement"] },
  "5.1":  { label_fr: "Acier, métaux ouvrés", work_types: ["Structure acier", "Escalier métal", "Rampe", "Balcon métal"] },
  "6.1":  { label_fr: "Menuiserie, charpenterie", work_types: ["Charpente", "Menuiserie", "Plancher bois", "Escalier bois", "Terrasse"] },
  "7.1":  { label_fr: "Couverture (toiture)", work_types: ["Remplacement de toiture", "Réparation de toiture", "Bardeaux", "Membrane", "Toit plat"] },
  "8.1":  { label_fr: "Revêtement extérieur", work_types: ["Revêtement vinyle", "Canexel", "Crépi", "Stucco", "Bardage"] },
  "9.1":  { label_fr: "Isolation générale", work_types: ["Isolation murs", "Isolation entretoit", "Pare-vapeur"] },
  "9.2":  { label_fr: "Isolation thermique", work_types: ["Isolation cellulose", "Laine soufflée", "Uréthane giclé", "Polystyrène"] },
  "10.1": { label_fr: "Gypse, plâtrage", work_types: ["Pose gypse", "Tirage de joints", "Plâtrage"] },
  "11.1": { label_fr: "Peinture", work_types: ["Peinture intérieure", "Peinture extérieure", "Teinture", "Vernissage"] },
  "12.1": { label_fr: "Carrelage, céramique", work_types: ["Céramique plancher", "Céramique murale", "Mosaïque", "Porcelaine"] },
  "15.1": { label_fr: "Électricité", work_types: ["Filage", "Panneau électrique", "Prises", "Éclairage", "Mise aux normes"] },
  "15.7": { label_fr: "Systèmes d'alarme", work_types: ["Alarme incendie", "Système sécurité", "Caméras"] },
  "16.1": { label_fr: "Plomberie", work_types: ["Plomberie générale", "Chauffe-eau", "Tuyauterie", "Robinetterie"] },
  "17.1": { label_fr: "Chauffage", work_types: ["Fournaise", "Thermopompe", "Plancher chauffant", "Chaudière"] },
  "17.2": { label_fr: "Ventilation, climatisation", work_types: ["Échangeur d'air", "Climatisation", "VRC", "Conduits"] },
  "18.1": { label_fr: "Portes, fenêtres", work_types: ["Remplacement fenêtres", "Portes d'entrée", "Portes-fenêtres"] },
};

// ══════════════════════════════════════════════════════════════
// NORMALIZERS
// ══════════════════════════════════════════════════════════════
function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-\(\)\.]/g, "").replace(/^\+?1(?=\d{10}$)/, "");
}

function normalizeBusinessName(raw: string): string {
  return raw.trim()
    .replace(/\b(inc|ltée|ltd|enr|senc|s\.e\.n\.c|llc|corp|cie|compagnie|limitée|limited)\b\.?/gi, "")
    .replace(/\s+/g, " ").trim();
}

function normalizeRbq(raw: string): string { return raw.replace(/[\s\-\.]/g, ""); }
function normalizeNeq(raw: string): string { return raw.replace(/[\s\-\.]/g, ""); }
function normalizeDomain(raw: string): string {
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase().trim();
}

type SearchType = "phone" | "name" | "rbq" | "neq" | "website" | "upload";

function detectInputType(raw: string): SearchType {
  const cleaned = raw.trim();
  const digitsOnly = cleaned.replace(/[\s\-]/g, "");
  if (/^\d{10}$/.test(digitsOnly) && cleaned.includes("-") && (cleaned.match(/-/g) || []).length >= 2) return "rbq";
  const phoneDigits = cleaned.replace(/[\s\-\(\)\.+]/g, "").replace(/^1(?=\d{10}$)/, "");
  if (/^\d{10}$/.test(phoneDigits)) return "phone";
  if (/^\d{10}$/.test(digitsOnly)) return "neq";
  if (/^https?:\/\//i.test(cleaned) || /\.\w{2,}$/.test(cleaned)) return "website";
  return "name";
}

// ══════════════════════════════════════════════════════════════
// TOOL CALL SCHEMA for structured output
// ══════════════════════════════════════════════════════════════
const VERIFICATION_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_verification_report",
    description: "Submit the UNPRO contractor verification report with all modules.",
    parameters: {
      type: "object",
      properties: {
        input_summary: {
          type: "object",
          properties: {
            input_type: { type: "string" },
            raw_input: { type: "string" },
            normalized_phone: { type: ["string", "null"] },
            detected_language: { type: "string", enum: ["fr", "en", "unknown"] },
          },
          required: ["input_type", "raw_input", "detected_language"],
        },
        visual_extraction: {
          type: "object",
          properties: {
            image_type: { type: ["string", "null"] },
            business_name: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            email: { type: ["string", "null"] },
            website: { type: ["string", "null"] },
            rbq: { type: ["string", "null"] },
            neq: { type: ["string", "null"] },
            address: { type: ["string", "null"] },
            representative_name: { type: ["string", "null"] },
            service_keywords: { type: "array", items: { type: "string" } },
            brand_notes: { type: "array", items: { type: "string" } },
          },
          required: ["image_type", "business_name", "service_keywords", "brand_notes"],
        },
        probable_entities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              business_name: { type: ["string", "null"] },
              legal_name: { type: ["string", "null"] },
              normalized_phone: { type: ["string", "null"] },
              website: { type: ["string", "null"] },
              email_domain: { type: ["string", "null"] },
              probable_service_category: { type: ["string", "null"] },
              probable_city: { type: ["string", "null"] },
              probable_rbq: { type: ["string", "null"] },
              probable_neq: { type: ["string", "null"] },
              confidence_score: { type: "number" },
              evidence: { type: "array", items: { type: "string" } },
            },
            required: ["confidence_score", "evidence"],
          },
        },
        registry_validation: {
          type: "object",
          properties: {
            rbq_status: { type: "string", enum: ["valid", "expired", "suspended", "not_found", "unknown"] },
            rbq_subcategories: { type: "array", items: { type: "string" } },
            neq_status: { type: "string", enum: ["active", "inactive", "struck_off", "not_found", "unknown"] },
            registered_name: { type: ["string", "null"] },
            identity_coherence: { type: "string", enum: ["strong", "moderate", "weak", "contradictory", "unknown"] },
          },
          required: ["rbq_status", "rbq_subcategories", "neq_status", "identity_coherence"],
        },
        license_scope: {
          type: "object",
          properties: {
            mapped_work_types: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rbq_code: { type: "string" },
                  label_fr: { type: "string" },
                  work_types: { type: "array", items: { type: "string" } },
                },
                required: ["rbq_code", "label_fr", "work_types"],
              },
            },
            project_fit: { type: ["string", "null"], enum: ["compatible", "partial", "verify", "incompatible", null] },
            license_fit_score: { type: "number" },
            explanation_fr: { type: "string" },
          },
          required: ["mapped_work_types", "project_fit", "license_fit_score", "explanation_fr"],
        },
        risk_signals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              signal: { type: "string" },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              detail: { type: "string" },
            },
            required: ["signal", "severity", "detail"],
          },
        },
        scores: {
          type: "object",
          properties: {
            visual_trust_score: { type: "number" },
            unpro_trust_score: { type: "number" },
            license_fit_score: { type: "number" },
          },
          required: ["visual_trust_score", "unpro_trust_score", "license_fit_score"],
        },
        verdict: { type: "string", enum: ["succes", "attention", "non_succes", "se_tenir_loin"] },
        summary_fr: {
          type: "object",
          properties: {
            headline: { type: "string" },
            short_summary: { type: "string" },
            next_steps: { type: "array", items: { type: "string" } },
          },
          required: ["headline", "short_summary", "next_steps"],
        },
      },
      required: [
        "input_summary", "visual_extraction", "probable_entities",
        "registry_validation", "license_scope", "risk_signals",
        "scores", "verdict", "summary_fr",
      ],
      additionalProperties: false,
    },
  },
};

// ══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { input, project_description, image_base64, image_type: userImageType } = body;

    const hasTextInput = input && typeof input === "string" && input.trim().length >= 2;
    const hasImage = image_base64 && typeof image_base64 === "string";

    if (!hasTextInput && !hasImage) {
      return new Response(JSON.stringify({ error: "Entrée requise (texte ou image)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── 1. Input Normalization ──
    const inputType: SearchType = hasImage && !hasTextInput ? "upload" : detectInputType(input?.trim() || "");
    let normalizedInput = "";
    if (hasTextInput) {
      const raw = input.trim();
      switch (inputType) {
        case "phone": normalizedInput = normalizePhone(raw); break;
        case "name": normalizedInput = normalizeBusinessName(raw); break;
        case "rbq": normalizedInput = normalizeRbq(raw); break;
        case "neq": normalizedInput = normalizeNeq(raw); break;
        case "website": normalizedInput = normalizeDomain(raw); break;
        default: normalizedInput = raw;
      }
    }

    // ── 2. DB lookup ──
    let dbMatches: any[] = [];
    if (hasTextInput) {
      let query = supabase.from("contractors").select(
        "id, business_name, phone, email, city, license_number, website, slug, verification_status, rating, review_count"
      );
      switch (inputType) {
        case "phone": query = query.ilike("phone", `%${normalizedInput.slice(-7)}%`); break;
        case "name": query = query.ilike("business_name", `%${normalizedInput}%`); break;
        case "rbq": query = query.eq("license_number", normalizedInput); break;
        case "neq": query = query.ilike("neq_number", `%${normalizedInput}%`); break;
        case "website": query = query.ilike("website", `%${normalizedInput}%`); break;
      }
      const { data } = await query.limit(5);
      dbMatches = data || [];
    }

    // ── 3. Build AI prompt ──
    const systemPrompt = `Tu es le moteur de vérification d'entrepreneurs UNPRO au Québec.

MISSION : Reconstruire l'identité commerciale probable d'un entrepreneur, valider ses signaux, analyser la portée de sa licence, et produire un verdict structuré.

PRINCIPES ABSOLUS :
- Ne jamais affirmer de certitude légale absolue
- Utiliser : "identité commerciale probable", "cohérence détectée", "selon les informations disponibles", "vérification complémentaire recommandée"
- Être factuel, prudent et utile
- Tous les scores sont de 0 à 100

CATÉGORIES RBQ et travaux associés :
${Object.entries(RBQ_SCOPE_MAP).map(([code, v]) => `${code} ${v.label_fr}: ${v.work_types.join(", ")}`).join("\n")}

SIGNAUX DE RISQUE à détecter :
- Même téléphone lié à plusieurs noms d'entreprise
- Divergence de marque entre camion/contrat/carte
- Licence RBQ manquante, expirée ou suspendue
- Clauses de dépôt suspectes (>15% du total)
- Domaine courriel générique avec identité faible
- Incohérence service vs portée de licence
- Incohérence ville / zone de service

VERDICTS :
- "succes" : identité cohérente, licence valide, faible risque
- "attention" : quelques signaux à vérifier
- "non_succes" : signaux préoccupants multiples
- "se_tenir_loin" : alertes critiques

RÉSUMÉ : toujours en français. Le headline doit mentionner le nom d'entreprise si disponible.
Les next_steps doivent être concrets et utiles pour un propriétaire.`;

    const userParts: string[] = [];
    if (hasTextInput) {
      userParts.push(`ENTRÉE TEXTE : "${input.trim()}"
Type détecté : ${inputType}
Valeur normalisée : ${normalizedInput}`);
    }
    if (project_description) {
      userParts.push(`PROJET DÉCRIT : "${project_description}"`);
    }
    if (dbMatches.length > 0) {
      userParts.push(`CORRESPONDANCES BASE DE DONNÉES UNPRO :\n${JSON.stringify(dbMatches, null, 2)}`);
    } else {
      userParts.push("Aucune correspondance trouvée dans la base de données UNPRO.");
    }
    if (hasImage) {
      userParts.push(`IMAGE FOURNIE (type indiqué : ${userImageType || "unknown"}). Analyse l'image pour extraire : nom d'entreprise, téléphone, courriel, site web, RBQ, NEQ, adresse, nom du représentant, mots-clés de service, notes de marque/cohérence, et conditions de paiement si c'est un contrat.`);
    } else {
      userParts.push("Aucune image soumise.");
    }
    userParts.push("Produis le rapport de vérification complet en utilisant la fonction submit_verification_report.");

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (hasImage) {
      // Multimodal message with image
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userParts.join("\n\n") },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
        ],
      });
    } else {
      messages.push({ role: "user", content: userParts.join("\n\n") });
    }

    // ── 4. AI Call ──
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: hasImage ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash",
        messages,
        tools: [VERIFICATION_TOOL],
        tool_choice: { type: "function", function: { name: "submit_verification_report" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("No structured output from AI");
    }

    const report = JSON.parse(toolCall.function.arguments);

    // ── 5. Save to DB ──
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      try {
        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = user?.id || null;
      } catch { /* anonymous user */ }
    }

    // Save to verification_reports (legacy table)
    const { error: dbSaveErr } = await supabase.from("verification_reports").insert({
      user_id: userId,
      input_type: inputType,
      input_value: input?.trim() || "image_upload",
      project_description: project_description || null,
      contractor_identity: report.probable_entities?.[0] || {},
      rbq_validation: report.registry_validation,
      neq_validation: { status: report.registry_validation?.neq_status, registered_name: report.registry_validation?.registered_name },
      license_scope: report.license_scope,
      visual_validation: report.visual_extraction,
      risk_signals: report.risk_signals,
      trust_score: report.scores?.unpro_trust_score || 0,
      license_fit_score: report.scores?.license_fit_score || null,
      verdict: report.verdict,
      matched_contractor_id: dbMatches.length === 1 ? dbMatches[0].id : null,
    });
    if (dbSaveErr) console.error("DB save error:", dbSaveErr);

    // Save to contractor_verification_searches (analytics table)
    const primaryEntity = report.probable_entities?.[0];
    const { error: analyticsErr } = await supabase.from("contractor_verification_searches").insert({
      user_id: userId ? undefined : null,
      session_id: null,
      is_logged_in: !!userId,
      search_query: input?.trim() || null,
      search_type: inputType,
      normalized_phone: inputType === "phone" ? normalizedInput : null,
      detected_contractor_id: dbMatches.length === 1 ? dbMatches[0].id : null,
      detected_business_name: primaryEntity?.business_name || null,
      detected_rbq: primaryEntity?.probable_rbq || null,
      detected_neq: primaryEntity?.probable_neq || null,
      project_type: project_description || null,
      trust_score: report.scores?.unpro_trust_score || 0,
      license_fit_score: report.scores?.license_fit_score || 0,
      verdict: report.verdict,
      result_found: (report.probable_entities?.length || 0) > 0,
      visual_validation_used: hasImage,
      contract_uploaded: userImageType === "contract",
      truck_uploaded: userImageType === "truck",
      business_card_uploaded: userImageType === "business_card",
      source_page: body.source_page || null,
      device_type: body.device_type || null,
      referrer: body.referrer || null,
    });
    if (analyticsErr) console.error("Analytics save error:", analyticsErr);

    return new Response(JSON.stringify({ success: true, report, db_matches: dbMatches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-contractor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur interne" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
