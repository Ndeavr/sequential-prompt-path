/**
 * compliance-guard — Server-side authority for the Professional Compliance
 * Engine. Every regulated decision (matching, appointment, advertising copy,
 * paid referral, Alex scope, regulated handoff) is evaluated here against
 * `public.profession_compliance_rules`. Fail closed: unknown => PENDING_REVIEW.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  serviceClient,
  evaluateCompliance,
  logComplianceEvent,
  scanProhibitedClaims,
  COMPLIANCE_EVENTS,
  UNPRO_SELECTION_STATEMENT,
  UNPRO_REGULATED_DISCLOSURE,
  type ComplianceAction,
} from "../_shared/professionCompliance.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Payload {
  op?: "evaluate" | "scan_claims" | "credential_status" | "regulated_handoff" | "matching";
  profession_code?: string;
  action?: ComplianceAction;
  compensation_type?: string;
  alex_scope?: string;
  text?: string;
  contractor_id?: string;
  session_id?: string;
  context?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as Payload;
    const op = body.op ?? "evaluate";
    const supabase = serviceClient();

    /* ── Credential state (never invented, never silently upgraded) ── */
    if (op === "credential_status") {
      if (!body.contractor_id) return json({ error: "contractor_id required" }, 400);
      const { data, error } = await supabase
        .from("contractor_credentials")
        .select(
          "id, contractor_id, profession_code, credential_type, credential_value, issuer, " +
            "issued_at, expires_at, verification_state, credential_status, verification_status, " +
            "source_url, source_last_verified_at, verified_at",
        )
        .eq("contractor_id", body.contractor_id);
      if (error) return json({ error: error.message }, 500);

      const today = new Date().toISOString().slice(0, 10);
      const credentials = (data ?? []).map((c) => {
        const expired = !!c.expires_at && c.expires_at < today;
        return {
          ...c,
          // Derived only — the stored value is never silently upgraded.
          effective_status: expired ? "EXPIRED" : c.credential_status,
          effective_verification_state: expired ? "PENDING" : c.verification_state,
        };
      });

      for (const c of credentials) {
        await logComplianceEvent(supabase, {
          action:
            c.effective_status === "EXPIRED"
              ? COMPLIANCE_EVENTS.credentialExpired
              : c.effective_verification_state === "VERIFIED"
                ? COMPLIANCE_EVENTS.credentialVerified
                : COMPLIANCE_EVENTS.credentialChecked,
          entityType: "contractor_credential",
          entityId: String(c.id),
          professionCode: c.profession_code,
          metadata: {
            contractor_id: body.contractor_id,
            credential_type: c.credential_type,
            evidence_source: c.source_url,
            source_last_verified_at: c.source_last_verified_at,
          },
        });
      }
      return json({ ok: true, credentials });
    }

    /* ── Advertising claim scan (matching ≠ endorsement) ── */
    if (op === "scan_claims") {
      const verdict = body.profession_code
        ? await evaluateCompliance(supabase, {
            professionCode: body.profession_code,
            action: "advertising",
          })
        : null;
      const extra = (verdict?.prohibited_claims as string[] | undefined) ?? [];
      const scan = scanProhibitedClaims(body.text ?? "", extra);
      if (!scan.clean) {
        await logComplianceEvent(supabase, {
          action: COMPLIANCE_EVENTS.blockedAction,
          entityType: "advertising_copy",
          entityId: body.session_id ?? "anonymous",
          professionCode: body.profession_code ?? null,
          verdict,
          metadata: { blocked_operation: "advertising_claim", matches: scan.matches },
        });
      }
      return json({
        ok: scan.clean,
        blocked: !scan.clean,
        matches: scan.matches,
        sanitized: scan.sanitized,
        selection_statement: UNPRO_SELECTION_STATEMENT,
      });
    }

    /* ── Regulated matching (evidence-based, logged) ── */
    if (op === "matching") {
      const verdict = await evaluateCompliance(supabase, {
        professionCode: body.profession_code,
        action: "matching",
      });
      await logComplianceEvent(supabase, {
        action: verdict.allowed
          ? COMPLIANCE_EVENTS.regulatedMatchingCreated
          : COMPLIANCE_EVENTS.blockedAction,
        entityType: "regulated_matching",
        entityId: body.session_id ?? body.contractor_id ?? "unknown",
        professionCode: body.profession_code ?? null,
        verdict,
        metadata: { context: body.context ?? {}, blocked_operation: verdict.allowed ? null : "matching" },
      });
      return json({
        ...verdict,
        selection_statement: UNPRO_SELECTION_STATEMENT,
        disclosure: verdict.requires_regulated_handoff ? UNPRO_REGULATED_DISCLOSURE : null,
      });
    }

    /* ── Regulated handoff event ── */
    if (op === "regulated_handoff") {
      const verdict = await evaluateCompliance(supabase, {
        professionCode: body.profession_code,
        action: "appointment",
      });
      await logComplianceEvent(supabase, {
        action: COMPLIANCE_EVENTS.regulatedHandoff,
        entityType: "alex_session",
        entityId: body.session_id ?? "unknown",
        professionCode: body.profession_code ?? null,
        verdict,
        metadata: { stage: "regulated_handoff", context: body.context ?? {} },
      });
      return json({ ...verdict, disclosure: UNPRO_REGULATED_DISCLOSURE });
    }

    /* ── Generic evaluation ── */
    const verdict = await evaluateCompliance(supabase, {
      professionCode: body.profession_code,
      action: (body.action ?? "matching") as ComplianceAction,
      compensationType: body.compensation_type ?? null,
      alexScope: body.alex_scope ?? null,
    });
    if (!verdict.allowed) {
      await logComplianceEvent(supabase, {
        action: COMPLIANCE_EVENTS.blockedAction,
        entityType: "compliance_evaluation",
        entityId: body.session_id ?? body.profession_code ?? "unknown",
        professionCode: body.profession_code ?? null,
        verdict,
        metadata: { blocked_operation: body.action ?? "matching" },
      });
    }
    return json(verdict);
  } catch (e) {
    console.error("compliance-guard error", e);
    // Fail closed even on unexpected errors.
    return json(
      {
        decision: "PENDING_REVIEW",
        allowed: false,
        fail_closed: true,
        reason: `guard_exception:${(e as Error).message}`,
      },
      200,
    );
  }
});
