import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { emptyDraft, portfolioErrorMessage, quotaLabel, validateDraft } from "@/lib/portfolio/freePortfolio";
import {
  authorInterestReply, INSPIRATION_CONTACT_CHOICE, INSPIRATION_FIND_CHOICE, matchInspirationChoice, parseInspirationDetail,
} from "@/services/clara/claraProjectInspiration";

let feedImpl: () => Promise<unknown> = () => Promise.resolve([]);
vi.mock("@/lib/portfolio/freePortfolio", async (orig) => ({
  ...(await orig<typeof import("@/lib/portfolio/freePortfolio")>()),
  fetchInspirationFeed: () => feedImpl(),
}));
vi.mock("@/components/ui/LanguageToggle", () => ({ useLanguage: () => ({ lang: "fr" }) }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));

const ID = "11111111-1111-4111-8111-111111111111";

describe("draft validation (client mirror)", () => {
  it("requires 1–4 photos, title, type, general city, rights and business contact for new accounts", () => {
    const d = emptyDraft();
    expect(validateDraft(d, 0, true)).toEqual(expect.arrayContaining(["photos", "title", "serviceName", "city", "photoRights", "business", "contact"]));
    const ok = { ...d, title: "Toiture refaite", serviceName: "Toiture", city: "Laval", photoRights: true, businessName: "Pro Inc", contactPhone: "514 555 0100" };
    expect(validateDraft(ok, 2, true)).toEqual([]);
    expect(validateDraft({ ...ok, city: "123 rue Principale" }, 2, true)).toContain("city");
    expect(validateDraft(ok, 5, true)).toContain("photos");
    expect(validateDraft({ ...ok, businessName: "", contactPhone: "" }, 1, false)).toEqual([]);
  });
  it("maps server refusals to clear messages and shows the X/10 counter", () => {
    expect(portfolioErrorMessage(new Error("free_limit_reached"), "fr")).toContain("10 projets gratuits");
    expect(portfolioErrorMessage({ message: "network down" }, "fr")).toContain("conservées");
    expect(quotaLabel(3, "fr")).toBe("3/10 projets gratuits");
    expect(quotaLabel(12, "en")).toBe("10/10 free projects");
  });
});

describe("Clara project hand-off", () => {
  it("accepts only a valid project id and title", () => {
    expect(parseInspirationDetail({ projectId: "nope", title: "x" })).toBeNull();
    expect(parseInspirationDetail({ projectId: ID, title: "Toiture", authorVerified: "yes" })).toMatchObject({ projectId: ID, authorVerified: false });
  });
  it("recognizes the two choices", () => {
    expect(matchInspirationChoice(INSPIRATION_CONTACT_CHOICE)).toBe("contact_author");
    expect(matchInspirationChoice("je veux contacter l'auteur")).toBe("contact_author");
    expect(matchInspirationChoice(INSPIRATION_FIND_CHOICE)).toBe("find_compatible");
    expect(matchInspirationChoice("ma toiture coule")).toBeNull();
  });
  it("never claims a contact happened and never presents an unverified author as verified", () => {
    const p = parseInspirationDetail({ projectId: ID, title: "Toiture", companyName: "Pro Inc", authorVerified: false })!;
    const r = authorInterestReply(p);
    expect(r).toContain("aucun contact n’a eu lieu");
    expect(r).toContain("pas encore vérifiée");
    const v = authorInterestReply({ ...p, authorVerified: true });
    expect(v).toContain("Aucun contact n’a encore eu lieu");
    expect(v).not.toContain("pas encore vérifiée");
  });
});

describe("homepage inspiration section", () => {
  beforeEach(() => { feedImpl = () => Promise.resolve([]); });
  const renderSection = async () => {
    const { default: Section } = await import("@/components/home-light/SectionProjectInspiration");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><Section /></MemoryRouter></QueryClientProvider>);
  };
  it("0 approved project → elegant empty state with the contractor CTA, no fake cards", async () => {
    feedImpl = () => Promise.resolve([]);
    await renderSection();
    expect(await screen.findByText("Les premières réalisations arrivent bientôt.")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Publiez vos réalisations gratuitement/ })[0].getAttribute("href")).toBe("/entrepreneurs/realisations");
    expect(screen.queryByRole("button", { name: "Je veux un projet semblable" })).toBeNull();
  });
  it("approved projects render as cards; declared ≠ verified badge", async () => {
    feedImpl = () => Promise.resolve([
      { id: ID, title: "Toiture refaite", service_name: "Toiture", city: "Laval", description: null, photo_paths: ["a"], before_path: null, after_path: null, company_name: "Pro Inc", author_verified: false, published_at: "2026-11-10", photoUrls: ["https://x.test/a.jpg"] },
    ]);
    await renderSection();
    expect(await screen.findByText("Toiture refaite")).toBeTruthy();
    expect(screen.getByText("Réalisation déclarée par l’entreprise.")).toBeTruthy();
    expect(screen.queryByText("Entreprise vérifiée par UNPRO")).toBeNull();
    expect(screen.getByRole("button", { name: "Je veux un projet semblable" })).toBeTruthy();
  });
  it("load failure shows a retry", { timeout: 8000 }, async () => {
    feedImpl = () => Promise.reject(new Error("feed_unavailable"));
    await renderSection();
    expect(await screen.findByRole("button", { name: /Réessayer/ }, { timeout: 4000 })).toBeTruthy();
  });
});
