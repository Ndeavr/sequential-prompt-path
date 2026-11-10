import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { emptyDraft, nextFeedCursor, portfolioErrorMessage, quotaLabel, validateDraft } from "@/lib/portfolio/freePortfolio";
import { deckMode, readLikes, swipeDecision } from "@/lib/portfolio/swipeDeck";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { CLARA_PROJECT_INSPIRATION_EVENT } from "@/services/clara/claraProjectInspiration";
import {
  authorInterestReply, INSPIRATION_CONTACT_CHOICE, INSPIRATION_FIND_CHOICE, matchInspirationChoice, parseInspirationDetail,
} from "@/services/clara/claraProjectInspiration";

let feedImpl: (cursor?: unknown) => Promise<unknown> = () => Promise.resolve([]);
vi.mock("@/lib/portfolio/freePortfolio", async (orig) => ({
  ...(await orig<typeof import("@/lib/portfolio/freePortfolio")>()),
  fetchInspirationFeed: (cursor?: unknown) => feedImpl(cursor),
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

const proj = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`, title: `Projet ${n}`, service_name: "Toiture", city: "Laval",
  description: null, photo_paths: [`p${n}`], before_path: null, after_path: null, company_name: "Pro Inc",
  author_verified: false, published_at: `2026-11-${String(30 - n).padStart(2, "0")}`, photoUrls: [`https://x.test/${n}.jpg`], ...extra,
});
const events = () => vi.mocked(logFunnelEvent).mock.calls.map((c) => c[0].event_type);

describe("swipe deck rules", () => {
  it("swipe only from 5 real approved projects; under 5 stays limited, 0 is empty", () => {
    expect(deckMode(0)).toBe("empty");
    expect(deckMode(4)).toBe("limited");
    expect(deckMode(5)).toBe("swipe");
  });
  it("left = pass, right = like, small drag = nothing", () => {
    expect(swipeDecision(-120)).toBe("pass");
    expect(swipeDecision(120)).toBe("like");
    expect(swipeDecision(30)).toBeNull();
  });
  it("next distinct batch only after a full batch of 10, keyed on the last project", () => {
    expect(nextFeedCursor(Array.from({ length: 9 }, (_, i) => proj(i)))).toBeNull();
    const ten = Array.from({ length: 10 }, (_, i) => proj(i));
    expect(nextFeedCursor(ten)).toEqual({ publishedAt: ten[9].published_at, id: ten[9].id });
  });
  it("Clara hand-off keeps the explicit 'ask this business' intent", () => {
    expect(parseInspirationDetail({ projectId: ID, title: "T", intent: "contact_author" })?.intent).toBe("contact_author");
    expect(parseInspirationDetail({ projectId: ID, title: "T", intent: "evil" })?.intent).toBe("similar");
  });
});

describe("homepage swipe experience", () => {
  beforeEach(() => { vi.mocked(logFunnelEvent).mockClear(); sessionStorage.clear(); });
  const renderSection = async () => {
    const { default: Section } = await import("@/components/home-light/SectionProjectInspiration");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={qc}><MemoryRouter><Section /></MemoryRouter></QueryClientProvider>);
  };

  it("4 projects → limited cards, no swipe controls", async () => {
    feedImpl = () => Promise.resolve([1, 2, 3, 4].map((n) => proj(n)));
    await renderSection();
    expect(await screen.findByText("Projet 4")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Passer au projet suivant" })).toBeNull();
  });

  it("6 projects → one card at a time; pass, like (session only), end of batch offers restart, no fake next batch", async () => {
    feedImpl = () => Promise.resolve([1, 2, 3, 4, 5, 6].map((n) => proj(n)));
    await renderSection();
    expect(await screen.findByText("Projet 1")).toBeTruthy();
    expect(screen.queryByText("Projet 2")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Passer au projet suivant" }));
    expect(await screen.findByText("Projet 2")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("group", { name: /Projet 2\./ }), { key: "ArrowRight" });
    expect(await screen.findByText("Projet 3")).toBeTruthy();
    expect(readLikes()).toEqual([proj(2).id]);
    expect(events()).toEqual(expect.arrayContaining(["swipe_passed", "swipe_liked"]));
    expect(events()).not.toContain("owner_interest");
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Passer au projet suivant" }));
    expect(await screen.findByRole("button", { name: /Recommencer ce lot/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /réalisations suivantes/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Recommencer ce lot/ }));
    expect(await screen.findByText("Projet 1")).toBeTruthy();
  });

  it("full batch of 10 → loads the next DISTINCT batch with a cursor", async () => {
    const cursors: unknown[] = [];
    feedImpl = (c) => { cursors.push(c ?? null); return Promise.resolve(c ? [proj(11), proj(12)] : Array.from({ length: 10 }, (_, i) => proj(i + 1))); };
    await renderSection();
    expect(await screen.findByText("Projet 1")).toBeTruthy();
    for (let i = 0; i < 10; i++) fireEvent.click(screen.getByRole("button", { name: "Passer au projet suivant" }));
    fireEvent.click(await screen.findByRole("button", { name: "Voir les réalisations suivantes" }));
    expect(await screen.findByText("Projet 11")).toBeTruthy();
    expect(cursors[1]).toEqual({ publishedAt: proj(10).published_at, id: proj(10).id });
  });

  it("'Ask this business' opens Clara with the project context, logged as open_clara_from_project only", async () => {
    feedImpl = () => Promise.resolve([1, 2, 3, 4, 5].map((n) => proj(n)));
    const seen: unknown[] = [];
    const h = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(CLARA_PROJECT_INSPIRATION_EVENT, h);
    await renderSection();
    fireEvent.click(await screen.findByRole("button", { name: "Demander cette entreprise à Clara" }));
    window.removeEventListener(CLARA_PROJECT_INSPIRATION_EVENT, h);
    expect(seen[0]).toMatchObject({ projectId: proj(1).id, serviceName: "Toiture", intent: "contact_author", authorVerified: false });
    expect(events()).toContain("open_clara_from_project");
    expect(events()).not.toContain("owner_interest");
  });
});
