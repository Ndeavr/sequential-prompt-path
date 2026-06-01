// supabase/functions/visual-analysis/index.ts
// PROTECTED: Multimodal Gemini analysis. Input: base64 image. Output: findings,
// risk_score, urgency_level, recommended_action. Persists to visual_analyses.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Finding {
  type: "circle" | "rect" | "heat";
  x: number; y: number; w?: number; h?: number;
  label: string;
  severity: "low" | "medium" | "high" | "critical";
}

const SYSTEM_PROMPT = `Tu es Alex, le concierge IA d'UNPRO, expert en diagnostic résidentiel québécois.
Tu analyses une photo soumise par un propriétaire et identifies les zones à risque.

RÈGLES STRICTES:
- Réponds UNIQUEMENT en JSON valide, aucun texte avant/après.
- Coordonnées normalisées entre 0 et 1 (origine haut-gauche).
- Maximum 6 findings.
- Sévérités: low | medium | high | critical.
- Labels en français québécois, courts (max 80 caractères), orientés constat.
- recommended_action: une seule action concrète, max 140 caractères.
- risk_score: 0 à 1 (probabilité globale de problème significatif).
- urgency_level: low | medium | high | critical (correspond au worst finding).

SCHÉMA:
{
  "findings": [{"type":"circle","x":0.5,"y":0.4,"w":0.15,"label":"Infiltration possible","severity":"high"}],
  "risk_score": 0.72,
  "urgency_level": "high",
  "recommended_action": "Faire inspecter la zone par un couvreur dans les 7 jours."
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_data, session_id, property_id } = await req.json();
    if (!image_data || typeof image_data !== "string") {
      return new Response(JSON.stringify({ error: "image_data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway (OpenAI-compatible) with image input
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse cette photo de propriété." },
              { type: "image_url", image_url: { url: image_data } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text().catch(() => "");
      console.error("[visual-analysis] gateway error", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "analysis_failed", status: aiRes.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { findings?: Finding[]; risk_score?: number; urgency_level?: string; recommended_action?: string } = {};
    try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { parsed = {}; }

    const findings = Array.isArray(parsed.findings) ? parsed.findings.slice(0, 6) : [];
    const risk_score = typeof parsed.risk_score === "number" ? parsed.risk_score : 0;
    const urgency_level = ["low", "medium", "high", "critical"].includes(parsed.urgency_level ?? "")
      ? parsed.urgency_level : "low";
    const recommended_action = parsed.recommended_action ?? "";

    // Persist (best-effort) — uses service role so RLS doesn't block guest inserts
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(supabaseUrl, serviceKey);
      await admin.from("visual_analyses").insert({
        property_id: property_id ?? null,
        session_id: session_id ?? null,
        uploaded_file: "inline-base64",
        ai_findings: findings,
        annotations: findings,
        urgency_level,
        risk_probability: risk_score,
        recommended_action,
      });
    } catch (e) {
      console.warn("[visual-analysis] persist failed", e);
    }

    return new Response(JSON.stringify({
      findings, risk_score, urgency_level, recommended_action,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[visual-analysis] error", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
