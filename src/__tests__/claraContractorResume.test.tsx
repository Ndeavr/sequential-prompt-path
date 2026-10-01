import { createRef } from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClaraContractorFlow, { type ClaraContractorFlowHandle } from "@/components/home-light/ClaraContractorFlow";
import { hasActiveContractorFlow, isContractorContext, rememberActiveContractorFlow } from "@/services/clara/claraContractorResume";

const mocks = vi.hoisted(() => ({
  qualification: {} as Record<string, unknown>,
  quote: vi.fn(),
  token: "session-a",
}));
vi.mock("@/services/clara/claraSession", () => ({
  getClaraSessionToken: () => mocks.token,
  peekClaraSessionToken: () => mocks.token,
}));
vi.mock("@/services/clara/claraContractorQualification", () => ({
  getClaraQualification: () => mocks.qualification,
  saveClaraQualification: (patch: object) => {
    mocks.qualification = { ...mocks.qualification, ...patch };
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: {
    ok: true, audit_id: "qa-audit", token: "qa", generated_at: "2026-10-01",
    readiness_score: null, gaps: [],
    baseline: { facts: [], missions: [], level: "pending", matched: { merged_sources: [] } },
  } })) } },
}));
vi.mock("@/services/contractorPricingQuoteService", () => ({
  computePricingQuote: mocks.quote, formatCAD: String,
}));
vi.mock("@/lib/analytics/funnelSteps", () => ({ trackFunnelStep: vi.fn() }));

beforeEach(() => {
  sessionStorage.clear();
  mocks.token = "session-a";
  mocks.quote.mockReset();
  mocks.qualification = {
    business_name: "Entreprise QA", google_place_id: "qa-place",
    goals: ["Visibilité"], primary_trade: "Isolation",
    provenance: { primary_trade: "declared" },
    customer_type: "Résidentiel", service_areas: ["Terrebonne"],
  };
});
afterEach(cleanup);

function mountFlow() {
  const say = vi.fn(async (_text: string) => {});
  const ref = createRef<ClaraContractorFlowHandle>();
  const view = render(<MemoryRouter><ClaraContractorFlow ref={ref} say={say} addUser={vi.fn()} onBusy={vi.fn()} /></MemoryRouter>);
  return { ...view, say, ref };
}

describe("contractor continuity", () => {
  it("restores only the active canonical conversation and clears on reset", () => {
    rememberActiveContractorFlow(true);
    expect(hasActiveContractorFlow()).toBe(true);
    mocks.token = "session-b";
    expect(hasActiveContractorFlow()).toBe(false);
    rememberActiveContractorFlow(false);
    mocks.token = "session-a";
    expect(hasActiveContractorFlow()).toBe(false);
  });

  it("does not classify homeowner verification as contractor onboarding", () => {
    expect(isContractorContext({ current_intent: "contractor_onboarding" })).toBe(true);
    expect(isContractorContext({ detected_role: "CONTRACTOR" })).toBe(true);
    expect(isContractorContext({ current_intent: "contractor_verification", detected_role: "CONTRACTOR" })).toBe(false);
  });

  it("requires explicit confirmation of an inferred Google trade", async () => {
    sessionStorage.setItem("unpro_clara_contractor_flow", JSON.stringify({ priority: "visibility" }));
    mocks.qualification.primary_trade = "Rénovation générale";
    mocks.qualification.provenance = { primary_trade: "inferred" };
    const { say } = mountFlow();
    await waitFor(() => expect(say).toHaveBeenCalledWith('Google indique « Rénovation générale ». Quel est votre métier principal?'));
    expect(mocks.quote).not.toHaveBeenCalled();
  });

  it("resumes at the first unanswered question without repeating goals", async () => {
    sessionStorage.setItem("unpro_clara_contractor_flow", JSON.stringify({ priority: "visibility" }));
    const { say } = mountFlow();
    await waitFor(() => expect(say).toHaveBeenCalledWith("Combien de rendez-vous pourriez-vous accueillir le mois prochain?"));
    expect(say.mock.calls.some(([text]) => text.startsWith("Quels sont vos objectifs"))).toBe(false);
  });

  it("keeps zero capacity across remounts and never prices it as one appointment", async () => {
    sessionStorage.setItem("unpro_clara_contractor_flow", JSON.stringify({ priority: "visibility", avg_value: 3000 }));
    const first = mountFlow();
    await waitFor(() => expect(first.say).toHaveBeenCalledWith("Combien de rendez-vous pourriez-vous accueillir le mois prochain?"));
    await act(async () => { first.ref.current!.handleText("0"); });
    expect(JSON.parse(sessionStorage.getItem("unpro_clara_contractor_flow")!).appointments).toBe(0);
    first.unmount();
    const second = mountFlow();
    await waitFor(() => expect(second.say).toHaveBeenCalledWith("Votre capacité enregistrée est de 0. Combien de rendez-vous pourrez-vous accueillir lorsque vous serez disponible?"));
    expect(mocks.quote).not.toHaveBeenCalled();
  });
});
