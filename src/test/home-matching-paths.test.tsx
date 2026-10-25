import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectionHomeScore, SectionTwoPaths } from "@/components/home-light/HomeLightSections";

const language = vi.hoisted(() => ({ lang: "fr" as "fr" | "en" }));
vi.mock("@/components/ui/LanguageToggle", () => ({ useLanguage: () => ({ lang: language.lang }) }));
vi.mock("@/contexts/AlexVoiceContext", () => ({ useAlexVoice: () => ({ openAlex: vi.fn() }) }));
afterEach(() => { cleanup(); language.lang = "fr"; });

describe("premium homeowner and contractor conversion", () => {
  it("preserves exactly two distinct journeys and the existing contractor route", () => {
    const start = vi.fn();
    render(<MemoryRouter><SectionTwoPaths onStartHomeowner={start} /></MemoryRouter>);
    expect(document.querySelectorAll("article")).toHaveLength(2);
    expect(screen.getByText("Je suis propriétaire")).toBeInTheDocument();
    expect(screen.getByText("Je suis entrepreneur")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Activer mon profil — 350/ })).toHaveAttribute("href", "/entrepreneur");
    fireEvent.click(screen.getByRole("link", { name: /Commencer mon projet/ }));
    expect(start).toHaveBeenCalledOnce();
    expect(screen.getByText(/Activation de base \+ taxes applicables/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/première année offerte|3 000\+|500\+|4\.8\/5/);
  });

  it("translates the two real journeys", () => {
    language.lang = "en";
    render(<MemoryRouter><SectionTwoPaths onStartHomeowner={() => {}} /></MemoryRouter>);
    expect(screen.getByText("I'm a homeowner")).toBeInTheDocument();
    expect(screen.getByText("I'm a contractor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Activate my profile/ })).toHaveAttribute("href", "/entrepreneur");
  });

  it("uses a public score calculator and labels example visuals", () => {
    render(<MemoryRouter><SectionHomeScore /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Découvrir mon score IA/ })).toHaveAttribute("href", "/score-maison");
    expect(screen.getByText("Exemple illustratif")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/78\/100|4\.8\/5/);
  });
});
