// diagnostic-analyze — Homeowner multimodal diagnostic (photos + description).
// Returns risk score, cost range, likely causes, next actions, recommended contractors.
// Persists into public.visual_analyses + property_memory_events (best-effort).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  images?: Array<{ base64: string; mime?: string }>;
  description?: string;
  city?: string;
  property_id?: string | null;
  session_id?: string | null;
}

type Severity = "low" | "medium" | "high" | "critical";

const CATEGORY_HINTS: Array<{ key: string; keywords: string[] }> = [
  { key: "plomberie", keywords: ["eau", "fuite", "tuyau", "plomber", "évier", "toilette", "drain", "chauffe-eau"] },
  { key: "toiture", keywords: ["toit", "toiture", "bardeau", "solin", "gouttière", "infiltration"] },
  { key: "electricite", keywords: ["électr", "panneau", "prise", "disjoncteur", "fil", "court-circuit"] },
  { key: "chauffage", keywords: ["fournaise", "chauffage", "thermopompe", "climatisation", "cvac", "chaleur"] },
  { key: "isolation", keywords: ["isolation", "moisissure", "humidité", "condensation", "grenier", "entretoit"] },
  { key: "renovation", keywords: ["mur", "plancher", "fissure", "gypse", "cuisine", "salle de bain", "rénovation"] },
  { key: "exterieur", keywords: ["fondation", "brique", "revêtement", "solage", "terrain", "drain français"] },
  { key: "fenetres-portes", keywords: ["fenêtre", "porte", "vitre", "cadre", "coulissante"] },
];

const SYSTEM = `Tu es Alex, concierge en intelligence résidentielle au Québec (français québécois, tutoiement calme, ton rassurant).
Tu analyses des photos et une description fournies par un propriétaire. Tu identifies le problème le plus probable, tu évalues le risque, tu estimes une fourchette de coût réaliste au marché québécois et tu recommandes une action.
Tu réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans préambule.`;

const USER_INSTR = `Retourne STRICTEMENT ce JSON:
{
  "summary": string,               // 2-3 phrases fr-CA, ton concierge calme
  "risk_score": number,            // 0..100 (0 = aucun risque, 100 = danger immédiat)
  "urgency": "low"|"medium"|"high"|"critical",
  "cost_range_cad": { "min": number, "max": number, "confidence": "low"|"medium"|"high" },
  "likely_causes": string[],       // 2 à 4 causes probables (FR, courtes)
  "next_actions": string[],        // 2 à 4 actions concrètes ordonnées (FR)
  "findings": [ { "label": string, "severity": "low"|"medium"|"high"|"critical" } ],
  "recommended_category": string,  // un des: plomberie, toiture, electricite, chauffage, isolation, renovation, exterieur, fenetres-portes, autre
  "recommended_action": string     // 1 phrase, l'action la plus urgente
}
Règles: coûts en CAD, réalistes au Québec 2026. Pas de jargon. Pas de marque commerciale. Si rien d'anormal: risk_score bas, urgency "low", cost_range 0..0.`;

function sev(v: any): Severity {
  return v === "low" || v === "medium" || v === "high" || v === "critical" ? v : "medium";
}
function num(v: any, min = 0, max = 100): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function strArr(v: any, cap = 4): string[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, cap).map((x) => String(x ?? "").slice(0, 200)).filter(Boolean);
}
function pickCategoryFromText(text: string): string {
  const t = text.toLowerCase();
  for (const c of CATEGORY_HINTS) {
    if (c.keywords.some((k) => t.includes(k))) return c.key;
  }
  return "autre";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const body = (await req.json()) as ReqBody;
    const images = Array.isArray(body.images) ? body.images.slice(0, 6) : [];
    const description = String(body.description ?? "").trim().slice(0, 2000);

    if (images.length === 0 && description.length < 5) {
      return new Response(
        JSON.stringify({ error: "need_input", message: "Fournis au moins une photo ou une description." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentBlocks: any[] = [
      {
        type: "text",
        text: `${USER_INSTR}\n\nContexte propriétaire${description ? " (description)" : ""}: ${description || "(aucune description écrite)"}${body.city ? `\nVille: ${body.city}` : ""}`,
      },
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: `data:${img.mime || "image/jpeg"};base64,${img.base64}` },
      })),
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: contentBlocks },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`gateway ${aiRes.status}: ${t.slice(0, 300)}`);
    }

    const ai = await aiRes.json();
    const raw = ai?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { parsed = {}; }

    const category = String(parsed.recommended_category ?? "").toLowerCase().trim()
      || pickCategoryFromText(`${description} ${parsed.summary ?? ""}`);

    const result = {
      summary: String(parsed.summary ?? "").slice(0, 800),
      risk_score: Math.round(num(parsed.risk_score, 0, 100)),
      urgency: sev(parsed.urgency),
      cost_range_cad: {
        min: Math.round(num(parsed.cost_range_cad?.min, 0, 200000)),
        max: Math.round(num(parsed.cost_range_cad?.max, 0, 500000)),
        confidence: sev(parsed.cost_range_cad?.confidence) === "critical" ? "high" : (parsed.cost_range_cad?.confidence || "medium"),
      },
      likely_causes: strArr(parsed.likely_causes, 4),
      next_actions: strArr(parsed.next_actions, 4),
      findings: Array.isArray(parsed.findings)
        ? parsed.findings.slice(0, 5).map((f: any) => ({
            label: String(f.label ?? "").slice(0, 160),
            severity: sev(f.severity),
          }))
        : [],
      recommended_category: category,
      recommended_action: String(parsed.recommended_action ?? "").slice(0, 240),
    };

    // Persist + recommend contractors (best-effort)
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let analysis_id: string | undefined;
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: u } = await supa.auth.getUser(token);
        userId = u?.user?.id ?? null;
      }
      const sessionId = userId ? null : body.session_id ?? crypto.randomUUID();
      const { data: va } = await supa
        .from("visual_analyses")
        .insert({
          property_id: body.property_id ?? null,
          user_id: userId,
          session_id: sessionId,
          uploaded_file: `diagnostic_${images.length}img`,
          ai_findings: result.findings,
          annotations: [],
          urgency_level: result.urgency,
          recommended_action: result.recommended_action || null,
        })
        .select("id")
        .single();
      analysis_id = va?.id;

      if (userId) {
        await supa.from("property_memory_events").insert({
          property_id: body.property_id ?? null,
          user_id: userId,
          event_type: "diagnostic",
          ai_summary: result.summary,
          risk_level: result.urgency,
          related_documents: analysis_id ? [{ kind: "diagnostic", id: analysis_id }] : [],
          metadata: {
            risk_score: result.risk_score,
            cost_range_cad: result.cost_range_cad,
            category: result.recommended_category,
            findings_count: result.findings.length,
          },
        });
      }
    } catch (e) {
      console.error("diagnostic-analyze persist error", e);
    }

    // Contractor recommendations (best-effort, non-blocking)
    let recommended_contractors: Array<{
      id: string; slug: string | null; name: string; city: string | null; rating: number | null;
    }> = [];
    try {
      let q = supa
        .from("contractors")
        .select("id,slug,company_name,city,rating,is_published,is_discoverable")
        .eq("is_published", true)
        .eq("is_discoverable", true)
        .limit(3);
      if (body.city) q = q.ilike("city", `%${body.city}%`);
      const { data } = await q;
      recommended_contractors = (data ?? []).map((r: any) => ({
        id: r.id,
        slug: r.slug ?? null,
        name: r.company_name ?? "Entrepreneur",
        city: r.city ?? null,
        rating: r.rating ?? null,
      }));
    } catch (e) {
      console.error("diagnostic-analyze contractors error", e);
    }

    return new Response(
      JSON.stringify({ ...result, analysis_id, recommended_contractors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("diagnostic-analyze fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
