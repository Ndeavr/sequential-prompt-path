// UNPRO — Content Image Validate
// Validates a candidate image against a category's rules using Gemini vision.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { image_url, category_slug, image_id } = await req.json();
    if (!image_url || !category_slug) {
      return json({ error: "image_url and category_slug required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: cat } = await sb
      .from("content_image_categories")
      .select("id")
      .eq("slug", category_slug)
      .maybeSingle();
    if (!cat) return json({ error: "unknown category" }, 404);

    const { data: rule } = await sb
      .from("content_image_rules")
      .select("*")
      .eq("category_id", cat.id)
      .maybeSingle();
    if (!rule) return json({ error: "no rule for category" }, 404);

    const prompt = `You are an image moderator for a Quebec home services publication.
Category: "${category_slug}".
Allowed visual tags: ${rule.allowed_tags.join(", ") || "none"}.
Blocked tags: ${rule.blocked_tags.join(", ") || "none"}.
Required tags: ${rule.required_tags.join(", ") || "none"}.

Analyze the image and respond with STRICT JSON only, no prose:
{
  "detected_tags": string[],
  "violates_blocked": string[],
  "missing_required": string[],
  "confidence": number (0..1),
  "verdict": "approved" | "rejected",
  "reason": string
}
Verdict = "rejected" if any blocked tag is present OR any required tag is missing OR confidence < ${rule.min_confidence}.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: "ai_failed", detail: t }, 502);
    }

    const ai = await aiRes.json();
    const text = ai?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = { verdict: "rejected", reason: "invalid_json", confidence: 0 }; }

    const detected = parsed.detected_tags ?? [];
    const violates = parsed.violates_blocked ?? [];
    const missing = parsed.missing_required ?? [];
    const confidence = Number(parsed.confidence ?? 0);
    const verdict = parsed.verdict === "approved" && violates.length === 0 && missing.length === 0 && confidence >= rule.min_confidence
      ? "approved"
      : "rejected";

    // Persist if we have an image_id
    if (image_id) {
      await sb.from("content_image_library").update({
        detected_tags: detected,
        violates_blocked: violates,
        missing_required: missing,
        confidence,
        status: verdict,
        rejected_reason: verdict === "rejected" ? (parsed.reason ?? "policy_violation") : null,
        reviewed_at: new Date().toISOString(),
      }).eq("id", image_id);
    }

    return json({
      verdict,
      confidence,
      detected_tags: detected,
      violates_blocked: violates,
      missing_required: missing,
      reason: parsed.reason ?? null,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
