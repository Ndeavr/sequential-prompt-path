/**
 * Alex — Visual Style Advisor
 * Analyse une photo et propose 2 styles avec previews "after" générés.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function generateAfterImage(apiKey: string, originalDataUrl: string, stylePrompt: string): Promise<string | null> {
  try {
    const resp = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Refais cette image en appliquant ce style de rénovation: ${stylePrompt}. Garde le même cadrage, la même perspective, le même bâtiment. Aperçu conceptuel photoréaliste, lumière naturelle.` },
            { type: "image_url", image_url: { url: originalDataUrl } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });
    if (!resp.ok) {
      console.error("img gen failed", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
  } catch (e) {
    console.error("img gen error", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { image_base64, mime_type = "image/jpeg" } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const originalDataUrl = `data:${mime_type};base64,${image_base64}`;

    // 1. Analyse contextuelle (rapide)
    const analysisResp = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es Alex d'UNPRO, conseillère visuelle. Analyse la photo et propose 2 directions stylistiques distinctes adaptées au bâtiment résidentiel québécois." },
          { role: "user", content: [
            { type: "text", text: "Analyse cette photo et propose deux styles de rénovation contrastés." },
            { type: "image_url", image_url: { url: originalDataUrl } },
          ]},
        ],
        tools: [{
          type: "function",
          function: {
            name: "propose_styles",
            description: "Propose deux directions visuelles distinctes",
            parameters: {
              type: "object",
              properties: {
                detected_area: { type: "string" },
                project_type: { type: "string" },
                recommended_trade: { type: "string" },
                intro_text: { type: "string", description: "Une phrase pour présenter les deux options à l'utilisateur." },
                styles: {
                  type: "array",
                  minItems: 2, maxItems: 2,
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      bullets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 3 },
                      image_prompt: { type: "string", description: "Prompt précis pour générer l'aperçu après." },
                    },
                    required: ["id", "label", "bullets", "image_prompt"],
                  },
                },
              },
              required: ["detected_area", "project_type", "recommended_trade", "intro_text", "styles"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "propose_styles" } },
      }),
    });

    if (!analysisResp.ok) {
      const t = await analysisResp.text();
      console.error("analysis", analysisResp.status, t);
      return new Response(JSON.stringify({ error: "analysis_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysisData = await analysisResp.json();
    const tc = analysisData.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) {
      return new Response(JSON.stringify({ error: "no_styles" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const analysis = JSON.parse(tc.function.arguments);

    // 2. Génère 2 previews en parallèle
    const previews = await Promise.all(
      analysis.styles.map((s: any) => generateAfterImage(apiKey, originalDataUrl, s.image_prompt))
    );

    const styles = analysis.styles.map((s: any, i: number) => ({
      id: s.id,
      label: s.label,
      bullets: s.bullets,
      after_image_url: previews[i],
    }));

    return new Response(JSON.stringify({
      detected_area: analysis.detected_area,
      project_type: analysis.project_type,
      recommended_trade: analysis.recommended_trade,
      intro_text: analysis.intro_text,
      original_image_url: originalDataUrl,
      styles,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[alex-visual-styles]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
