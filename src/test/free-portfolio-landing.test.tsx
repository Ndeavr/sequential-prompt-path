import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import {
  mandateDefaults, mandateHasAnswers, moveItem, remapIndexAfterMove, remapIndexAfterRemove, resolveStep, stepAfterPhotos, suggestService,
} from "@/lib/portfolio/portfolioFlow";
import { DRAFT_TTL_MS, isExpired, loadDraft, persistDraft } from "@/lib/portfolio/draftStore";
import { emptyDraft } from "@/lib/portfolio/freePortfolio";
import { showcaseMode } from "@/components/portfolio/PortfolioShowcase";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

let authState: { session: unknown; loading: boolean } = { session: null, loading: false };
let feedImpl: () => Promise<unknown[]> = () => Promise.resolve([]);
const invokeMock = vi.fn();

vi.mock("@/stores/authSessionStore", () => ({ useAuthSession: () => authState }));
vi.mock("@/components/ui/LanguageToggle", () => ({ useLanguage: () => ({ lang: "fr" }) }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));
vi.mock("@/components/auth/PhoneOtpForm", () => ({ default: () => <div data-testid="otp" /> }));
vi.mock("@/lib/matching/invokeMatchingProfile", () => ({ invokeMatchingProfile: (b: unknown) => invokeMock(b) }));
vi.mock("@/lib/portfolio/freePortfolio", async (orig) => ({
  ...(await orig<typeof import("@/lib/portfolio/freePortfolio")>()),
  fetchInspirationFeed: () => feedImpl(),
  fetchMyQuota: () => Promise.resolve({ authenticated: true, contractor_id: null, used: 0, approved: 0, limit: 10 }),
}));

let urlSeq = 0;
URL.createObjectURL = vi.fn(() => `blob:test/${++urlSeq}`);
URL.revokeObjectURL = vi.fn();
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const signedIn = { user: { id: "00000000-0000-4000-8000-000000000001", email: "pro@example.test", phone: "" } };

describe("step order: photos before login, no skipped condition", () => {
  it("photos first, then account, then project; signed-in pros skip the account step", () => {
    expect(resolveStep("projet", { photoCount: 0, signedIn: false, submitted: false })).toBe("photos");
    expect(resolveStep("projet", { photoCount: 2, signedIn: false, submitted: false })).toBe("compte");
    expect(resolveStep("compte", { photoCount: 1, signedIn: true, submitted: false })).toBe("projet");
    expect(stepAfterPhotos(true)).toBe("projet");
    expect(stepAfterPhotos(false)).toBe("compte");
  });
  it("mandates and thank-you need a real submission", () => {
    expect(resolveStep("mandats", { photoCount: 0, signedIn: true, submitted: false })).toBe("photos");
    expect(resolveStep("merci", { photoCount: 0, signedIn: true, submitted: true })).toBe("merci");
    expect(resolveStep("mandats", { photoCount: 0, signedIn: false, submitted: true })).toBe("photos");
  });
  it("reorder and removal keep before/after marks on the right photo", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(remapIndexAfterMove(0, 0, 2)).toBe(2);
    expect(remapIndexAfterMove(2, 0, 2)).toBe(1);
    expect(remapIndexAfterRemove(1, 1)).toBeNull();
    expect(remapIndexAfterRemove(3, 1)).toBe(2);
  });
});

describe("Clara service suggestion (text only, never photo analysis)", () => {
  it("suggests from the typed title and stays silent when unclear", () => {
    expect(suggestService("Réfection de toiture en bardeaux", "fr")).toBe("Toiture");
    expect(suggestService("New kitchen cabinets", "en")).toBe("Kitchen renovation");
    expect(suggestService("Beau projet", "fr")).toBeNull();
  });
});

describe("mandate preselection uses only declared data", () => {
  it("preselects the declared service and city, merges saved answers without duplicates", () => {
    const m = mandateDefaults({ serviceName: "Toiture", specialty: "toiture", city: "Laval", existing: { territories: ["Montréal"], availability: "2_weeks" } });
    expect(m.services_wanted).toEqual(["Toiture"]);
    expect(m.territories).toEqual(["Montréal", "Laval"]);
    expect(m.availability).toBe("2_weeks");
    expect(mandateHasAnswers(mandateDefaults({}))).toBe(false);
  });
});

describe("local draft survives sign-in, then expires", () => {
  beforeEach(() => localStorage.clear());
  it("round-trips the draft and photos, and expires after 24 h", async () => {
    const d = { ...emptyDraft(), title: "Toiture refaite" };
    await persistDraft(d, [new Blob(["x"], { type: "image/jpeg" })]);
    const back = await loadDraft();
    expect(back?.draft.title).toBe("Toiture refaite");
    expect(back?.photos.length).toBe(1);
    expect(isExpired(Date.now() - DRAFT_TTL_MS - 1)).toBe(true);
    expect(await loadDraft(Date.now() + DRAFT_TTL_MS + 1000)).toBeNull();
    expect(await loadDraft()).toBeNull();
  });
});

describe("visual strip uses real approved projects only", () => {
  it("0 → labelled examples, 1–3 → static, ≥4 → gentle loop", () => {
    expect(showcaseMode(0)).toBe("examples");
    expect(showcaseMode(3)).toBe("static");
    expect(showcaseMode(4)).toBe("marquee");
  });
});

function Where() { const l = useLocation(); return <span data-testid="where">{l.search}</span>; }
async function renderPage(path: string) {
  const { default: Page } = await import("@/pages/entrepreneur/PageFreePortfolio");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider><QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/entrepreneurs/realisations" element={<><Page /><Where /></>} /></Routes>
    </MemoryRouter></QueryClientProvider></HelmetProvider>,
  );
}

describe("landing page", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); authState = { session: null, loading: false }; feedImpl = () => Promise.resolve([]); vi.mocked(logFunnelEvent).mockClear(); invokeMock.mockReset(); });

  it("hero + main CTA on first screen; empty feed shows labelled examples, no fake photos", async () => {
    await renderPage("/entrepreneurs/realisations");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Vos réalisations parlent mieux que vos publicités.");
    expect(screen.getByRole("button", { name: /Ajouter mes photos gratuitement/ })).toBeTruthy();
    expect(await screen.findByText("Exemples de travaux à partager")).toBeTruthy();
    expect(document.querySelectorAll("figure img").length).toBe(0);
    expect(screen.queryByTestId("otp")).toBeNull();
  });

  it("deep link to the project step without photos returns to photos (never asks login first)", async () => {
    await renderPage("/entrepreneurs/realisations?etape=projet");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("?etape=photos"));
    expect(screen.queryByTestId("otp")).toBeNull();
  });

  it("signed-out with a saved photo draft → account step uses the real UNPRO sign-in", async () => {
    await persistDraft({ ...emptyDraft(), title: "x" }, [new Blob(["x"], { type: "image/jpeg" })]);
    await renderPage("/entrepreneurs/realisations?etape=compte");
    expect(await screen.findByTestId("otp")).toBeTruthy();
    expect(screen.getByRole("button", { name: /courriel ou Google/ })).toBeTruthy();
  });

  it("signed-in with a draft skips the account step and shows the compact project form", async () => {
    authState = { session: signedIn, loading: false };
    await persistDraft({ ...emptyDraft() }, [new Blob(["x"], { type: "image/jpeg" })]);
    await renderPage("/entrepreneurs/realisations?etape=compte");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("?etape=projet"));
    expect(screen.getByRole("button", { name: /Envoyer pour approbation/ })).toBeTruthy();
    expect((screen.getByLabelText("Courriel de l’entreprise") as HTMLInputElement).value).toBe("pro@example.test");
  });
});

describe("optional mandates step", () => {
  beforeEach(() => { invokeMock.mockReset(); vi.mocked(logFunnelEvent).mockClear(); });
  const renderM = async (onDone = vi.fn()) => {
    const { default: M } = await import("@/components/portfolio/PortfolioMandates");
    render(<MemoryRouter><M fr serviceName="Toiture" city="Laval" specialty={null} contractorId={null} onDone={onDone} /></MemoryRouter>);
    return onDone;
  };
  it("never claims a save the server refused", async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, profile: null } }).mockResolvedValueOnce({ data: { ok: false, error: "x" } });
    const onDone = await renderM();
    fireEvent.click(await screen.findByRole("button", { name: "Enregistrer mes préférences" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    expect(vi.mocked(logFunnelEvent).mock.calls.some(([e]) => e.event_type === "mandate_preferences_saved")).toBe(false);
  });
  it("saves through the canonical matching profile and allows « Plus tard »", async () => {
    invokeMock.mockResolvedValueOnce({ data: { ok: true, profile: null } }).mockResolvedValueOnce({ data: { ok: true } });
    const onDone = await renderM();
    expect(await screen.findByRole("button", { name: "Toiture — retirer" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer mes préférences" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(invokeMock.mock.calls[1][0]).toMatchObject({ action: "save", answers: { services_wanted: ["Toiture"], territories: ["Laval"] } });
    fireEvent.click(screen.getByRole("button", { name: "Plus tard" }));
    expect(onDone).toHaveBeenLastCalledWith(false);
  });
});

describe("secondary 350 $ offer", () => {
  it("is optional, exact, linked to the existing activation page, and never logs a payment", async () => {
    const { default: Card } = await import("@/components/portfolio/PortfolioUpgradeCard");
    const onFree = vi.fn();
    vi.mocked(logFunnelEvent).mockClear();
    render(<MemoryRouter><Card fr contractorId={null} onContinueFree={onFree} /></MemoryRouter>);
    expect(screen.getByText(/350 \$ \+ taxes/, { selector: "h2" })).toBeTruthy();
    expect(screen.getByText(/Aucun rendez-vous n’est inclus par défaut/)).toBeTruthy();
    const cta = screen.getByRole("link", { name: "Découvrir l’activation à 350 $" });
    expect(cta.getAttribute("href")).toBe("/entrepreneurs/activation-350");
    fireEvent.click(cta);
    fireEvent.click(screen.getByRole("button", { name: "Continuer gratuitement" }));
    expect(onFree).toHaveBeenCalled();
    const types = vi.mocked(logFunnelEvent).mock.calls.map(([e]) => e.event_type);
    expect(types).toEqual(expect.arrayContaining(["upgrade_viewed", "checkout_started"]));
    expect(types.some((t) => /paid|payment/.test(t))).toBe(false);
  });
});
