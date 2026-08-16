import { describe, it, expect } from "vitest";
import {
  candidateReason,
  evaluateCandidate,
  buildMatchUpdate,
  hasWebsite,
  type CandidateRecord,
} from "../../supabase/functions/_shared/dataForSeoCandidates";

const NOW = "2026-08-15T00:00:00.000Z";

function rec(over: Partial<CandidateRecord> = {}): CandidateRecord {
  return {
    id: "r1",
    source_kind: "rbq",
    business_name: "Toiture Alpha",
    business_name_norm: "toiture alpha",
    contact_status: "published_in_source",
    eligibility_status: "eligible",
    dedupe_status: "new",
    website_url: null,
    official_domain: null,
    ...over,
  };
}

describe("candidate eligibility", () => {
  it("targets a record missing its contact", () => {
    const r = rec({ contact_status: "needs_enrichment", website_url: "https://a.ca" });
    expect(candidateReason(r)).toBe("missing_contact");
    expect(evaluateCandidate(r, undefined, NOW)).toEqual({ eligible: true, reason: "missing_contact" });
  });

  it("targets an eligible record missing its website while contact is published", () => {
    const r = rec();
    expect(candidateReason(r)).toBe("missing_website");
    expect(evaluateCandidate(r, undefined, NOW)).toEqual({ eligible: true, reason: "missing_website" });
  });

  it("reports both reasons deterministically", () => {
    const r = rec({ contact_status: "needs_enrichment" });
    expect(candidateReason(r)).toBe("missing_contact_and_website");
  });

  it("ignores a record that already has a website and a contact", () => {
    expect(candidateReason(rec({ official_domain: "alpha.ca" }))).toBeNull();
  });

  it("excludes records already known (dedupe)", () => {
    const r = rec({ dedupe_status: "known", eligibility_status: "blocked" });
    expect(evaluateCandidate(r, undefined, NOW)).toEqual({ eligible: false, skip_reason: "already_known" });
  });

  it("excludes suppressed / opted-out records", () => {
    for (const s of ["suppressed", "opted_out", "blocked"]) {
      expect(evaluateCandidate(rec({ contact_status: s }), undefined, NOW).eligible).toBe(false);
    }
  });

  it("requires an official source kind (never discovery)", () => {
    const r = rec({ source_kind: "google_places" });
    expect(evaluateCandidate(r, undefined, NOW)).toEqual({ eligible: false, skip_reason: "not_official_source" });
    expect(evaluateCandidate(rec({ source_kind: "novoclimat" }), undefined, NOW).eligible).toBe(true);
    expect(evaluateCandidate(rec({ source_kind: "req" }), undefined, NOW).eligible).toBe(true);
  });

  it("excludes terminal attempts and unexpired cache windows", () => {
    expect(evaluateCandidate(rec(), { status: "failed_terminal" }, NOW).eligible).toBe(false);
    expect(
      evaluateCandidate(rec(), { status: "matched", next_eligible_at: "2026-09-01T00:00:00.000Z" }, NOW),
    ).toEqual({ eligible: false, skip_reason: "cache_window" });
    expect(
      evaluateCandidate(rec(), { status: "no_match", next_eligible_at: "2026-07-01T00:00:00.000Z" }, NOW).eligible,
    ).toBe(true);
  });
});

describe("match write safety", () => {
  const item = { url: "https://alpha.ca", phone: "+15145550000", title: "Toiture Alpha inc." };

  it("never overwrites published official contact data", () => {
    const u = buildMatchUpdate(rec({ contact_status: "published_in_source" }), item, 0.9, NOW);
    expect(u).not.toHaveProperty("contact_status");
    expect(u).not.toHaveProperty("phone_e164");
    expect(u).not.toHaveProperty("email");
  });

  it("keeps an aggregator website pending official-site validation", () => {
    const u = buildMatchUpdate(rec(), item, 0.9, NOW);
    expect(u.enrichment_status).toBe("pending_website_confirmation");
    expect(u.website_url).toBe("https://alpha.ca");
    expect((u.provenance as any).dataforseo.trust).toBe("aggregator_sourced");
    expect((u.provenance as any).dataforseo.confirmed_by_official_site).toBe(false);
  });

  it("never overwrites an existing website", () => {
    const u = buildMatchUpdate(rec({ website_url: "https://official.ca" }), item, 0.9, NOW);
    expect(u).not.toHaveProperty("website_url");
  });

  it("falls back to aggregator_only when no website was found", () => {
    const u = buildMatchUpdate(rec(), { ...item, url: null }, 0.9, NOW);
    expect(u.enrichment_status).toBe("aggregator_only");
  });

  it("detects existing websites from either column", () => {
    expect(hasWebsite(rec({ website_url: "https://a.ca" }))).toBe(true);
    expect(hasWebsite(rec({ official_domain: "a.ca" }))).toBe(true);
    expect(hasWebsite(rec({ website_url: "  " }))).toBe(false);
  });
});
