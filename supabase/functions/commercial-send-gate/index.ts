/**
 * UNPRO — commercial-send-gate
 *
 * Centralized pre-send validator for commercial_outreach messages only.
 * OTP, authentication, transactional and service_notification traffic MUST NOT
 * call this gate. They have their own paths and are not subject to CASL implicit-
 * consent evidence requirements.
 *
 * Contract (POST JSON):
 *   {
 *     "contractor_lead_id": "uuid",
 *     "destination_type":   "phone_sms" | "email",
 *     "destination":        "+15145551234" | "user@example.com",
 *     "message_purpose":    "commercial_outreach",
 *     "campaign_id":        "uuid | null",
 *     "sender_identity":    { "name": "UNPRO", "unsubscribe_footer": true }
 *   }
 *
 * Returns:
 *   { pass: true, evidence_id, decisions: [...] }
 *   OR
 *   { pass: false, blocked_reasons: [ ... ], decisions: [...] }
 *
 * The gate is STATELESS with respect to Twilio — it never calls Twilio itself.
 * A sender that receives {pass:true} is authorized to invoke the provider next,
 * and MUST record the returned decisions payload on the send row.
 *
 * The database status of a lead is NEVER sufficient authorization by itself.
 * At least one valid, unexpired casl_consent_evidence row for the exact
 * destination is required.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

interface GateInput {
  contractor_lead_id: string;
  destination_type: "phone_sms" | "email";
  destination: string;
  message_purpose: string;
  campaign_id?: string | null;
  sender_identity?: { name?: string; unsubscribe_footer?: boolean };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST only" }, 405);

  const decisions: Array<{ check: string; result: "pass" | "fail" | "warn"; detail?: string }> = [];
  const blocked: string[] = [];

  let input: GateInput;
  try {
    input = await req.json();
  } catch {
    return jsonResponse({ pass: false, blocked_reasons: ["invalid_json_body"] }, 400);
  }

  // --- Fail-closed guards ---
  if (!input.contractor_lead_id) {
    blocked.push("missing_contractor_lead_id");
  }
  if (!input.destination_type || !["phone_sms", "email"].includes(input.destination_type)) {
    blocked.push("invalid_destination_type");
  }
  if (!input.destination) {
    blocked.push("missing_destination");
  }
  if (input.message_purpose !== "commercial_outreach") {
    // Gate only authorizes commercial outreach. Non-commercial senders must not call this.
    blocked.push("gate_scoped_to_commercial_outreach_only");
  }
  if (!input?.sender_identity?.name) {
    blocked.push("missing_sender_identity_name");
  }
  if (input?.sender_identity?.unsubscribe_footer !== true) {
    blocked.push("missing_unsubscribe_footer_confirmation");
  }
  if (blocked.length > 0) {
    return jsonResponse({ pass: false, blocked_reasons: blocked, decisions }, 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Compliance-review marker on the lead ---
  const { data: lead } = await sb.from("contractor_leads")
    .select("id, compliance_review_required, compliance_review_reason, do_not_contact, pipeline_status")
    .eq("id", input.contractor_lead_id).maybeSingle();

  if (!lead) {
    return jsonResponse({ pass: false, blocked_reasons: ["lead_not_found"], decisions }, 404);
  }
  decisions.push({ check: "lead_exists", result: "pass" });

  if (lead.do_not_contact === true) {
    blocked.push("lead_do_not_contact");
    decisions.push({ check: "do_not_contact", result: "fail" });
  } else {
    decisions.push({ check: "do_not_contact", result: "pass" });
  }

  if (lead.compliance_review_required === true) {
    blocked.push(`compliance_review_required:${lead.compliance_review_reason ?? "unspecified"}`);
    decisions.push({ check: "compliance_review", result: "fail", detail: lead.compliance_review_reason ?? undefined });
  } else {
    decisions.push({ check: "compliance_review", result: "pass" });
  }

  if (lead.pipeline_status === "unsubscribed") {
    blocked.push("lead_unsubscribed");
    decisions.push({ check: "pipeline_status", result: "fail" });
  } else {
    decisions.push({ check: "pipeline_status", result: "pass" });
  }

  // --- Unified suppression check ---
  const normalizedDest = input.destination_type === "phone_sms"
    ? normalizePhone(input.destination)
    : input.destination.trim().toLowerCase();

  if (input.destination_type === "phone_sms") {
    const { data: sup } = await sb.rpc("is_phone_suppressed", { p_phone: input.destination });
    if (sup === true) {
      blocked.push("destination_in_suppression_index");
      decisions.push({ check: "suppression_index", result: "fail" });
    } else {
      decisions.push({ check: "suppression_index", result: "pass" });
    }
  } else {
    const { data: sup } = await sb.rpc("is_email_suppressed", { p_email: input.destination });
    if (sup === true) {
      blocked.push("destination_in_suppression_index");
      decisions.push({ check: "suppression_index", result: "fail" });
    } else {
      decisions.push({ check: "suppression_index", result: "pass" });
    }
  }

  // --- CASL evidence check (exact destination match) ---
  const { data: evidence } = await sb.from("casl_consent_evidence")
    .select("id, lawful_basis, refusal_statement_found, expires_at, business_relevance_explanation, source_url, retrieved_at")
    .eq("contractor_lead_id", input.contractor_lead_id)
    .eq("destination_type", input.destination_type)
    .eq("destination_normalized", normalizedDest)
    .eq("is_valid", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!evidence) {
    blocked.push("no_valid_casl_evidence_for_destination");
    decisions.push({
      check: "casl_evidence",
      result: "fail",
      detail: `no valid, unexpired evidence linked to ${input.destination_type}=${normalizedDest}`,
    });
  } else {
    if (evidence.refusal_statement_found === true) {
      blocked.push("refusal_statement_present_on_public_source");
      decisions.push({ check: "refusal_statement", result: "fail" });
    } else {
      decisions.push({ check: "refusal_statement", result: "pass" });
    }
    if (evidence.expires_at && new Date(evidence.expires_at) < new Date()) {
      blocked.push("casl_evidence_expired");
      decisions.push({ check: "evidence_freshness", result: "fail" });
    } else {
      decisions.push({ check: "evidence_freshness", result: "pass" });
    }
    if (!evidence.business_relevance_explanation) {
      blocked.push("missing_business_relevance_explanation");
      decisions.push({ check: "business_relevance", result: "fail" });
    } else {
      decisions.push({ check: "business_relevance", result: "pass" });
    }
    if (!evidence.source_url || !evidence.retrieved_at) {
      blocked.push("evidence_missing_source_or_timestamp");
      decisions.push({ check: "evidence_provenance", result: "fail" });
    } else {
      decisions.push({ check: "evidence_provenance", result: "pass" });
    }
  }

  // --- Rate-limit check (per lead): no more than 1 commercial SMS in 30 days ---
  if (input.destination_type === "phone_sms") {
    const { count } = await sb.from("acq_sms_logs")
      .select("id", { count: "exact", head: true })
      .eq("prospect_id", input.contractor_lead_id)
      .eq("message_purpose", "commercial_outreach")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString());
    if ((count ?? 0) > 0) {
      blocked.push("per_lead_rate_limit_30d");
      decisions.push({ check: "rate_limit_30d", result: "fail" });
    } else {
      decisions.push({ check: "rate_limit_30d", result: "pass" });
    }
  }

  const pass = blocked.length === 0;

  // Persist audit record — always, whether pass or fail.
  await sb.from("acquisition_events").insert({
    channel: input.destination_type === "phone_sms" ? "sms" : "email",
    event_type: pass ? "gate_pass" : "gate_block",
    provider: "unpro",
    metadata: {
      contractor_lead_id: input.contractor_lead_id,
      destination_type: input.destination_type,
      destination_normalized: normalizedDest,
      message_purpose: input.message_purpose,
      campaign_id: input.campaign_id ?? null,
      blocked_reasons: blocked,
      decisions,
      evidence_id: evidence?.id ?? null,
    },
    occurred_at: new Date().toISOString(),
  });

  return jsonResponse({
    pass,
    blocked_reasons: blocked,
    decisions,
    evidence_id: evidence?.id ?? null,
    lead_id: input.contractor_lead_id,
    destination_normalized: normalizedDest,
  }, pass ? 200 : 409);
});
