import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, userId } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Tu es un détecteur d'intention pour UNPRO (services résidentiels au Québec).
Analyse le texte de l'utilisateur et retourne un JSON strict:
{
  "intent_type": "renovation|repair|emergency|inspection|consulting|other",
  "category": "plumbing|electrical|roofing|insulation|kitchen|bathroom|hvac|general",
  "urgency_level": "low|normal|high|emergency",
  "summary_fr": "courte description du besoin",
  "suggested_match": {
    "name": "Nom fictif réaliste d'entrepreneur québécois",
    "score": 92,
    "badge": "Pro Vérifié",
    "delay": "48h",
    "priceMin": 500,
    "priceMax": 2500
  }
}
Réponds UNIQUEMENT avec le JSON, sans markdown.`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!aiRes.ok) {
      throw new Error(`AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response (strip markdown fences if present)
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(
      JSON.stringify({
        intent_type: parsed.intent_type || "other",
        category: parsed.category || "general",
        urgency_level: parsed.urgency_level || "normal",
        summary: parsed.summary_fr || text,
        match: parsed.suggested_match || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("intent-detect error:", err);
    return new Response(
      JSON.stringify({ error: "Intent detection failed", match: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
