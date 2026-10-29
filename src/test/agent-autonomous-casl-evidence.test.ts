import { describe, expect, it } from "vitest";
import { machineCaptureCandidate, AUTO_CASL_BATCH } from "../../supabase/functions/enrich-official-website/agentEvidenceBatch";

const eligible = {
  id: "deafbeef-dead-4def-8ead-123456789abc",
  business_name: "Lavage de vitres Exemple",
  website_url: "https://example.test/contact",
  phone_e164: "+15145551234",
  trade: "lavage de vitres",
  do_not_contact: false,
  suppression_reason: null,
  outreach_status: "not_started",
  needs_review: false,
  blocked_reason: null,
  rejection_reason: null,
  dedupe_matched_id: null,
  phone_type: null,
  phone_sms_capable: null,
};

describe("autonomous CASL evidence capture — fail closed", () => {
  it("requires a proper first-party candidate", () => {
    expect(machineCaptureCandidate(eligible)).toBe(true);
  });

  it.each([
    { do_not_contact: true },
    { suppression_reason: "STOP" },
    { outreach_status: "contacted" },
    { needs_review: true },
    { blocked_reason: "risk" },
    { dedupe_matched_id: eligible.id },
    { phone_type: "landline" },
    { phone_sms_capable: false },
    { phone_e164: "+18005551234" },
    { website_url: "http://example.test" },
    { website_url: "https://example.test", trade: "toiture" },
    { business_name: "" },
    { id: "invalid" },
  ])("rejects blocked or ambiguous inputs: %j", patch => {
    expect(machineCaptureCandidate({ ...eligible, ...patch })).toBe(false);
  });

  it("limits automated source checking; never itself authorizes sends", () => {
    expect(AUTO_CASL_BATCH.maxPerRun).toBe(2);
    expect(AUTO_CASL_BATCH.maxPerDay).toBe(20);
  });
});
