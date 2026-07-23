/**
 * Unit tests for the canonical official-site enrichment gate.
 * `bunx vitest run src/__tests__/officialSiteGate.test.ts`
 */
import { describe, it, expect } from "vitest";
import {
  classifyOfficialSiteState,
  isEnrichmentPending,
  allowsFinalMissing,
  hasUsableOfficialDomain,
} from "../../supabase/functions/_shared/officialSiteGate";

describe("hasUsableOfficialDomain", () => {
  it("accepts a real domain", () => {
    expect(hasUsableOfficialDomain("atriumcourtay.com")).toBe(true);
    expect(hasUsableOfficialDomain("https://www.atriumcourtay.com/contact")).toBe(true);
  });
  it("rejects directories/social", () => {
    for (const bad of [
      "https://facebook.com/foo",
      "https://linkedin.com/in/x",
      "https://soumissionrenovation.ca/x",
      "https://houzz.com/pro/x",
    ]) expect(hasUsableOfficialDomain(bad)).toBe(false);
  });
  it("rejects garbage", () => {
    expect(hasUsableOfficialDomain(null)).toBe(false);
    expect(hasUsableOfficialDomain("")).toBe(false);
    expect(hasUsableOfficialDomain("not a url")).toBe(false);
  });
});

describe("classifyOfficialSiteState", () => {
  it("initial source lacks contact + official domain + no crawl → required (NOT missing)", () => {
    const s = classifyOfficialSiteState({
      phone: null, email: null,
      website_url: "atriumcourtay.com",
      official_site_status: null,
    });
    expect(s).toBe("official_site_enrichment_required");
    expect(isEnrichmentPending(s)).toBe(true);
    expect(allowsFinalMissing(s)).toBe(false);
  });

  it("complete_with_contact → contact present, missing_* false", () => {
    const s = classifyOfficialSiteState({ official_site_status: "complete_with_contact" });
    expect(s).toBe("complete_with_contact");
    expect(allowsFinalMissing(s)).toBe(false);
    expect(isEnrichmentPending(s)).toBe(false);
  });

  it("complete_no_contact → final missing allowed", () => {
    const s = classifyOfficialSiteState({ official_site_status: "complete_no_contact" });
    expect(s).toBe("complete_no_contact");
    expect(allowsFinalMissing(s)).toBe(true);
    expect(isEnrichmentPending(s)).toBe(false);
  });

  it("transient/retryable → pending, final missing forbidden", () => {
    const s = classifyOfficialSiteState({
      phone: null, website_url: "atriumcourtay.com",
      official_site_status: "retryable",
    });
    expect(s).toBe("official_site_enrichment_retryable");
    expect(isEnrichmentPending(s)).toBe(true);
    expect(allowsFinalMissing(s)).toBe(false);
  });

  it("running/crawling → pending", () => {
    expect(classifyOfficialSiteState({ official_site_status: "crawling" }))
      .toBe("official_site_enrichment_running");
    expect(classifyOfficialSiteState({ official_site_status: "queued" }))
      .toBe("official_site_enrichment_queued");
  });

  it("no official domain → separate terminal reason", () => {
    const s = classifyOfficialSiteState({ phone: null, website_url: null });
    expect(s).toBe("no_official_domain");
    expect(allowsFinalMissing(s)).toBe(true);
    expect(isEnrichmentPending(s)).toBe(false);
  });

  it("directory URL is not an official domain", () => {
    const s = classifyOfficialSiteState({
      phone: null, website_url: "https://soumissionrenovation.ca/x",
    });
    expect(s).toBe("no_official_domain");
  });

  it("contact already known → complete_with_contact even without crawl", () => {
    const s = classifyOfficialSiteState({ phone: "+15145551234" });
    expect(s).toBe("complete_with_contact");
  });

  it("blocked → terminal separate reason", () => {
    const s = classifyOfficialSiteState({ official_site_status: "blocked" });
    expect(s).toBe("blocked");
    expect(isEnrichmentPending(s)).toBe(false);
  });

  it("repeated call is idempotent (pure)", () => {
    const input = { phone: null, website_url: "atriumcourtay.com" };
    expect(classifyOfficialSiteState(input))
      .toBe(classifyOfficialSiteState(input));
  });
});
