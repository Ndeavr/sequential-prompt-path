// PROTECTED — UNPRO unified lead validation gate.
// Combines company + phone + dedupe into a single validation_status.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { classifyPhone, lookupPhone, type PhoneValidationStatus } from "./phoneValidation.ts";
import { classifyCompany } from "./companyValidation.ts";

export type ValidationStatus =
  | "pending_validation"
  | "valid"
  | "invalid_company"
  | "invalid_phone"
  | "duplicate"
  | "outside_quebec"
  | "needs_review";

export type BlockReason =
  | "invalid_format"
  | "missing_phone"
  | "outside_quebec"
  | "landline"
  | "duplicate_phone"
  | "invalid_company_name"
  | "low_confidence"
  | "lookup_failed"
  | "lookup_unavailable"
  | "do_not_contact"
  | "opt_out"
  | "needs_review";

export type ValidateLeadResult = {
  validation_status: ValidationStatus;
  company_confidence_score: number;
  phone_confidence_score: number;
  overall_contact_confidence_score: number;
  company_failure_reason: string | null;
  phone_failure_reason: string | null;
  phone_validation_status: PhoneValidationStatus;
  phone_e164: string | null;
  phone_area_code: string | null;
  phone_type: string | null;
  phone_carrier: string | null;
  block_reason: BlockReason | null;
  tentative_send: boolean;
};

function phoneStatusToScore(s: PhoneValidationStatus): number {
  switch (s) {
    case "valid_mobile": return 100;
    case "valid_voip": return 88;
    case "lookup_unavailable": return 75;
    case "pending_validation": return 60;
    case "lookup_failed": return 40;
    case "landline": return 20;
    case "outside_quebec": return 10;
    case "do_not_contact": return 0;
    case "invalid_phone": return 0;
    default: return 0;
  }
}


export async function validateLead(
  sb: ReturnType<typeof createClient>,
  lead: {
    id: string;
    company_name?: string | null;
    phone?: string | null;
    mobile_phone?: string | null;
    do_not_contact?: boolean | null;
  },
): Promise<ValidateLeadResult> {
  // 1. Company
  const company = classifyCompany(lead.company_name);

  // 2. Phone classify + lookup
  const raw = lead.mobile_phone || lead.phone || "";
  let phoneStatus: PhoneValidationStatus = "invalid_phone";
  let phoneReason: string | null = "missing_phone";
  let e164: string | null = null;
  let area: string | null = null;
  let phoneType: string | null = null;
  let carrier: string | null = null;

  if (!raw) {
    phoneStatus = "invalid_phone";
    phoneReason = "missing_phone";
  } else {
    const c = classifyPhone(raw);
    e164 = c.e164;
    area = c.area_code;
    phoneStatus = c.status;
    phoneReason = c.reason;
    if (c.status === "pending_validation" && c.e164) {
      const lk = await lookupPhone(c.e164);
      phoneStatus = lk.status;
      phoneReason = lk.reason;
      phoneType = lk.phone_type;
      carrier = lk.carrier;
    }
  }
  const phoneScore = phoneStatusToScore(phoneStatus);

  // 3. Duplicate (company_name + phone_e164)
  let duplicate = false;
  if (e164 && lead.company_name) {
    const { data: dup } = await sb
      .from("contractor_leads")
      .select("id")
      .eq("phone_e164", e164)
      .ilike("company_name", lead.company_name)
      .neq("id", lead.id)
      .limit(1);
    duplicate = !!(dup && dup.length > 0);
  }

  const overall = Math.round(0.5 * company.score + 0.5 * phoneScore);

  // 4. Status decision (priority order)
  let status: ValidationStatus = "needs_review";
  let blockReason: BlockReason | null = null;

  if (lead.do_not_contact) {
    status = "invalid_phone";
    blockReason = "do_not_contact";
  } else if (duplicate) {
    status = "duplicate";
    blockReason = "duplicate_phone";
  } else if (phoneStatus === "outside_quebec") {
    status = "outside_quebec";
    blockReason = "outside_quebec";
  } else if (phoneStatus === "landline") {
    status = "invalid_phone";
    blockReason = "landline";
  } else if (phoneStatus === "invalid_phone") {
    status = "invalid_phone";
    blockReason = (phoneReason as BlockReason) || "invalid_format";
  } else if (phoneStatus === "lookup_failed") {
    status = "needs_review";
    blockReason = "lookup_failed";
  } else if (!company.valid) {
    status = "invalid_company";
    blockReason = company.reason === "low_confidence" ? "low_confidence" : "invalid_company_name";
  } else if (overall >= 85 && company.score >= 85 && phoneScore >= 85) {
    status = "valid";
    blockReason = null;
  } else if (overall >= 70) {
    status = "needs_review";
    blockReason = "needs_review";
  } else {
    status = "invalid_company";
    blockReason = "low_confidence";
  }

  const result: ValidateLeadResult = {
    validation_status: status,
    company_confidence_score: company.score,
    phone_confidence_score: phoneScore,
    overall_contact_confidence_score: overall,
    company_failure_reason: company.reason,
    phone_failure_reason: phoneReason,
    phone_validation_status: phoneStatus,
    phone_e164: e164,
    phone_area_code: area,
    phone_type: phoneType,
    phone_carrier: carrier,
    block_reason: blockReason,
  };

  // 5. Persist
  await sb.from("contractor_leads").update({
    validation_status: result.validation_status,
    company_confidence_score: result.company_confidence_score,
    phone_confidence_score: result.phone_confidence_score,
    overall_contact_confidence_score: result.overall_contact_confidence_score,
    company_failure_reason: result.company_failure_reason,
    phone_failure_reason: result.phone_failure_reason,
    phone_validation_status: result.phone_validation_status,
    phone_e164: result.phone_e164,
    phone_area_code: result.phone_area_code,
    phone_type: result.phone_type,
    phone_carrier: result.phone_carrier,
    phone_lookup_at: new Date().toISOString(),
  }).eq("id", lead.id);

  return result;
}

/** Canonical pre-send gate. Returns null if allowed, else canonical block reason. */
export function gateLeadForOutreach(lead: {
  validation_status?: string | null;
  company_confidence_score?: number | null;
  phone_confidence_score?: number | null;
  do_not_contact?: boolean | null;
  phone_failure_reason?: string | null;
  company_failure_reason?: string | null;
}): BlockReason | null {
  if (lead.do_not_contact) return "do_not_contact";
  if (lead.validation_status !== "valid") {
    if (lead.validation_status === "outside_quebec") return "outside_quebec";
    if (lead.validation_status === "duplicate") return "duplicate_phone";
    if (lead.validation_status === "invalid_phone") {
      return (lead.phone_failure_reason as BlockReason) || "invalid_format";
    }
    if (lead.validation_status === "invalid_company") {
      return (lead.company_failure_reason === "low_confidence" ? "low_confidence" : "invalid_company_name");
    }
    if (lead.validation_status === "needs_review") return "needs_review";
    return "needs_review";
  }
  if ((lead.phone_confidence_score ?? 0) < 85) return "low_confidence";
  if ((lead.company_confidence_score ?? 0) < 85) return "low_confidence";
  return null;
}
