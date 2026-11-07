import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const { loadMock, KddAccessDeniedError } = vi.hoisted(() => {
  class KddAccessDeniedError extends Error {}
  return { loadMock: { impl: (async () => null) as () => Promise<unknown> }, KddAccessDeniedError };
});
vi.mock("@/services/kddV1Service", () => ({ loadKddV1: () => loadMock.impl(), KddAccessDeniedError }));

import PageAdminKddV1 from "@/pages/admin/PageAdminKddV1";
import { buildInsights, computeCohorts, computeDemand, computeEntry350, computePace } from "@/lib/kdd/kddV1";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter><PageAdminKddV1 /></MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

function emptyData() {
  const now = new Date("2026-11-07T15:25:00Z");
  const entry = computeEntry350([], []);
  const pace = computePace(0, [], now);
  const cohorts = computeCohorts([], new Set());
  const demand = computeDemand([]);
  return {
    generatedAt: now.toISOString(), entry, pace, cohorts, demand, flowSteps: [], truncated: [],
    insights: buildInsights({ entry, pace, cohorts, demand, truncated: [] }), unreadable: [],
  };
}

describe("PageAdminKddV1 states", () => {
  beforeEach(() => { loadMock.impl = async () => null; });

  it("shows access denied without any figures for non-admins", async () => {
    loadMock.impl = async () => { throw new KddAccessDeniedError("x"); };
    renderPage();
    expect(await screen.findByText("Accès réservé aux administrateurs.")).toBeTruthy();
    expect(screen.queryByText(/Entreprises vérifiées/)).toBeNull();
  });

  it("shows an error with retry and no false zero", async () => {
    loadMock.impl = async () => { throw new Error("network"); };
    renderPage();
    expect(await screen.findByText(/Aucun chiffre n'est affiché/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("renders empty states with goal, gap and recommended actions", async () => {
    loadMock.impl = async () => emptyData();
    renderPage();
    await waitFor(() => expect(screen.getByText("Entreprises vérifiées")).toBeTruthy());
    expect(screen.getByText("Aucune cohorte disponible.")).toBeTruthy();
    expect(screen.getByText(/Aucune demande non servie admissible pour la période/)).toBeTruthy();
    expect(screen.getAllByText(/Action :/).length).toBeGreaterThanOrEqual(5);
  });
});
