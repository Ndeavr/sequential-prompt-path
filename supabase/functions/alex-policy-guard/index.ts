/**
 * alex-policy-guard — Screens Alex responses for policy violations.
 * Blocks "3 quotes" logic, excessive English, wrong next steps.
 * Returns corrected text + logs violations.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  serviceClient,
  evaluateCompliance,
  logComplianceEvent,
  scanProhibitedClaims,
  COMPLIANCE_EVENTS,
  UNPRO_REGULATED_DISCLOSURE,
  type ComplianceVerdict,
} from "../_shared/professionCompliance.ts";


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

/* ── Regulated-profession guardrails ─────────────────────────────── */

interface RegulatedGuardResult {
  blocked: boolean;
  violations: Violation[];
  verdict: ComplianceVerdict | null;
  safeText: string;
  disclosure: string | null;
  nextStage: string;
}

/**
 * Detectors for reserved professional acts Alex must never perform.
 * These map to `alex_prohibited_scope` entries in the compliance rules; the
 * decision itself always comes from the server-side rule, never from here.
 */
const RESERVED_ACT_PATTERNS: { scope: string; pattern: RegExp }[] = [
  { scope: "insurance_product_recommendation", pattern: /(je\s+vous\s+recommande|prenez|choisissez)[^.]{0,60}(police|assurance|couverture)/gi },
  { scope: "coverage_amount_advice", pattern: /(couverture|montant\s+assur[ée])[^.]{0,40}(de\s+)?\d[\d\s.,]*\s*\$/gi },
  { scope: "insurer_recommendation", pattern: /(assureur|compagnie\s+d['’]assurance)[^.]{0,30}(le\s+meilleur|recommand)/gi },
  { scope: "mortgage_product_recommendation", pattern: /(je\s+vous\s+recommande|optez\s+pour)[^.]{0,60}(hypoth[èe]que|pr[êe]t|terme\s+fixe|terme\s+variable)/gi },
  { scope: "rate_advice", pattern: /(taux)[^.]{0,30}(le\s+meilleur|garanti|vous\s+devriez)/gi },
  { scope: "legal_advice", pattern: /(juridiquement|l[ée]galement)[^.]{0,40}(vous\s+devez|vous\s+pouvez|c['’]est\s+valide)/gi },
  { scope: "structural_opinion", pattern: /(la\s+structure|la\s+fondation)[^.]{0,40}(est\s+s[ée]curitaire|n['’]est\s+pas\s+dangereuse|tient\s+le\s+coup)/gi },
  { scope: "property_valuation", pattern: /(votre\s+(maison|propri[ée]t[ée]))[^.]{0,30}vaut\s+/gi },
];

async function evaluateRegulatedScope(
  text: string,
  professionCode: string,
  declaredScope: string | undefined,
  sessionId: string | undefined,
): Promise<RegulatedGuardResult> {
  const sb = serviceClient();
  const violations: Violation[] = [];
  let safeText = text;
  let blocked = false;

  // 1. Rule for the declared action scope (fail closed).
  const verdict = await evaluateCompliance(sb, {
    professionCode,
    action: "alex_action",
    alexScope: declaredScope ?? null,
  });

  if (declaredScope && !verdict.allowed) {
    blocked = true;
    violations.push({
      type: "regulated_scope_denied",
      detected_text: `${professionCode}:${declaredScope} → ${verdict.decision}`,
      severity: "critical",
    });
  }

  // 2. Reserved acts detected in the generated text itself.
  for (const { scope, pattern } of RESERVED_ACT_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    if (!re.test(safeText)) continue;
    const scopeVerdict = await evaluateCompliance(sb, {
      professionCode,
      action: "alex_action",
      alexScope: scope,
    });
    if (!scopeVerdict.allowed) {
      blocked = true;
      violations.push({
        type: "reserved_professional_act",
        detected_text: scope,
        severity: "critical",
      });
    }
  }

  // 3. Unverifiable claims / implied regulator endorsement.
  const claims = scanProhibitedClaims(safeText, (verdict.prohibited_claims as string[]) ?? []);
  if (!claims.clean) {
    blocked = true;
    safeText = claims.sanitized;
    violations.push({
      type: "prohibited_advertising_claim",
      detected_text: claims.matches.join(", "),
      severity: "high",
    });
  }

  if (blocked) {
    safeText =
      "Je vous mets en relation avec un professionnel autorisé qui pourra répondre à cette question. " +
      "Souhaitez-vous que je planifie un rendez-vous ?";
    await logComplianceEvent(sb, {
      action: COMPLIANCE_EVENTS.blockedAction,
      entityType: "alex_response",
      entityId: sessionId ?? "unknown",
      professionCode,
      verdict,
      metadata: {
        blocked_operation: "alex_regulated_response",
        violations: violations.map((v) => v.type),
      },
    });
  }

  return {
    blocked,
    violations,
    verdict,
    safeText,
    disclosure: verdict.requires_regulated_handoff ? UNPRO_REGULATED_DISCLOSURE : null,
    nextStage: verdict.requires_regulated_handoff ? "regulated_handoff" : "appointment",
  };
}

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, conversation_session_id, profession_code, alex_scope } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { violations, correctedText } = detectViolations(text);

    // ── Regulated-profession guardrails (server-side, fail closed) ──
    let regulated: RegulatedGuardResult | null = null;
    if (profession_code) {
      regulated = await evaluateRegulatedScope(text, profession_code, alex_scope, conversation_session_id);
      violations.push(...regulated.violations);
    }


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
        corrected_text: regulated?.blocked ? regulated.safeText : correctedText,
        violations,
        has_violations: violations.length > 0,
        regulated: regulated
          ? {
              blocked: regulated.blocked,
              decision: regulated.verdict?.decision ?? "PENDING_REVIEW",
              profession_code,
              requires_regulated_handoff: regulated.verdict?.requires_regulated_handoff ?? false,
              disclosure: regulated.disclosure,
              next_stage: regulated.nextStage,
            }
          : null,
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
