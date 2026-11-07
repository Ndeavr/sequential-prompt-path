import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import IsrCampaignLanding from "./IsrCampaignLanding";
import { ISR_CAMPAIGN_KEYS, ISR_DRAFT_KEY, ISR_SLUG, emptyAnswers } from "@/lib/isrCampaign";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/seo/components/SeoHead", () => ({ default: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/services/eventTrackingService", () => ({ trackEvent: vi.fn() }));

describe("ISR contact release", () => {
  it("links all six pages to the official site without opening incomplete intake", () => {
    for (const campaign of ISR_CAMPAIGN_KEYS) {
      for (const lang of ["fr", "en"] as const) {
        // A previously saved request must not make this contact-only release
        // claim a request was newly sent, nor reopen the retained intake.
        sessionStorage.setItem(ISR_DRAFT_KEY, JSON.stringify({
          v: 1, contractorSlug: ISR_SLUG, campaign, lang,
          attribution: {}, answers: emptyAnswers(), step: 4,
          savedAt: Date.now(), requestId: "synthetic-request",
        }));
        const html = renderToStaticMarkup(<MemoryRouter><IsrCampaignLanding campaign={campaign} lang={lang} /></MemoryRouter>);
        const page = new DOMParser().parseFromString(html, "text/html");
        const cta = page.querySelector('[data-testid="isr-contact-cta"]');
        const url = new URL(cta!.getAttribute("href")!);
        expect(url.origin).toBe("https://isroyal.ca");
        expect(url.searchParams.get("utm_campaign")).toBe(`isr_${campaign}`);
        expect(cta!.textContent).toContain(lang === "fr" ? "Contacter" : "Contact");
        expect(page.querySelector('[data-testid="isr-intake"]')).toBeNull();
        expect(page.querySelector('[data-testid="isr-request-saved"]')).toBeNull();
      }
    }
    sessionStorage.removeItem(ISR_DRAFT_KEY);
  });
});
