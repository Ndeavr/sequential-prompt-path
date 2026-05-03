// LIVE Agent — Generate personalized outreach email DRAFT (no send until admin approves)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { prospect_id } = await req.json();
    if (!prospect_id) throw new Error("prospect_id required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { data: p, error } = await supabase.from("contractor_prospects")
      .select("*").eq("id", prospect_id).single();
    if (error || !p) throw new Error("prospect not found");

    const ex = p.raw_data?.extracted || {};
    const breakdown = p.raw_data?.score_breakdown || {};
    const aipp = p.aipp_score || 0;

    const ctx = `
Entreprise: ${p.business_name}
Ville: ${p.city || "QC"}
Métier: ${p.trade || p.category_slug}
Site: ${p.website_url}
Score AIPP: ${aipp}/100
Faiblesses: ${[
  breakdown.web < 15 && "présence web faible",
  breakdown.trust < 12 && "signaux de confiance manquants (RBQ/avis)",
  breakdown.contact < 15 && "info de contact incomplète",
  breakdown.services < 12 && "services peu clairs",
].filter(Boolean).join(", ") || "aucune majeure"}
Description: ${ex.description || ""}
`.trim();

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es Alex d'UNPRO. Tu écris en français québécois (fr-CA). Court, direct, humain. Pas de jargon. Pas d'emojis. Toujours 2 phrases d'accroche personnalisée + 1 CTA clair pour parler. Ne mens jamais sur des faits." },
          { role: "user", content: `Écris un courriel personnalisé pour cet entrepreneur. Mentionne 1 observation concrète tirée du contexte, propose qu'UNPRO l'aide à obtenir plus de contrats grâce à l'IA, CTA: répondre ou appeler 514-249-9522.\n\n${ctx}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "draft_email",
            parameters: {
              type: "object",
              properties: {
                subject: { type: "string", description: "Objet court FR (max 60 char)" },
                body: { type: "string", description: "Corps HTML simple (paragraphes <p>)" },
                personalization_note: { type: "string", description: "Ce qui rend ce message personnel" },
              },
              required: ["subject", "body", "personalization_note"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "draft_email" } },
      }),
    });
    const aiJson = await ai.json();
    if (!ai.ok) throw new Error(`Gemini: ${ai.status}`);
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("no draft generated");
    const draft = JSON.parse(args);

    const { data: inserted, error: insErr } = await supabase.from("live_outreach_drafts").insert({
      prospect_id,
      channel: "email",
      subject: draft.subject,
      body: draft.body,
      draft_status: "pending_approval",
      approved_by_admin: false,
    }).select().single();
    if (insErr) throw insErr;

    await supabase.from("contractor_prospects").update({
      outreach_status: "draft_ready",
    }).eq("id", prospect_id);

    return new Response(JSON.stringify({ success: true, draft: inserted, personalization_note: draft.personalization_note }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
