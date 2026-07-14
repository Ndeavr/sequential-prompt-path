import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STANDOUT_FR: Record<string, string> = {
  communication: "la communication",
  professionalism: "le professionnalisme",
  cleanliness: "la propreté",
  education: "les explications claires",
  quality: "la qualité du travail",
  respect: "le respect",
  value: "le rapport qualité-prix",
  problem_solved: "la résolution du problème",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const body = await req.json();
    const { rating, work, tags, experience, mode, previous, contractor_name, city } = body;

    const highlights = (tags ?? []).map((t: string) => STANDOUT_FR[t] ?? t).join(", ");

    let instruction = `Écris un avis Google authentique en français québécois pour ${contractor_name}${city ? ` à ${city}` : ""}. Note: ${rating}/5. Travaux: ${work}. Points forts mentionnés par le client: ${highlights}. Expérience racontée: "${experience}".`;
    if (mode === "shorter") instruction += ` Réécris l'avis suivant en le rendant plus court (2-3 phrases): "${previous}"`;
    else if (mode === "longer") instruction += ` Réécris l'avis suivant en l'étoffant avec plus de détails (5-6 phrases): "${previous}"`;
    else instruction += ` L'avis doit faire 60-120 mots, être naturel, spécifique, mentionner le type de travaux et la ville si pertinent. Pas d'exagération, pas d'emojis, pas de titre. Signature simple à la fin: — le prénom du client si fourni, sinon rien.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Tu écris des avis Google en français québécois, authentiques, spécifiques et concis." },
          { role: "user", content: instruction },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI Gateway error:", res.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed", details: errText }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
