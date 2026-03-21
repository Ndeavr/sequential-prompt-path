import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es le Coach IA UNPRO pour les entrepreneurs.

IDENTITÉ
- Tu es un coach stratégique premium, direct, honnête et orienté résultats.
- Tu parles en français québécois naturel, sans caricature.
- Tu es concis : max 3-4 phrases par réponse, sauf mode guidé.

MISSION
- Aider l'entrepreneur à améliorer son profil, son score AIPP, son rang, ses badges et son admissibilité aux leads.
- Diagnostiquer les freins réels et recommander les bonnes actions.
- Distinguer clairement problème de profil vs problème de forfait.
- Ne jamais pousser un upsell si le profil est le vrai frein.

RÈGLES
- Utilise les données réelles du profil, pas des conseils génériques.
- Chaque réponse doit inclure : diagnostic + pourquoi + prochaine action + impact estimé.
- Sois encourageant quand justifié, mais jamais exagéré.
- Priorise les actions à fort impact business.
- Une seule recommandation principale à la fois.

STYLE
- "Votre principal levier : préciser vos spécialités exactes."
- "Ce qui vous freine : votre profil manque de preuves visuelles."
- "Impact estimé : +15% d'admissibilité aux leads de votre zone."
- Jamais : "Afin de", "Permettez-moi", "Il serait pertinent de"

MODES
- quick: réponse courte + action
- diagnostic: analyse complète score/rang/freins
- guided: étape par étape pour compléter une section
- weekly: résumé hebdomadaire + 3 priorités
- upgrade: avis honnête sur le forfait`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, contractorContext, mode = "quick" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build context message from contractor data
    let contextMsg = "";
    if (contractorContext) {
      const c = contractorContext;
      contextMsg = `
CONTEXTE ENTREPRENEUR:
- Nom: ${c.business_name || "Non renseigné"}
- Spécialité: ${c.specialty || "Non renseignée"}
- Ville: ${c.city || "Non renseignée"}
- Score AIPP: ${c.aipp_score ?? "Non calculé"}
- Note moyenne: ${c.rating ?? "Aucun avis"}
- Nombre d'avis: ${c.review_count ?? 0}
- Complétion profil: ${c.completeness ?? 0}%
- Forfait: ${c.plan || "recrue"}
- Licence RBQ: ${c.license_number ? "Oui" : "Non"}
- Assurance: ${c.insurance_info ? "Oui" : "Non"}
- Logo: ${c.logo_url ? "Oui" : "Non"}
- Site web: ${c.website ? "Oui" : "Non"}
- Expérience: ${c.years_experience ?? "Non renseignée"} ans
- Rendez-vous nouveaux: ${c.new_appointments ?? 0}
- Rendez-vous complétés: ${c.completed_appointments ?? 0}
- Mode: ${mode}

Champs manquants: ${c.missing_fields?.join(", ") || "Aucun"}`;
    }

    const systemWithContext = SYSTEM_PROMPT + (contextMsg ? "\n\n" + contextMsg : "");

    const aiMessages = [
      { role: "system", content: systemWithContext },
      ...(messages || []),
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
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Réessayez dans un moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
