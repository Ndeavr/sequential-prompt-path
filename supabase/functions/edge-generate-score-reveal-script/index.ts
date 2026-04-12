/**
 * edge_generate_score_reveal_script — Generates a personalized reveal script.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { score, businessName, sessionId } = await req.json();

    if (typeof score !== "number" || score < 0 || score > 100) {
      return new Response(JSON.stringify({ error: "Score invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const interpretation = getInterpretation(score);
    const script = [
      {
        key: "preparation",
        spoken_text: "J'ai terminé l'analyse de votre présence actuelle. Ce que je vais vous montrer maintenant, ce n'est pas juste un chiffre. C'est un indicateur de la façon dont votre entreprise est comprise, structurée et recommandable dans un environnement piloté par l'IA.",
        display_text: "Analyse terminée. Alex prépare votre résultat.",
        delay_ms: 5000,
        trigger_type: "auto",
      },
      {
        key: "dimensions",
        spoken_text: "Pour arriver à ce résultat, j'ai regardé votre visibilité, la clarté de vos services, vos signaux de confiance, votre capacité à convertir, et votre présence locale. Ça donne une lecture assez précise de votre position actuelle.",
        display_text: "5 dimensions analysées.",
        delay_ms: 6000,
        trigger_type: "auto",
      },
      {
        key: "pre_reveal",
        spoken_text: "Je vais maintenant vous dévoiler votre score AIPP.",
        display_text: "Dévoilement du score…",
        delay_ms: 2500,
        trigger_type: "auto",
      },
      {
        key: "reveal",
        spoken_text: `Votre score actuel est de ${score} sur 100.`,
        display_text: `Score AIPP : ${score}/100`,
        delay_ms: 3000,
        trigger_type: "reveal",
      },
      {
        key: "interpretation",
        spoken_text: `Concrètement, cela veut dire : ${interpretation.spoken}`,
        display_text: interpretation.display,
        delay_ms: 5000,
        trigger_type: "interpret",
      },
      {
        key: "bridge",
        spoken_text: "Et maintenant, je vais vous montrer exactement ce qui influence ce score le plus, et ce qu'on peut améliorer rapidement.",
        display_text: "Découvrez vos points faibles et gains rapides.",
        delay_ms: 4000,
        trigger_type: "auto",
      },
    ];

    // Save steps to DB if session provided
    if (sessionId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const stepsToInsert = script.map((s, i) => ({
        session_id: sessionId,
        step_index: i,
        step_key: s.key,
        spoken_text: s.spoken_text,
        display_text: s.display_text,
        trigger_type: s.trigger_type,
        delay_ms: s.delay_ms,
      }));

      await supabase.from("alex_score_reveal_steps").insert(stepsToInsert);

      await supabase.from("alex_score_reveal_sessions")
        .update({
          reveal_status: "prepared",
          script_json: script,
          interpretation_json: interpretation,
        })
        .eq("id", sessionId);
    }

    return new Response(JSON.stringify({ script, interpretation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getInterpretation(score: number) {
  if (score >= 80) return {
    headline: "Positionnement fort",
    spoken: "votre entreprise est bien positionnée. Vous avez une base solide pour dominer votre territoire.",
    display: "Base solide — opportunité de domination et captation avancée.",
    next_best_action: "Consolider et dominer votre marché",
    level: "dominant",
  };
  if (score >= 60) return {
    headline: "Niveau solide",
    spoken: "vous avez une bonne base, mais quelques ajustements stratégiques peuvent significativement améliorer votre visibilité.",
    display: "Bonne base — optimisation possible pour dominer le territoire.",
    next_best_action: "Optimiser pour convertir davantage",
    level: "solide",
  };
  if (score >= 40) return {
    headline: "Base sous-optimisée",
    spoken: "votre entreprise existe en ligne, mais l'IA a du mal à la comprendre et à la recommander. Des corrections rapides peuvent changer la donne.",
    display: "Présence détectée mais sous-exploitée — pertes probables de visibilité.",
    next_best_action: "Découvrir vos gains rapides",
    level: "moyen",
  };
  return {
    headline: "Présence fragile",
    spoken: "votre visibilité IA est très faible. L'IA ne peut pas vous recommander efficacement. Mais le potentiel de correction est important.",
    display: "Faible lisibilité IA — potentiel important de correction rapide.",
    next_best_action: "Voir ce qui bloque",
    level: "faible",
  };
}
