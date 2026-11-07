import { describe, expect, it } from "vitest";
import {
  ISR_DECLARED_SERVICES, ISR_SLUG, buildIsrRequest, cityInTerritory, emptyAnswers, isrCampaignLink, isrEventMetadata,
  isrRequestsOpen, nextQuestion, parseIsrDraft, resolveIsrCampaign, type IsrDraft,
} from "@/lib/isrCampaign";

const attribution = { utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "isr_entretoit", utm_term: null, utm_content: null, gclid: null };
const draft = (patch: Partial<IsrDraft> = {}): IsrDraft => ({
  v: 1, contractorSlug: ISR_SLUG, campaign: "entretoit", lang: "fr", attribution,
  answers: { address: "123 rue Test", city: "Laval", addressId: null, concern: "heat_bills", timing: "asap", availability: "morning" },
  step: 4, savedAt: 1_000_000, requestId: null, ...patch,
});

describe("ISR campaign routes", () => {
  it("maps three FR and three EN entries to ISR only", () => {
    expect(resolveIsrCampaign(ISR_SLUG, "isolation-entretoit")).toEqual({ key: "entretoit", lang: "fr" });
    expect(resolveIsrCampaign(ISR_SLUG, "cold-home")).toEqual({ key: "maison-froide", lang: "en" });
    expect(resolveIsrCampaign(ISR_SLUG, "ventilation-barrages-glace")).toEqual({ key: "ventilation", lang: "fr" });
    expect(resolveIsrCampaign("exterra-construction", "isolation-entretoit")).toBeNull();
    expect(resolveIsrCampaign(ISR_SLUG, "drain-francais")).toBeNull();
  });
  it("builds ad links with UTM labels on the campaign route", () => {
    expect(isrCampaignLink("https://unpro.ca/", "ventilation", "en", "google", "cpc"))
      .toBe("https://unpro.ca/c/isolation-solution-royal/attic-ventilation-ice-dams?utm_source=google&utm_medium=cpc&utm_campaign=isr_ventilation");
  });
  it("never offers excluded services", () => {
    const all = [...ISR_DECLARED_SERVICES.fr, ...ISR_DECLARED_SERVICES.en].join(" ").toLowerCase();
    for (const banned of ["cellulose", "uréthane", "polyuréthane", "spray foam", "sous-sol", "basement", "toit plat", "flat roof", "mur", "wall"]) expect(all).not.toContain(banned);
  });
});

describe("intake", () => {
  it("asks one question at a time, at most four", () => {
    const a = emptyAnswers();
    expect(nextQuestion(a, "entretoit")).toBe(0);
    expect(nextQuestion({ ...a, address: "1 rue A", city: "Laval" }, "entretoit")).toBe(1);
    expect(nextQuestion({ ...a, addressId: "addr-1", concern: "heat_bills" }, "entretoit")).toBe(2);
    expect(nextQuestion({ ...a, addressId: "addr-1", concern: "ice_dams" }, "entretoit")).toBe(1);
    expect(nextQuestion(draft().answers, "entretoit")).toBe(4);
  });
  it("restores a draft after sign-in and drops expired or foreign drafts", () => {
    const raw = JSON.stringify(draft());
    expect(parseIsrDraft(raw, 1_000_500)?.attribution.utm_campaign).toBe("isr_entretoit");
    expect(parseIsrDraft(raw, 1_000_000 + 25 * 3600_000)).toBeNull();
    expect(parseIsrDraft(JSON.stringify({ ...draft(), contractorSlug: "autre" }), 1_000_500)).toBeNull();
    expect(parseIsrDraft("{bad", 1_000_500)).toBeNull();
  });
  it("checks the published territory, unknown when none", () => {
    expect(cityInTerritory("saint-jerome", ["Saint-Jérôme"])).toBe(true);
    expect(cityInTerritory("Québec", ["Laval"])).toBe(false);
    expect(cityInTerritory("Laval", [])).toBeNull();
  });
});

describe("request", () => {
  it("is bound to the resolved company and only ever 'requested'", () => {
    const row = buildIsrRequest({ userId: "u1", contractorId: "c1", addressId: "a1", draft: draft() });
    expect(row.contractor_id).toBe("c1");
    expect(row.status).toBe("requested");
    expect(row).not.toHaveProperty("scheduled_at");
    expect(row).not.toHaveProperty("slot_id");
    expect(row.source_page).toBe("/c/isolation-solution-royal/isolation-entretoit");
  });
  it("opens only when the server profile allows bookings for ISR", () => {
    const ok = { contractorId: "c1", slug: ISR_SLUG, publicStatus: "published_pending_verification", bookingEnabled: true, accepting: true };
    expect(isrRequestsOpen(ok)).toBe(true);
    expect(isrRequestsOpen({ ...ok, bookingEnabled: false })).toBe(false);
    expect(isrRequestsOpen({ ...ok, publicStatus: "unpublished" })).toBe(false);
    expect(isrRequestsOpen({ ...ok, slug: "autre" })).toBe(false);
    expect(isrRequestsOpen(null)).toBe(false);
  });
  it("keeps personal data out of events", () => {
    const meta = JSON.stringify(isrEventMetadata(draft()));
    expect(meta).not.toContain("123 rue Test");
    expect(meta).not.toContain("Laval");
  });
});
