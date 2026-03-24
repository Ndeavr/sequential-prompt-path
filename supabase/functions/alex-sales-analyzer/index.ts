import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SALES_SYSTEM_PROMPT = `Tu es Alex, la conseillère IA stratégique d'UNPRO en mode VENTE.

IDENTITÉ
- Tu es une experte en conversion B2B pour entrepreneurs en construction/rénovation au Québec.
- Tu parles français québécois naturel, professionnel, jamais familier.
- Tu es directe, confiante, basée sur les données. Jamais agressive.

MISSION
- Analyser le profil de l'entrepreneur et identifier ses opportunités manquées.
- Quantifier l'impact financier de ses lacunes (rendez-vous perdus, revenus manqués).
- Recommander le bon plan UNPRO selon son profil RÉEL.
- Convaincre par les données, pas par la pression.

PLANS UNPRO
- Recrue (0$/mois): Projets S/M, visibilité de base
- Pro (49$/mois): Projets S/M/L, badge Pro, visibilité améliorée  
- Premium (99$/mois): Projets XL, auto-acceptation, badge Premium
- Élite (199$/mois): Tous projets, analytics avancés, priorité haute
- Signature (399$/mois): Exclusivité territoriale, support dédié, priorité maximale

RÈGLES DE VENTE
1. JAMAIS recommander un upgrade si le profil est incomplet (<60%) — le profil est le vrai frein.
2. Toujours quantifier: "Vous perdez environ X rendez-vous/mois" ou "Valeur estimée: X$/mois".
3. Utiliser la rareté réelle: places limitées par territoire.
4. Comparer avec la concurrence locale quand pertinent.
5. Une seule recommandation claire à la fois.
6. Si le plan actuel est suffisant, le dire honnêtement — ça construit la confiance.

FORMAT DE RÉPONSE
Retourne un JSON structuré:
{
  "diagnosis": "Phrase courte du diagnostic principal",
  "impact_statement": "Phrase d'impact chiffrée",
  "missed_opportunities": number,
  "estimated_monthly_loss_cad": number,
  "recommended_plan": "pro|premium|elite|signature|current",
  "recommended_plan_reason": "Explication courte",
  "priority_actions": ["action 1", "action 2", "action 3"],
  "confidence": number (0-100),
  "sales_message": "Message de vente conversationnel (2-3 phrases max)",
  "objection_handler": "Réponse anticipée à l'objection probable"
}

Réponds UNIQUEMENT avec le JSON, pas de texte autour.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractorContext, conversationHistory } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!contractorContext) {
      return new Response(
        JSON.stringify({ error: "Missing contractor context" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const c = contractorContext;
    const contextMsg = `
PROFIL ENTREPRENEUR À ANALYSER:
- Nom: ${c.business_name || "Non renseigné"}
- Spécialité: ${c.specialty || "Non renseignée"}
- Ville: ${c.city || "Non renseignée"}
- Score AIPP: ${c.aipp_score ?? "Non calculé"}/100
- Note moyenne: ${c.rating ?? "Aucun avis"}/5
- Nombre d'avis: ${c.review_count ?? 0}
- Complétion profil: ${c.completeness ?? 0}%
- Forfait actuel: ${c.plan || "recrue"}
- Licence RBQ: ${c.license_number ? "Oui" : "Non"}
- Assurance: ${c.insurance_info ? "Oui" : "Non"}  
- Logo: ${c.logo_url ? "Oui" : "Non"}
- Site web: ${c.website ? "Oui" : "Non"}
- Expérience: ${c.years_experience ?? "Non renseignée"} ans
- Rendez-vous nouveaux: ${c.new_appointments ?? 0}
- Rendez-vous complétés: ${c.completed_appointments ?? 0}
- Champs manquants: ${c.missing_fields?.join(", ") || "Aucun"}

DONNÉES MARCHÉ (estimées):
- Demande moyenne dans ${c.city || "sa zone"}: 15-25 demandes/mois pour ${c.specialty || "sa catégorie"}
- Entrepreneurs actifs dans la zone: 3-8
- Valeur moyenne d'un rendez-vous: 2500-8000$ selon la catégorie`;

    const messages = [
      { role: "system", content: SALES_SYSTEM_PROMPT },
      { role: "user", content: contextMsg },
      ...(conversationHistory || []),
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let salesAnalysis;
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      salesAnalysis = JSON.parse(cleaned);
    } catch {
      salesAnalysis = {
        diagnosis: "Analyse en cours...",
        impact_statement: content.slice(0, 200),
        missed_opportunities: 0,
        estimated_monthly_loss_cad: 0,
        recommended_plan: "current",
        recommended_plan_reason: content.slice(0, 100),
        priority_actions: [],
        confidence: 50,
        sales_message: content.slice(0, 300),
        objection_handler: "",
      };
    }

    return new Response(JSON.stringify(salesAnalysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("alex-sales-analyzer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
