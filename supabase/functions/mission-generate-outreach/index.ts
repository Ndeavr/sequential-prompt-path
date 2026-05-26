// mission-generate-outreach
// Generates FR-CA personalized email + SMS + landing hook per lead,
// grounded in real enrichment findings. Uses Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/mission-cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const WEAKNESS_FR: Record<string, string> = {
  no_instant_estimate: "absence d'estimation instantanée",
  no_before_after: "aucune section avant/après visible",
  weak_trust_signals: "signaux de confiance faibles (RBQ, garantie, assurance)",
  weak_cta: "appel à l'action faible",
  no_structured_schema: "aucune structure schema.org pour les moteurs IA",
  no_service_catalog: "catalogue de services non structuré",
  no_google_business_link: "profil Google peu connecté au site",
  thin_content: "contenu trop mince pour le référencement IA",
  no_website: "aucun site web détecté",
};

async function callLLM(systemPrompt: string, userPrompt: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status} ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { mission_id } = await req.json();
    if (!mission_id) return jsonResponse({ error: "mission_id required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: mission } = await supabase.from("outbound_missions")
      .select("*").eq("id", mission_id).single();
    if (!mission) return jsonResponse({ error: "mission not found" }, 404);

    const { data: leads } = await supabase.from("outbound_leads")
      .select("id, company_name, website_url, phone, mission_id, company_id, specialty")
      .eq("mission_id", mission_id)
      .limit(50);
    if (!leads?.length) return jsonResponse({ ok: true, generated: 0 });

    // Pull most recent enrichment per lead
    const leadIds = leads.map((l) => l.id);
    const { data: enrichments } = await supabase.from("outbound_lead_enrichment")
      .select("lead_id, enrichment_payload, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });
    const enrichmentByLead = new Map<string, any>();
    for (const e of enrichments ?? []) {
      if (!enrichmentByLead.has(e.lead_id)) enrichmentByLead.set(e.lead_id, e.enrichment_payload);
    }

    const systemPrompt = `Tu es un copywriter B2B fr-CA pour UNPRO.
Génère des messages courts, spécifiques, axés revenus.
Ton: direct, confiant, sans jargon d'agence marketing.
Mentionne SEULEMENT les faiblesses fournies (jamais inventées).
Réponds en JSON strict avec ces champs: subject, email_body, sms_body, landing_hook.
- subject: max 60 caractères, accrocheur, sans emoji.
- email_body: 4 à 6 phrases max, en français du Québec, avec 1 faiblesse concrète + bénéfice + CTA "Voir mon analyse complète".
- sms_body: max 160 caractères, urgence territoire (places restantes à {ville}).
- landing_hook: 1 phrase choc affichée en haut de la landing.`;

    let generated = 0;
    for (const lead of leads) {
      const enrich = enrichmentByLead.get(lead.id) ?? {};
      const weaknessKeys: string[] = enrich.weaknesses ?? [];
      const topWeak = weaknessKeys.slice(0, 3).map((k) => WEAKNESS_FR[k] ?? k);
      const cityFromMission = (mission.cities?.[0]) ?? "votre région";

      const userPrompt = `Entreprise: ${lead.company_name}
Métier: ${lead.specialty ?? mission.trade_slug}
Ville cible: ${cityFromMission}
Faiblesses détectées (réelles, ne pas inventer): ${topWeak.join(" • ") || "site web absent"}
Site: ${lead.website_url ?? "aucun"}
Génère le JSON demandé.`;

      try {
        const out = await callLLM(systemPrompt, userPrompt);
        await supabase.from("outbound_ai_personalizations").insert({
          lead_id: lead.id,
          personalization_type: "full_outreach",
          prompt_used: userPrompt,
          generated_output: JSON.stringify(out),
          approved: true,
        });
        await supabase.from("outbound_leads").update({
          pipeline_stage: "ready_to_send", hook_summary: out.landing_hook ?? null,
        }).eq("id", lead.id);
        generated++;
      } catch (e) {
        console.error("LLM fail for lead", lead.id, e);
      }
    }

    await supabase.from("outbound_missions").update({
      status: "sending", scored_count: generated,
    }).eq("id", mission_id);

    return jsonResponse({ ok: true, generated });
  } catch (e) {
    console.error("mission-generate failed", e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
