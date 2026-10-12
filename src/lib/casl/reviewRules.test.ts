import { describe, it, expect } from "vitest";
import { approvalBlocker, bucketOf, lineStates, validateDecision, paginate } from "./reviewRules";

const base = { source_type: "company_website", source_url: "https://ex.ca/contact", lawful_basis: "implicit_public_conspicuous", refusal_statement_found: false, reviewer_id: null, is_valid: true };

describe("CASL review rules", () => {
  it("never approves Google Places alone", () => {
    expect(approvalBlocker({ ...base, source_type: "google_business_profile" }, { optedOut: false })).toMatch(/Source tierce/);
    expect(bucketOf({ ...base, source_type: "google_business_profile" }, { optedOut: false })).toBe("source_tierce");
  });
  it("government registry is third party", () => {
    expect(approvalBlocker({ ...base, source_type: "government_registry" }, { optedOut: false })).not.toBeNull();
  });
  it("first-party source is approvable only after human decision", () => {
    expect(approvalBlocker(base, { optedOut: false })).toBeNull();
    expect(bucketOf(base, { optedOut: false })).toBe("preuve_potentielle");
  });
  it("STOP and refusal exclude", () => {
    expect(approvalBlocker(base, { optedOut: true })).toMatch(/STOP/);
    expect(bucketOf({ ...base, refusal_statement_found: true }, { optedOut: false })).toBe("exclu");
  });
  it("http source rejected", () => {
    expect(approvalBlocker({ ...base, source_url: "http://ex.ca" }, { optedOut: false })).toMatch(/HTTPS/);
  });
  it("signed only once", () => {
    expect(approvalBlocker({ ...base, reviewer_id: "u" }, { optedOut: false })).toBe("Déjà décidé");
  });
  it("delivery history and prefix never mean verified mobile", () => {
    const s = lineStates({ prefixMobileProbable: true, deliveredBefore: true, verifiedRecently: false });
    expect(s.map((x) => x.key)).toEqual(["unverified", "inferred", "history"]);
  });
  it("decision requires opened source, date and reason", () => {
    expect(validateDecision("x".repeat(40), false, "2026-10-12")).toMatch(/ouvert/);
    expect(validateDecision("court", true, "2026-10-12")).toMatch(/30/);
    expect(validateDecision("x".repeat(40), true, "")).toMatch(/Date/);
    expect(validateDecision("x".repeat(40), true, "2026-10-12")).toBeNull();
  });
  it("paginates by 25", () => {
    const r = paginate(Array.from({ length: 828 }, (_, i) => i), 33);
    expect(r.pages).toBe(34); expect(r.page).toBe(33); expect(r.items.length).toBe(3);
    expect(paginate([1, 2], 0).items.length).toBe(2);
  });
});
