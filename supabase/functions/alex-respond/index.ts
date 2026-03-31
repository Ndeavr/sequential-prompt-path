/**
 * alex-respond — Edge function for Alex natural conversation responses.
 * Full pipeline: context → AI generate → rewrite → guardrail → pronounce → validate → deliver.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Blocked pattern detection (server-side mirror) ─────────────────
function detectBlocked(text: string, patterns: any[]): string[] {
  const detected: string[] = [];
  for (const p of patterns) {
    if (!p.is_active) continue;
    if (p.pattern_type === "phrase" && text.toLowerCase().includes(p.pattern_text.toLowerCase())) {
      detected.push(p.pattern_text);
    } else if (p.pattern_type === "regex") {
      try { if (new RegExp(p.pattern_text, "i").test(text)) detected.push(p.pattern_text); } catch {}
    } else if (p.pattern_type === "style") {
      if (p.pattern_text === "enumeration_list_3plus") {
        const bullets = (text.match(/^[\s]*[-•●]\s/gm) || []).length;
        if (bullets >= 3) detected.push(p.pattern_text);
      }
      if (p.pattern_text === "academic_paragraph") {
        const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
        if (sentences.length >= 4 && text.length > 500) detected.push(p.pattern_text);
      }
    }
  }
  return detected;
}

function stripBlocked(text: string, patterns: any[]): string {
  let r = text;
  for (const p of patterns) {
    if (!p.is_active || p.replacement_strategy !== "strip") continue;
    if (p.pattern_type === "phrase") {
      r = r.replace(new RegExp(p.pattern_text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
    } else if (p.pattern_type === "regex") {
      try { r = r.replace(new RegExp(p.pattern_text, "gi"), ""); } catch {}
    }
  }
  return r.replace(/\s{2,}/g, " ").trim();
}

function applyPronunciation(text: string, lang: string): string {
  const rules = lang.startsWith("en")
    ? [[/\bUNPRO\b/gi, "eun pro"], [/\bunpro\b/g, "eun pro"]]
    : [[/\bUNPRO\b/gi, "1 pro"], [/\bunpro\b/g, "1 pro"]];
  let r = text;
  for (const [pat, rep] of rules) r = r.replace(pat as RegExp, rep as string);
  return r;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, context, role, session_id, language } = await req.json();
    if (!message) throw new Error("message required");

    const lang = language || "fr";
    const userRole = role || "homeowner";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Load settings, rules, patterns in parallel
    const [settingsRes, rulesRes, patternsRes] = await Promise.all([
      supabaseAdmin.from("alex_response_settings").select("*").limit(1).single(),
      supabaseAdmin.from("alex_conversation_rules").select("*").eq("is_active", true),
      supabaseAdmin.from("alex_blocked_patterns").select("*").eq("is_active", true),
    ]);

    const settings = settingsRes.data || {
      max_response_length: 280, warmth_level: 7, directness_level: 8,
      rewrite_enabled: true, notebook_style_block_enabled: true, pronunciation_override_enabled: true,
    };
    const rules = rulesRes.data || [];
    const patterns = patternsRes.data || [];

    // Build system prompt
    const roleCtx = userRole === "contractor"
      ? "Tu parles à un entrepreneur. Revenus, rendez-vous, croissance."
      : userRole === "condo_manager"
      ? "Tu parles à un gestionnaire. Précis, structuré, gestion d'immeuble."
      : "Tu parles à un propriétaire. Rassurant, simple, solution.";

    const rulesText = rules.map((r: any) => `- ${r.rule_label}`).join("\n");

    const systemPrompt = `Tu es Alex, assistant IA premium d'UNPRO (prononce "1 pro").
Naturel, direct, chaleureux (${settings.warmth_level}/10), orienté action (${settings.directness_level}/10).
${roleCtx}

RÈGLES:
${rulesText}
- Max ${settings.max_response_length} caractères
- Phrases courtes, ton oral, 1 idée par réponse
- Jamais de dump de données, d'extrait brut, de style NotebookLM
- Toujours reformuler naturellement
- Guider vers une action concrète`;

    // Call AI
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...(context || []),
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      throw new Error(`AI call failed: ${aiResponse.status} ${err}`);
    }

    const aiData = await aiResponse.json();
    const rawResponse = aiData.choices?.[0]?.message?.content || "Je suis là pour vous aider.";

    // Pipeline
    const startMs = Date.now();
    let rewritten = rawResponse;
    let rewriteApplied = false;
    const blockedDetected = detectBlocked(rawResponse, patterns);

    if (blockedDetected.length > 0 && settings.notebook_style_block_enabled) {
      rewritten = stripBlocked(rewritten, patterns);
      rewriteApplied = true;
    }

    if (settings.pronunciation_override_enabled) {
      rewritten = applyPronunciation(rewritten, lang);
    }

    // Truncate if needed
    if (rewritten.length > settings.max_response_length * 2) {
      const sentences = rewritten.split(/(?<=[.!?])\s+/);
      let truncated = "";
      for (const s of sentences) {
        if ((truncated + s).length > settings.max_response_length) break;
        truncated += (truncated ? " " : "") + s;
      }
      rewritten = truncated || rewritten.slice(0, settings.max_response_length);
      rewriteApplied = true;
    }

    const finalStatus = blockedDetected.some((d) =>
      patterns.find((p: any) => p.pattern_text === d && p.severity === "block")
    ) ? "rewritten" : rewriteApplied ? "rewritten" : "delivered";

    const responseTimeMs = Date.now() - startMs;

    // Log response (fire-and-forget)
    supabaseAdmin.from("alex_response_logs").insert({
      session_id: session_id || null,
      role_type: userRole,
      raw_response: rawResponse,
      rewritten_response: rewritten,
      blocked_patterns_detected: blockedDetected,
      rewrite_applied: rewriteApplied,
      final_status: finalStatus,
      response_time_ms: responseTimeMs,
    }).then(() => {});

    return new Response(
      JSON.stringify({
        response: rewritten,
        raw_response: rawResponse,
        blocked_patterns: blockedDetected,
        rewrite_applied: rewriteApplied,
        status: finalStatus,
        response_time_ms: responseTimeMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
