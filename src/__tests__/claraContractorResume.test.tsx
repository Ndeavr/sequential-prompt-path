import { createRef } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClaraContractorFlow, { type ClaraContractorFlowHandle } from "@/components/home-light/ClaraContractorFlow";
import { hasActiveContractorFlow, isContractorContext, rememberActiveContractorFlow } from "@/services/clara/claraContractorResume";
import { activationCloseAnswer, claraActivationLinks } from "@/services/clara/claraActivationClose";

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
  CLARA_QUALIFICATION_UPDATED_EVENT: "clara-contractor-qualification-updated",
  resumeClaraQualification: () => Promise.resolve(),
  getClaraQualification: () => mocks.qualification,
  saveClaraQualification: (patch: object) => {
    mocks.qualification = { ...mocks.qualification, ...patch };
  },
  isAddressAnswer: () => false,
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
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));
vi.mock("@/hooks/useReferralAttribution", () => ({ getStoredAttribution: () => null }));
vi.mock("@/services/clara/claraNextStep", async (original) => ({
  ...await original<typeof import("@/services/clara/claraNextStep")>(),
  prepareClaraPricingDraft: vi.fn(),
}));

beforeEach(() => {
  sessionStorage.clear();
  mocks.token = "session-a";
  mocks.quote.mockReset();
  mocks.qualification = {
    business_name: "Entreprise QA", google_place_id: "qa-place",
    goals: ["Visibilité"], primary_trade: "Isolation",
    provenance: { primary_trade: "declared" },
    customer_type: "Résidentiel", service_areas: ["Terrebonne"],
    preferences_captured: true, preferences_confirmed: true,
  };
});
afterEach(cleanup);

function Destination() { const location = useLocation(); return <output data-testid="destination">{location.pathname}{location.search}</output>; }
function mountFlow(search = "") {
  const say = vi.fn(async (_text: string) => {});
  const ref = createRef<ClaraContractorFlowHandle>();
  const view = render(<MemoryRouter initialEntries={[`/${search}`]}><ClaraContractorFlow ref={ref} say={say} addUser={vi.fn()} onBusy={vi.fn()} /><Destination /></MemoryRouter>);
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

  it("offers base activation without capacity or monthly pricing and carries attribution to its existing route", async () => {
    sessionStorage.setItem("unpro_clara_contractor_flow", JSON.stringify({ priority: "visibility" }));
    const view = mountFlow("?ref=LORRAINE-UNPRO&utm_source=sms&utm_campaign=authorized&source=affiliate");
    const { say } = view;
    const cta = await view.findByRole("button", { name: "Activer mon profil — 350 $ + taxes" });
    expect(mocks.quote).not.toHaveBeenCalled();
    fireEvent.click(cta);
    const destination = new URL(view.getByTestId("destination").textContent ?? "", "https://unpro.ca");
    expect(destination.pathname).toBe("/entrepreneur/devis-personnalise");
    expect(Object.fromEntries(destination.searchParams)).toMatchObject({ from: "activation_350", ref: "LORRAINE-UNPRO", utm_source: "sms", utm_campaign: "authorized", source: "affiliate" });
    expect(say.mock.calls.some(([text]) => text.startsWith("Quels sont vos objectifs"))).toBe(false);
  });

  it("keeps zero capacity across remounts without blocking the base activation or inventing appointments", async () => {
    sessionStorage.setItem("unpro_clara_contractor_flow", JSON.stringify({ priority: "visibility", appointments: 0, avg_value: 3000 }));
    const first = mountFlow();
    await first.findByRole("button", { name: "Activer mon profil — 350 $ + taxes" });
    expect(JSON.parse(sessionStorage.getItem("unpro_clara_contractor_flow")!).appointments).toBe(0);
    first.unmount();
    const second = mountFlow();
    await second.findByRole("button", { name: "Activer mon profil — 350 $ + taxes" });
    expect(mocks.quote).not.toHaveBeenCalled();
  });

  it("closes an explicit price question before collecting more data, without claiming payment", async () => {
    mocks.qualification = {};
    const view = mountFlow();
    await waitFor(() => expect(view.say).toHaveBeenCalledWith("Quel est le nom de votre entreprise ou son site Web?"));
    await act(async () => { expect(view.ref.current?.handleText("C’est combien pour commencer?")).toBe(true); });
    expect(view.say.mock.calls.at(-1)?.[0]).toContain("402,41 $");
    expect(mocks.quote).not.toHaveBeenCalled();
    expect(activationCloseAnswer("Votre licence RBQ est-elle nécessaire?")).toContain("aucune admissibilité");
    expect(activationCloseAnswer("Est-ce garanti dans ChatGPT?")).toContain("Aucun classement");
    expect(activationCloseAnswer("Pas maintenant")).toContain("Aucun rappel");
  });

  it("only opens appointment pricing on an explicit option and preserves the base return path", () => {
    const links = claraActivationLinks("?ref=YANIS6S1&utm_medium=message");
    const option = new URL(links.more, "https://unpro.ca");
    expect(Object.fromEntries(option.searchParams)).toMatchObject({ ref: "YANIS6S1", utm_medium: "message", view: "personalized", from: "activation_350_more" });
    expect(new URL(links.activate, "https://unpro.ca").searchParams.has("view")).toBe(false);
    expect(activationCloseAnswer("Je veux des RDV")).toContain("jamais ajoutée automatiquement");
  });
});
