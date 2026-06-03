// Concierge — generate personalized message via Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prospect_id, template, base_text } = await req.json();
    if (!prospect_id || !base_text) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: p } = await supabase.from("contractor_prospects").select("*").eq("id", prospect_id).maybeSingle();
    if (!p) {
      return new Response(JSON.stringify({ error: "prospect not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const system = `Tu es un closer concierge UNPRO. Tu écris en français québécois, ultra-court (max 90 mots), naturel, premium.
Positionnement obligatoire: "Devenez l'un des entrepreneurs que l'IA recommande en premier" + "Rendez-vous exclusifs, pas des leads partagés".
INTERDIT: "abonnement", "marketing", "leads", "soumissions", brochure, longue explication.
Crée: curiosité + ego trigger + peur de l'invisibilité.
Garde la même structure que le brouillon mais personnalise avec les vraies données du prospect.`;

    const ctx = `Prospect:
- Entreprise: ${p.business_name}
- Propriétaire: ${p.owner_name ?? "—"}
- Métier: ${p.trade ?? p.category_slug ?? "—"}
- Ville: ${p.city ?? "—"}
- Avis: ${p.review_count ?? 0} (${p.review_rating ?? "?"}★)
- Score IA: ${Math.round(p.aipp_score ?? 0)}/100
- Site: ${p.website_url ?? "aucun"}

Template type: ${template}
Brouillon à personnaliser:
---
${base_text}
---
Retourne uniquement le message final, sans préambule.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: ctx }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI gateway ${r.status}: ${t}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content?.trim() ?? base_text;
    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
