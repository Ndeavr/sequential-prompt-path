import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { SectionMatchingPaths } from "@/components/home-light/HomeLightSections";

const state = vi.hoisted(() => ({ lang: "fr" as "fr" | "en" }));
vi.mock("@/components/ui/LanguageToggle", () => ({ useLanguage: () => ({ lang: state.lang }) }));
vi.mock("@/contexts/AlexVoiceContext", () => ({ useAlexVoice: () => ({ openAlex: vi.fn() }) }));
vi.mock("@/utils/trackCopilotEvent", () => ({ trackCopilotEvent: vi.fn() }));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));
beforeEach(() => vi.stubGlobal("IntersectionObserver", class {
  observe() {} unobserve() {} disconnect() {}
}));
afterEach(() => { cleanup(); state.lang = "fr"; vi.unstubAllGlobals(); });

describe("active homepage matching paths", () => {
  it("shows exactly two paths with real destinations and a working homeowner action", () => {
    const start = vi.fn();
    render(<MemoryRouter><SectionMatchingPaths onStartHomeowner={start} /></MemoryRouter>);
    expect(document.querySelectorAll("article")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("UNPRO.Le bon PRO.Le bon projet.Un prix juste.");
    expect(screen.getByRole("link", { name: /Je suis entrepreneur/ })).toHaveAttribute("href", "/entrepreneurs/audit-ia");
    expect(screen.getByRole("link", { name: /Découvrir l’impact/ })).toHaveAttribute("href", "/impact");
    fireEvent.click(screen.getByRole("button", { name: /Décrire mon projet/ }));
    expect(start).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toMatch(/Ce qu’on offre|première année offerte|1er janvier|Temps total potentiel/);
    expect(screen.queryByText(/Les plateformes d’IA restent libres/)).not.toBeInTheDocument();
    expect(screen.getByText("Expliquez votre projet à Clara. Elle vous aide à trouver un professionnel compatible avec vos besoins, vos priorités et votre budget.")).toBeInTheDocument();
    const call = screen.getAllByRole("link", { name: "Appeler UNPRO au 450-328-6776" });
    expect(call).toHaveLength(1);
    expect(call[0]).toHaveAttribute("href", "tel:+14503286776");
    expect(call[0]).toHaveTextContent("Appeler");
    // Compact pill: small type, soft halo, 44px touch target preserved.
    expect(call[0]).toHaveClass("text-[13px]", "shadow-glow-soft", "min-h-11");
  });
  it("translates the marketing section without changing destinations", () => {
    state.lang = "en";
    render(<MemoryRouter><SectionMatchingPaths onStartHomeowner={() => {}} /></MemoryRouter>);
    expect(screen.getByText("A fair price.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /I’m a contractor/ })).toHaveAttribute("href", "/entrepreneurs/audit-ia");
    expect(screen.getByRole("button", { name: /Describe my project/ })).toBeInTheDocument();
    expect(screen.getByText("Tell Clara about your project. She helps you find a professional suited to your needs, priorities and budget.")).toBeInTheDocument();
    expect(screen.queryByText(/AI platforms make their own/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call UNPRO at 450-328-6776" })).toHaveAttribute("href", "tel:+14503286776");
  });
  it("keeps dials exclusively in the existing impact page and preserves Clara", () => {
    const home = readFileSync("src/pages/PageHomeLight.tsx", "utf8");
    const impact = readFileSync("src/pages/PageImpactCounter.tsx", "utf8");
    expect(home).not.toContain("HomeImpactCounter");
    expect(home).toContain("<HeroHomeownerLight />");
    expect(home).toContain("field.focus({ preventScroll: true })");
    expect(impact).toContain("<HomeImpactCounter />");
    expect(impact).not.toContain("depuis le 1er janvier 2026");
  });
});