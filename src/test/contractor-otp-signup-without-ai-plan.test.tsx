// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PageContractorAnalysisLive from "@/pages/contractor/PageContractorAnalysisLive";

const backend = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: backend.row, error: null }),
        }),
      }),
    }),
    channel: () => ({
      on() { return this; },
      subscribe() { return this; },
    }),
    removeChannel: vi.fn(),
  },
}));
vi.mock("@/services/auth/roleIntent", () => ({ saveRoleIntent: vi.fn() }));
vi.mock("@/services/auth/authIntentService", () => ({ saveAuthIntent: vi.fn() }));

function mount(withRun = true) {
  return render(
    <MemoryRouter initialEntries={[withRun ? "/contractor/analysis?run=example-run" : "/contractor/analysis"]}>
      <Routes>
        <Route path="/contractor/analysis" element={<PageContractorAnalysisLive />} />
        <Route path="/join/profile" element={<p>OTP / authentification</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  backend.row = null;
});

describe("contractor identity-first signup after AI analysis", () => {
  it("lets the contractor reach the existing OTP gate even when analysis fails without a plan", async () => {
    backend.row = {
      id: "example-run",
      domain: "entreprise.example",
      pipeline_status: "failed",
      current_step: "extraction",
      aipp_score: null,
      recommended_plan: null,
      aipp_breakdown: {},
      partial_confidence: true,
      error_log: [],
    };
    mount();
    const button = screen.getByRole("button", { name: /réclamer mon profil — sans paiement/i });
    expect(button).toBeInTheDocument();
    expect(screen.queryByText(/accès privilégié activé/i)).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(await screen.findByText("OTP / authentification")).toBeInTheDocument();
  });

  it("shows no-payment signup before an AI plan is recommended", () => {
    backend.row = {
      id: "example-run",
      domain: null,
      pipeline_status: "running",
      current_step: "scoring",
      aipp_score: null,
      recommended_plan: null,
      aipp_breakdown: {},
      partial_confidence: true,
      error_log: [],
    };
    mount();
    expect(screen.getByRole("button", { name: /réclamer mon profil — sans paiement/i })).toBeInTheDocument();
    expect(screen.getByText(/aucun paiement à cette étape/i)).toBeInTheDocument();
  });

  it("does not offer signup without a run identifier", () => {
    mount(false);
    expect(screen.getByText("Aucune session d'activation.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /réclamer mon profil/i })).not.toBeInTheDocument();
  });
});
