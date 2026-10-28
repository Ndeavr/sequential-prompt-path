// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { readFileSync } from "node:fs";

vi.mock("@/components/brand/UnproLogo", () => ({
  default: () => <span aria-label="UNPRO logo">UNPRO</span>,
}));
vi.mock("framer-motion", async importOriginal => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => true };
});

import PageIntelligentBooker from "@/pages/PageIntelligentBooker";

function view() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PageIntelligentBooker />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("The Intelligent Booker — animated product explainer", () => {
  it("is a real lazy-loaded public page with canonical route and FR alias", () => {
    const router = readFileSync("src/app/router.tsx", "utf8");
    expect(router).toContain('import("@/pages/PageIntelligentBooker")');
    expect(router).toContain('path="/intelligent-booker"');
    expect(router).toContain('path="/le-booker-intelligent"');
  });

  it("renders an accessible responsive French demo with no fake booking", () => {
    view();
    expect(screen.getByRole("heading", { level:1, name:/the intelligent booker/i })).toBeTruthy();
    expect(screen.getByText(/Démonstration du processus seulement/)).toBeTruthy();
    expect(screen.getByText(/aucun entrepreneur, créneau, vérification de licence ou rendez-vous réel/)).toBeTruthy();
    expect(screen.getByRole("link", { name:/Discuter de mon projet/ }).getAttribute("href")).toBe("/conversation");
    expect(screen.getByRole("link", { name:/Je suis professionnel/ }).getAttribute("href")).toBe("/entrepreneurs/audit-ia");
  });

  it("lets visitors navigate all four storyboard stages without provider calls", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name:"Étape suivante" }));
    expect(screen.getByText(/Chaque détail devient utile/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name:"3 · Jumeler" })[0]);
    expect(screen.getByText(/La compatibilité avant la proximité/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name:"4 · Réserver" })[0]);
    expect(screen.getByText(/Un rendez-vous. Pas un lead partagé/)).toBeTruthy();
  });

  it("supports English and reduced-motion settings", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name:"View in English" }));
    expect(screen.getByText(/Clara understands the project/)).toBeTruthy();
    expect(screen.getByRole("link", { name:/Discuss my project/ }).getAttribute("href")).toBe("/conversation");
    expect(screen.getByRole("button", { name:"Play demo" }).hasAttribute("disabled")).toBe(true);
  });

  it("does not invoke providers, emit fake testimonials, promise slots or charge", () => {
    const page = readFileSync("src/pages/PageIntelligentBooker.tsx", "utf8");
    expect(page).toContain("useReducedMotion");
    expect(page).toContain("window.clearInterval");
    expect(page).toContain("aria-pressed");
    expect(page).not.toContain("supabase.functions.invoke");
    expect(page).not.toContain("stripe.redirectToCheckout");
    expect(page).not.toMatch(/dernier(?:e)? place|places restantes|5 rendez-vous garantis/i);
  });
});
