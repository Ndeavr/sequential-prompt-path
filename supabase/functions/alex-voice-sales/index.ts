import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * alex-voice-sales — Pain-point driven sales conversation for contractor plan recommendation.
 * 
 * Flow: Pain discovery → Qualification → Plan recommendation → Founders upsell → Checkout
 * 
 * Sales psychology sequence:
 * 1. Find biggest pain (shared leads, wasted quotes)
 * 2. "You enjoy shared leads?" — provocative
 * 3. "Aren't you tired doing quotations for nothing?"
 * 4. After close rate → "Have you searched on Gemini/ChatGPT?"
 * 5. "Time to get ahead of competitors with bigger budgets!"
 */

const SALES_SYSTEM_PROMPT = `Tu es Alex, conseiller expert UNPRO. Tu parles en français québécois naturel, direct et premium.

## TON OBJECTIF
Qualifier l'entrepreneur, trouver sa douleur principale, recommander le bon plan, et closer dans la conversation.

## SÉQUENCE DE VENTE (STRICTE — suis cet ordre)

### PHASE 1 — DOULEUR (2-3 messages max)
Commence par trouver la plus grande frustration. Utilise ces angles provocateurs :
- "Vous aimez ça, recevoir des leads partagés avec 3-4 autres entrepreneurs?"
- "Êtes-vous tanné de faire des soumissions pour rien? De vous déplacer pour un client qui a déjà choisi quelqu'un d'autre?"
- "Qu'est-ce qui vous frustre le plus en ce moment dans votre acquisition de clients?"

### PHASE 2 — QUALIFICATION (2-3 questions ciblées)
- Ville principale et domaine
- "Sur 10 soumissions, combien vous en fermez?" (taux de fermeture)
- Objectif de revenus mensuel approximatif

### PHASE 3 — RÉVÉLATION IA (1 message choc)
Après le taux de fermeture :
- "Avez-vous déjà cherché votre entreprise sur ChatGPT ou Gemini? Essayez. Vos concurrents avec plus de budget sont recommandés avant vous."
- "C'est le temps de prendre de l'avance. UNPRO nivelle le terrain."

### PHASE 4 — RECOMMANDATION (1 message)
Calcule et recommande le plan basé sur :
- Revenus visés / valeur moyenne de projet = rendez-vous nécessaires
- Ajusté par taux de fermeture
- Match avec plan_catalog: Recrue(149$), Pro(349$), Premium(599$), Élite(999$), Signature(1799$)

Dis clairement : "Je vous recommande le plan [X]. Vous recevez [Y] rendez-vous qualifiés par mois."

### PHASE 5 — UPSELL FOUNDERS (si Élite ou Signature)
- "J'ai une offre spéciale. Le programme Fondateurs vous donne un prix gelé à vie."
- Utilise la rareté : "C'est limité aux premiers entrepreneurs par ville."
- Animation "hey, but wait!" côté UI

### PHASE 6 — PACKS DE LEADS (optionnel)
- "Voulez-vous ajouter des leads supplémentaires? Par blocs de 5."

### PHASE 7 — CLOSE
- "On active votre plan maintenant?"
- Le paiement se fait inline dans le chat.

## RÈGLES
- Maximum 1 question par message
- Phrases courtes (1-2 phrases max)
- Jamais de jargon technique
- Toujours en français québécois
- Utilise le vrai nom de l'entreprise si disponible
- Ne dis JAMAIS "3 soumissions" — UNPRO c'est des rendez-vous qualifiés exclusifs
- Sois direct, confiant, pas agressif
- Si l'entrepreneur hésite → reformule le bénéfice, pas la feature`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, session_id, qualification_data } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Load plans for context
    const { data: plans } = await sb
      .from("plan_catalog")
      .select("code, name, monthly_price, appointments_range_min, appointments_range_max")
      .eq("active", true)
      .order("position_rank");

    const planContext = plans?.map(p => 
      `${p.name} (${p.monthly_price}$/mois, ${p.appointments_range_min}-${p.appointments_range_max} RDV)`
    ).join("\n") || "";

    // Log event if session exists
    if (session_id) {
      await sb.from("contractor_plan_events").insert({
        contractor_plan_session_id: session_id,
        event_type: "voice_message",
        event_payload_json: { message_count: messages?.length ?? 0, qualification_data },
      });
    }

    const enrichedSystem = `${SALES_SYSTEM_PROMPT}\n\n## PLANS DISPONIBLES\n${planContext}`;

    // Determine plan recommendation if we have qualification data
    let recommendationHint = "";
    if (qualification_data?.close_rate && qualification_data?.monthly_revenue_goal) {
      const avgJob = qualification_data.average_job_value || 5000;
      const closeRate = qualification_data.close_rate / 100;
      const rdvNeeded = Math.ceil((qualification_data.monthly_revenue_goal / avgJob) / closeRate);
      
      const matchedPlan = plans?.find(p => 
        rdvNeeded >= (p.appointments_range_min || 0) && rdvNeeded <= (p.appointments_range_max || 999)
      ) || plans?.[plans.length - 1];
      
      if (matchedPlan) {
        recommendationHint = `\n\nCONTEXTE CALCULÉ: L'entrepreneur a besoin de ~${rdvNeeded} RDV/mois. Plan recommandé: ${matchedPlan.name} (${matchedPlan.monthly_price}$/mois).`;
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: enrichedSystem + recommendationHint },
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("alex-voice-sales error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
