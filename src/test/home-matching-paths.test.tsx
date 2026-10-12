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
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("UNPRO.Moins de leads.De meilleurs matchs.De vrais rendez-vous.");
    expect(screen.getByRole("link", { name: /Faire connaître mon entreprise/ })).toHaveAttribute("href", "/entrepreneur/devis-personnalise");
    expect(screen.getByRole("link", { name: /Découvrir l’impact/ })).toHaveAttribute("href", "/impact");
    fireEvent.click(screen.getByRole("button", { name: /Trouver mon entrepreneur/ }));
    expect(start).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toMatch(/Ce qu’on offre|première année offerte|1er janvier|Temps total potentiel/);
    expect(screen.queryByText(/Les plateformes d’IA restent libres/)).not.toBeInTheDocument();
    expect(screen.getByText("Décrivez votre problème ou votre projet à Clara. Téléchargez une photo ou parlez-lui du design souhaité.")).toBeInTheDocument();
    const call = screen.getAllByRole("link", { name: "Appeler UNPRO au 450-328-6776" });
    expect(call).toHaveLength(1);
    expect(call[0]).toHaveAttribute("href", "tel:+14503286776");
    expect(call[0]).toHaveTextContent("Appeler");
  });
  it("translates the marketing section without changing destinations", () => {
    state.lang = "en";
    render(<MemoryRouter><SectionMatchingPaths onStartHomeowner={() => {}} /></MemoryRouter>);
    expect(screen.getByText("Better matches.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get my business discovered/ })).toHaveAttribute("href", "/entrepreneur/devis-personnalise");
    expect(screen.getByRole("button", { name: /Find my contractor/ })).toBeInTheDocument();
    expect(screen.getByText("Describe your problem or project to Clara. Upload a photo or tell her about the design you have in mind.")).toBeInTheDocument();
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