import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTION_TEMPLATES: Record<string, { label: string; description: string; priority: number }> = {
  call: {
    label: "Appeler le client",
    description: "Contacter par téléphone dans les 2 heures pour maximiser la conversion.",
    priority: 1,
  },
  email_intro: {
    label: "Envoyer un courriel de présentation",
    description: "Envoyer un courriel personnalisé avec profil entrepreneur et disponibilités.",
    priority: 3,
  },
  contact: {
    label: "Premier contact",
    description: "Établir le premier contact selon la préférence du client.",
    priority: 2,
  },
  send_quote: {
    label: "Envoyer une soumission",
    description: "Préparer et envoyer une soumission détaillée basée sur la description du projet.",
    priority: 2,
  },
  schedule_visit: {
    label: "Planifier une visite",
    description: "Proposer un créneau de visite pour évaluer le projet sur place.",
    priority: 2,
  },
  follow_up: {
    label: "Relance automatique",
    description: "Programmer une relance dans 48h si aucune réponse.",
    priority: 5,
  },
  nurture: {
    label: "Séquence de nurturing",
    description: "Ajouter à une séquence de contenu éducatif pour maintenir l'intérêt.",
    priority: 7,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { lead_id, next_action, quality_score } = await req.json();
    if (!lead_id) throw new Error("lead_id required");

    const actions: Array<{
      lead_id: string;
      action_type: string;
      action_label: string;
      action_description: string;
      priority: number;
      reasoning: string;
      status: string;
    }> = [];

    // Primary action
    const primary = ACTION_TEMPLATES[next_action] || ACTION_TEMPLATES.contact;
    actions.push({
      lead_id,
      action_type: next_action || "contact",
      action_label: primary.label,
      action_description: primary.description,
      priority: primary.priority,
      reasoning: `Action principale basée sur le score qualité (${quality_score || 50})`,
      status: "pending",
    });

    // Secondary action: always add follow_up
    const followUp = ACTION_TEMPLATES.follow_up;
    actions.push({
      lead_id,
      action_type: "follow_up",
      action_label: followUp.label,
      action_description: followUp.description,
      priority: followUp.priority,
      reasoning: "Action de sécurité — relance automatique si pas de réponse",
      status: "pending",
    });

    // If high quality, add schedule_visit
    if ((quality_score || 0) >= 70) {
      const visit = ACTION_TEMPLATES.schedule_visit;
      actions.push({
        lead_id,
        action_type: "schedule_visit",
        action_label: visit.label,
        action_description: visit.description,
        priority: visit.priority,
        reasoning: `Lead haute qualité (${quality_score}) → visite recommandée`,
        status: "pending",
      });
    }

    // If low quality, nurture
    if ((quality_score || 0) < 40) {
      const nurture = ACTION_TEMPLATES.nurture;
      actions.push({
        lead_id,
        action_type: "nurture",
        action_label: nurture.label,
        action_description: nurture.description,
        priority: nurture.priority,
        reasoning: `Lead basse qualité (${quality_score}) → nurturing recommandé`,
        status: "pending",
      });
    }

    const { error } = await supabase.from("market_next_best_actions").insert(actions);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, actions_created: actions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
