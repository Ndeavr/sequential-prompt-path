// visual-analysis — Multimodal AI image diagnostic returning findings + bbox annotations + summary.
// Persists into public.visual_analyses. Used inline by Alex chat.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  image_base64?: string;
  mime_type?: string;
  property_id?: string | null;
  session_id?: string | null;
  user_message?: string;
}

interface AiAnnotation {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface AiResponse {
  summary: string;
  findings: { label: string; severity: AiAnnotation["severity"] }[];
  annotations: AiAnnotation[];
  urgency: AiAnnotation["severity"];
  recommended_action?: string;
}

const SYSTEM = `Tu es un expert en bâtiment résidentiel au Québec (français québécois).
On te montre une photo prise par un propriétaire. Tu identifies les problèmes visibles, tu les localises sur l'image et tu donnes un résumé court, factuel et rassurant.
Tu réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans préambule.`;

const USER = `Analyse cette photo et retourne STRICTEMENT ce JSON:
{
  "summary": string,                // 1-2 phrases, fr-CA, ton concierge calme
  "findings": [                     // 1 à 5 observations clés (FR)
    { "label": string, "severity": "low"|"medium"|"high"|"critical" }
  ],
  "annotations": [                  // 0 à 5 zones repérées, coordonnées NORMALISÉES 0..1
    { "x": number, "y": number, "w": number, "h": number, "label": string, "severity": "low"|"medium"|"high"|"critical" }
  ],
  "urgency": "low"|"medium"|"high"|"critical",
  "recommended_action": string       // 1 phrase action concrète (FR)
}
Règles:
- Coordonnées 0..1 (0 = haut/gauche, 1 = bas/droite). x+w <= 1, y+h <= 1.
- Maximum 5 annotations. Pas de chevauchements inutiles.
- Si rien d'anormal: findings vide, annotations vide, urgency = "low", summary rassurant.
- Pas de jargon. Pas de marque commerciale.`;

function sanitize(parsed: any): AiResponse {
  const sev = (v: any): AiAnnotation["severity"] =>
    v === "low" || v === "medium" || v === "high" || v === "critical" ? v : "medium";
  const clamp01 = (n: any) => {
    const x = typeof n === "number" ? n : Number(n);
    return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
  };
  const annotations: AiAnnotation[] = Array.isArray(parsed.annotations)
    ? parsed.annotations.slice(0, 5).map((a: any) => {
        const x = clamp01(a.x);
        const y = clamp01(a.y);
        const w = clamp01(a.w);
        const h = clamp01(a.h);
        return {
          x,
          y,
          w: Math.min(w, 1 - x),
          h: Math.min(h, 1 - y),
          label: String(a.label ?? "").slice(0, 60),
          severity: sev(a.severity),
        };
      })
    : [];
  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.slice(0, 5).map((f: any) => ({
        label: String(f.label ?? "").slice(0, 120),
        severity: sev(f.severity),
      }))
    : [];
  return {
    summary: String(parsed.summary ?? "").slice(0, 500),
    findings,
    annotations,
    urgency: sev(parsed.urgency),
    recommended_action: parsed.recommended_action
      ? String(parsed.recommended_action).slice(0, 200)
      : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const body = (await req.json()) as ReqBody;
    if (!body.image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mime = body.mime_type || "image/jpeg";
    const userText = body.user_message
      ? `Contexte propriétaire: ${body.user_message}\n${USER}`
      : USER;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${body.image_base64}` },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`gateway ${aiRes.status}: ${t.slice(0, 200)}`);
    }

    const ai = await aiRes.json();
    const content = ai?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      parsed = {};
    }
    const result = sanitize(parsed);

    // Persist (best-effort)
    let analysis_id: string | undefined;
    try {
      const authHeader = req.headers.get("Authorization") ?? "";
      const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      let userId: string | null = null;
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: u } = await supa.auth.getUser(token);
        userId = u?.user?.id ?? null;
      }
      const insertRow: any = {
        property_id: body.property_id ?? null,
        user_id: userId,
        session_id: userId ? null : body.session_id ?? null,
        uploaded_file: "inline",
        ai_findings: result.findings,
        annotations: result.annotations,
        urgency_level: result.urgency,
        recommended_action: result.recommended_action ?? null,
      };
      // Guest insert requires user_id null + session_id present
      if (!userId && !insertRow.session_id) insertRow.session_id = crypto.randomUUID();
      const { data, error } = await supa
        .from("visual_analyses")
        .insert(insertRow)
        .select("id")
        .single();
      if (!error) analysis_id = data.id;

      // Memory event (only when authenticated)
      if (userId) {
        await supa.from("property_memory_events").insert({
          property_id: body.property_id ?? null,
          user_id: userId,
          event_type: "visual_analysis",
          ai_summary: result.summary,
          risk_level: result.urgency,
          related_documents: analysis_id ? [{ kind: "visual_analysis", id: analysis_id }] : [],
          metadata: { findings_count: result.findings.length },
        });
      }
    } catch (e) {
      console.error("visual-analysis persist error", e);
    }

    return new Response(JSON.stringify({ ...result, analysis_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("visual-analysis fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
