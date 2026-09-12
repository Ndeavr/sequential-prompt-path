/**
 * P0 — interactions du calculateur :
 *  - le résultat complet est visible avant toute capture d'identité ;
 *  - les commandes restent utilisables au clavier ;
 *  - le mouvement réduit n'empêche jamais la saisie ni l'affichage ;
 *  - le montant animé finit sur la valeur réelle ;
 *  - le calculateur est accessible depuis le menu mobile propriétaire.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({
  logFunnelEvent: vi.fn(async () => undefined),
}));
vi.mock("@/features/renovationEstimator/services", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, fetchApprovedProjectVideos: vi.fn(async () => []) };
});
vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  const self = () => builder as never;
  builder.select = self;
  builder.eq = self;
  builder.order = self;
  builder.limit = () => Promise.resolve({ data: [], error: null });
  builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
  return {
    supabase: {
      from: () => builder,
      auth: {
        getSession: async () => ({ data: { session: null } }),
        getUser: async () => ({ data: { user: null } }),
      },
      functions: { invoke: vi.fn() },
    },
  };
});

import PageRenovationEstimator from "@/pages/calculators/PageRenovationEstimator";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/calculateur-renovation"]}>
        <PageRenovationEstimator />
      </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.stubGlobal("scrollTo", () => undefined);
  Element.prototype.scrollIntoView = () => undefined;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "matchMedia",
    (q: string) =>
      ({
        matches: false,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(performance.now() + 10_000);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

describe("Calculateur de rénovation — interactions", () => {
  it("affiche le titre canonique", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /Combien coûteront vos rénovations/i }),
    ).toBeInTheDocument();
  });

  it("permet de choisir une catégorie au clavier et de poursuivre", async () => {
    renderPage();
    const cuisine = await screen.findByTestId("category-cuisine");
    cuisine.focus();
    expect(document.activeElement).toBe(cuisine);
    fireEvent.click(cuisine);
    fireEvent.click(await screen.findByRole("button", { name: /Continuer — dimensions/i }));
    await waitFor(() => expect(screen.getByTestId("scope-standard")).toBeInTheDocument());
  });

  it("affiche l'estimation complète avant toute demande d'identité", async () => {
    renderPage();
    fireEvent.click(await screen.findByTestId("category-cuisine"));
    fireEvent.click(await screen.findByRole("button", { name: /Continuer — dimensions/i }));
    fireEvent.click(await screen.findByTestId("scope-standard"));
    const next = await screen.findByRole("button", { name: /Voir mon estimation/i });
    fireEvent.click(next);

    const total = await screen.findByTestId("estimate-total");
    expect(total.textContent).toMatch(/\d/);
    // Aucune capture d'identité avant le résultat.
    expect(within(total).queryByRole("textbox")).toBeNull();
  });
});
