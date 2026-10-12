import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { SectionMatchingPaths } from "@/components/home-light/HomeLightSections";

const state = vi.hoisted(() => ({ lang: "fr" as "fr" | "en" }));
vi.mock("@/components/ui/LanguageToggle", () => ({ useLanguage: () => ({ lang: state.lang }) }));
vi.mock("@/contexts/AlexVoiceContext", () => ({ useAlexVoice: () => ({ openAlex: vi.fn() }) }));
vi.mock("@/utils/trackCopilotEvent", () => ({ trackCopilotEvent: vi.fn() }));
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
    expect(screen.getByText(/Les plateformes d’IA restent libres/)).toBeInTheDocument();
  });
  it("translates the marketing section without changing destinations", () => {
    state.lang = "en";
    render(<MemoryRouter><SectionMatchingPaths onStartHomeowner={() => {}} /></MemoryRouter>);
    expect(screen.getByText("Better matches.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Get my business discovered/ })).toHaveAttribute("href", "/entrepreneur/devis-personnalise");
    expect(screen.getByRole("button", { name: /Find my contractor/ })).toBeInTheDocument();
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