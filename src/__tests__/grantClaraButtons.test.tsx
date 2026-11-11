import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ReactNode } from "react";

vi.mock("@/layouts/MainLayout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/home-light/ClaraConversationBox", () => ({
  default: ({ grantHandoff }: { grantHandoff?: { id: string; text: string } }) => (
    <section data-testid="clara-handoff-preview">
      {grantHandoff?.text ?? "Contexte non reçu"}
    </section>
  ),
}));

import PageSubventionCalculator from "@/pages/calculators/PageSubventionCalculator";

afterEach(cleanup);

describe("calculateur public — boutons Clara", () => {
  it("lance Clara depuis les valeurs choisies, dans une vraie fenêtre dialog", () => {
    render(<HelmetProvider><MemoryRouter initialEntries={["/calculateur-subventions"]}>
      <PageSubventionCalculator />
    </MemoryRouter></HelmetProvider>);
    // Aucune catégorie n'est implicitement déclarée sur la page générale.
    const toiture = screen.getByRole("checkbox", { name: /Entretoit \/ grenier/i }) as HTMLInputElement;
    expect(toiture.checked).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: /Fenêtres et portes-patio/i }));
    fireEvent.change(screen.getByLabelText(/Nombre d'ouvertures brutes remplacées/i), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Je prévois des modèles ENERGY STAR/i }));
    fireEvent.click(screen.getByTestId("grant-clara-start"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    const handoff = screen.getByTestId("clara-handoff-preview").textContent ?? "";
    expect(handoff).toContain("10 ouvertures");
    expect(handoff.replace(/[\u00a0\u202f]/g, " ")).toContain("3 000");
    expect(handoff).toContain("sans les redemander");
    expect(handoff).not.toContain("Toiture :");
    expect(screen.getByRole("button", { name: "Fermer la conversation" })).toBeTruthy();
  });

  it("le bouton coût ouvre Clara avec les mêmes entrées et une demande distincte", () => {
    render(<HelmetProvider><MemoryRouter initialEntries={["/calculateur-subventions"]}>
      <PageSubventionCalculator />
    </MemoryRouter></HelmetProvider>);
    fireEvent.click(screen.getByRole("checkbox", { name: /Murs extérieurs/i }));
    fireEvent.change(screen.getByLabelText(/Surface nette à isoler \(pi²\)/i), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText(/Valeur R ajoutée/i), { target: { value: "9" } });
    fireEvent.click(screen.getByTestId("grant-clara-cost"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    const handoff = screen.getByTestId("clara-handoff-preview").textContent ?? "";
    expect(handoff).toContain("500 pi²");
    expect(handoff).toContain("COÛT probable");
    expect(handoff).not.toContain("Toiture :");
  });
});
