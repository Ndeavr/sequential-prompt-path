/**
 * P0 — le relais calculateur → recommandation doit :
 *  - transporter le contexte canonique (projet + demande) ;
 *  - ignorer un paramètre d'URL falsifié (`?matches=1`) ;
 *  - refuser toute recommandation quand la demande n'appartient pas au
 *    propriétaire authentifié, quand la licence RBQ n'est pas vérifiée/valide,
 *    ou quand le nom ou l'adresse publique de l'entrepreneur manquent ;
 *  - n'exposer aucun score interne ;
 *  - pointer la réservation vers /book/:slug.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/layouts/PageShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/cta/PrimaryCTA", () => ({
  default: ({ label }: { label?: string }) => <button type="button">{label}</button>,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "11111111-1111-4111-8111-111111111111" }, isAuthenticated: true }),
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({
  logFunnelEvent: vi.fn(async () => undefined),
}));

const state: {
  leadOwned: boolean;
  matches: Array<Record<string, unknown>>;
  contractor: Record<string, unknown> | null;
} = { leadOwned: true, matches: [], contractor: null };

vi.mock("@/integrations/supabase/client", () => {
  const chain = (table: string) => {
    const builder: Record<string, unknown> = {};
    const self = () => builder as never;
    builder.select = self;
    builder.eq = self;
    builder.order = self;
    builder.limit = () =>
      table === "matches"
        ? Promise.resolve({ data: state.matches, error: null })
        : (builder as never);
    builder.maybeSingle = () => {
      if (table === "leads") {
        return Promise.resolve({
          data: state.leadOwned ? { id: LEAD } : null,
          error: null,
        });
      }
      if (table === "contractors") {
        return Promise.resolve({ data: state.contractor, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    };
    return builder;
  };
  return { supabase: { from: (table: string) => chain(table) } };
});

import PageProjectCreatedSuccess from "@/pages/PageProjectCreatedSuccess";
import PageRecommendations from "@/pages/PageRecommendations";

const PROJECT = "33333333-3333-4333-8333-333333333333";
const LEAD = "22222222-2222-4222-8222-222222222222";
const PRO = "44444444-4444-4444-8444-444444444444";

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

function eligiblePro(overrides: Record<string, unknown> = {}) {
  return {
    id: PRO,
    slug: "toiture-exemple",
    business_name: "Toiture Exemple",
    city: "Laval",
    account_status: "active",
    verification_status: "verified",
    is_accepting_appointments: true,
    booking_enabled: true,
    rbq_number: "1234-5678-01",
    rbq_compliance_status: "verified",
    rbq_verified_at: "2026-01-01T00:00:00Z",
    rbq_expiry_date: null,
    ...overrides,
  };
}

beforeEach(() => {
  state.leadOwned = true;
  state.matches = [];
  state.contractor = null;
});

describe("relais projet → recommandation", () => {
  it("ignore ?matches=1 falsifié et renvoie vers le suivi réel", async () => {
    renderAt(`/project-created?id=${PROJECT}&lead=${LEAD}&matches=1`);
    await waitFor(() => expect(screen.getByTestId("cta-waiting")).toBeTruthy());
    expect(screen.queryByTestId("cta-recommendations")).toBeNull();
    expect(screen.getByTestId("cta-waiting").getAttribute("href")).toBe(
      `/dashboard/projects/${PROJECT}/waiting`,
    );
  });

  it("transporte projet et demande quand un jumelage admissible existe", async () => {
    state.matches = [{ contractor_id: PRO, reasons: ["Spécialiste"], status: "pending", score: 88 }];
    state.contractor = eligiblePro();
    renderAt(`/project-created?id=${PROJECT}&lead=${LEAD}`);
    await waitFor(() => expect(screen.getByTestId("cta-recommendations")).toBeTruthy());
    expect(screen.getByTestId("cta-recommendations").getAttribute("href")).toBe(
      `/recommendations?project=${PROJECT}&lead=${LEAD}`,
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

  it("refuse la recommandation si la demande n'appartient pas au propriétaire", async () => {
    state.leadOwned = false;
    state.matches = [{ contractor_id: PRO, reasons: [], status: "pending", score: 90 }];
    state.contractor = eligiblePro();
    renderAt(`/recommendations?project=${PROJECT}&lead=${LEAD}`);
    await waitFor(() => expect(screen.getByTestId("recommendation-empty")).toBeTruthy());
    expect(screen.queryByTestId("cta-book")).toBeNull();
  });

  it.each([
    ["RBQ en attente", { rbq_compliance_status: "in_progress" }],
    ["RBQ jamais vérifiée", { rbq_verified_at: null }],
    ["RBQ expirée", { rbq_expiry_date: "2020-01-01T00:00:00Z" }],
    ["numéro RBQ manquant", { rbq_number: "" }],
    ["compte non vérifié", { verification_status: "pending" }],
    ["slug manquant", { slug: "" }],
    ["nom d'entreprise vide", { business_name: "   " }],
  ])("refuse la réservation : %s", async (_label, overrides) => {
    state.matches = [{ contractor_id: PRO, reasons: [], status: "pending", score: 95 }];
    state.contractor = eligiblePro(overrides);
    renderAt(`/recommendations?project=${PROJECT}&lead=${LEAD}`);
    await waitFor(() => expect(screen.getByTestId("recommendation-empty")).toBeTruthy());
    expect(screen.queryByTestId("cta-book")).toBeNull();
  });

  it("réserve via /book/:slug et n'expose jamais le score interne", async () => {
    state.matches = [{ contractor_id: PRO, reasons: ["Disponible à Laval"], status: "pending", score: 93 }];
    state.contractor = eligiblePro();
    renderAt(`/recommendations?project=${PROJECT}&lead=${LEAD}`);
    await waitFor(() => expect(screen.getByTestId("recommendation-result")).toBeTruthy());
    expect(screen.getByTestId("cta-book").getAttribute("href")).toBe(
      `/book/toiture-exemple?project=${PROJECT}`,
    );
    const panel = screen.getByTestId("recommendation-panel");
    expect(panel.textContent).not.toMatch(/93/);
    expect(panel.textContent).not.toMatch(/score/i);
  });
});
