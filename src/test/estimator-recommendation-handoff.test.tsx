/**
 * P0 — le relais calculateur → recommandation doit transporter le contexte
 * canonique (projet + demande) et ne jamais afficher de recommandation ni de
 * bouton de réservation lorsqu'aucun jumelage réel n'existe.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/layouts/PageShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/cta/PrimaryCTA", () => ({
  default: ({ label }: { label?: string }) => <button type="button">{label}</button>,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "11111111-1111-4111-8111-111111111111" }, isAuthenticated: true }),
}));

const matchesRows: unknown[] = [];

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const builder: Record<string, unknown> = {};
    const self = () => builder as never;
    builder.select = self;
    builder.eq = self;
    builder.order = self;
    builder.limit = () =>
      table === "matches"
        ? Promise.resolve({ data: matchesRows, error: null })
        : (builder as never);
    builder.maybeSingle = () =>
      Promise.resolve({
        data: table === "leads" ? { id: "22222222-2222-4222-8222-222222222222" } : null,
        error: null,
      });
    builder.then = undefined;
    return builder;
  };
  return { supabase: { from: (table: string) => chain(table) } };
});

import PageProjectCreatedSuccess from "@/pages/PageProjectCreatedSuccess";
import PageRecommendations from "@/pages/PageRecommendations";

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/project-created" element={<PageProjectCreatedSuccess />} />
          <Route path="/recommendations" element={<PageRecommendations />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PROJECT = "33333333-3333-4333-8333-333333333333";
const LEAD = "22222222-2222-4222-8222-222222222222";

describe("relais projet → recommandation", () => {
  it("transporte projet et demande vers la recommandation quand un jumelage existe", () => {
    renderAt(`/project-created?id=${PROJECT}&lead=${LEAD}&matches=1`);
    const cta = screen.getByTestId("cta-recommendations");
    expect(cta.getAttribute("href")).toBe(`/recommendations?project=${PROJECT}&lead=${LEAD}`);
  });

  it("renvoie vers le suivi réel du projet quand aucun jumelage n'existe", () => {
    renderAt(`/project-created?id=${PROJECT}&lead=${LEAD}`);
    expect(screen.queryByTestId("cta-recommendations")).toBeNull();
    expect(screen.getByTestId("cta-waiting").getAttribute("href")).toBe(
      `/dashboard/projects/${PROJECT}/waiting`,
    );
  });

  it("n'affiche ni recommandation ni réservation quand le jumelage est vide", async () => {
    renderAt(`/recommendations?project=${PROJECT}&lead=${LEAD}`);
    await waitFor(() => expect(screen.getByTestId("recommendation-empty")).toBeTruthy());
    expect(screen.queryByTestId("recommendation-result")).toBeNull();
    expect(screen.queryByTestId("cta-book")).toBeNull();
    expect(screen.queryByText(/Clara finalise/i)).toBeNull();
    expect(screen.getByTestId("cta-waiting").getAttribute("href")).toBe(
      `/dashboard/projects/${PROJECT}/waiting`,
    );
  });
});
