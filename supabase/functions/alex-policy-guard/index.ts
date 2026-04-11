/**
 * alex-policy-guard — Screens Alex responses for policy violations.
 * Blocks "3 quotes" logic, excessive English, wrong next steps.
 * Returns corrected text + logs violations.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Violation patterns ──

const THREE_QUOTES_PATTERNS = [
  /3\s*soumissions?/gi,
  /trois\s*soumissions?/gi,
  /3\s*quotes?/gi,
  /three\s*quotes?/gi,
  /comparer?\s*(trois|3)\s*(entrepreneurs?|soumissions?)/gi,
  /obtenir?\s*(trois|3)\s*(soumissions?|estimations?)/gi,
  /demander?\s*plusieurs\s*(quotes?|soumissions?)/gi,
  /magasin(er|age)\s*(de\s*)?(soumissions?|quotes?)/gi,
];

const ENGLISH_WORD_PATTERN = /\b[a-zA-Z]{4,}\b/g;
const FRENCH_COMMON = new Set([
  "pour", "avec", "dans", "plus", "vous", "nous", "mais", "bien",
  "tout", "fait", "dire", "voir", "rien", "peut", "faut", "sont",
  "être", "avoir", "cette", "votre", "comme", "quoi", "quel",
  "type", "site", "plan", "zone", "note", "base", "mode",
]);

interface Violation {
  type: string;
  detected_text: string;
  corrected_text?: string;
  severity: string;
}

function detectViolations(text: string): { violations: Violation[]; correctedText: string } {
  const violations: Violation[] = [];
  let corrected = text;

  // 1. Three-quotes policy
  for (const pattern of THREE_QUOTES_PATTERNS) {
    const match = pattern.exec(corrected);
    if (match) {
      violations.push({
        type: "three_quotes",
        detected_text: match[0],
        corrected_text: "le meilleur professionnel pour vous",
        severity: "critical",
      });
      corrected = corrected.replace(
        pattern,
        "le meilleur professionnel pour vous"
      );
    }
  }

  // 2. English overuse detection
  const words = corrected.match(ENGLISH_WORD_PATTERN) || [];
  const nonFrenchWords = words.filter(
    (w) => !FRENCH_COMMON.has(w.toLowerCase())
  );
  const totalWords = corrected.split(/\s+/).length;
  const englishRatio = nonFrenchWords.length / Math.max(totalWords, 1);

  if (englishRatio > 0.3 && totalWords > 8) {
    violations.push({
      type: "english_overuse",
      detected_text: `${(englishRatio * 100).toFixed(0)}% mots anglais détectés`,
      severity: "high",
    });
  }

  // 3. Callback without contact
  if (/on\s*vous\s*rappelle/i.test(corrected) && !/téléphone|courriel|email/i.test(corrected)) {
    violations.push({
      type: "callback_without_contact",
      detected_text: "Promesse de rappel sans coordonnées",
      severity: "medium",
    });
  }

  return { violations, correctedText: corrected };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, conversation_session_id } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { violations, correctedText } = detectViolations(text);

    // Log violations to database
    if (violations.length > 0 && conversation_session_id) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        for (const v of violations) {
          await sb.from("alex_policy_violations").insert({
            conversation_session_id,
            violation_type: v.type,
            detected_text: v.detected_text,
            corrected_text: v.corrected_text || null,
            severity: v.severity,
          });
        }
      } catch (dbErr) {
        console.error("Failed to log violations:", dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        original_text: text,
        corrected_text: correctedText,
        violations,
        has_violations: violations.length > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("alex-policy-guard error:", err);
    return new Response(
      JSON.stringify({ error: "Policy guard failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
