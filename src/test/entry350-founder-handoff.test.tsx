import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), update: vi.fn(), state: { selected_plan: "founder", billing_cycle: "monthly", business_name: "Atelier synthétique", id: "synthetic" } }));
vi.mock("@/hooks/useActivationFunnel", () => ({ useActivationFunnel: () => ({ state: mocks.state, updateFunnel: mocks.update }) }));
vi.mock("@/hooks/useHesitationRescue", () => ({ useHesitationRescue: () => undefined }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/components/contractor-funnel/FunnelLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
import ScreenPayment from "@/pages/entrepreneur/activation/ScreenPayment";

function Location() { const location = useLocation(); return <output data-testid="destination">{location.pathname}{location.search}</output>; }
afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.clear(); });
describe("Founder payment uses authenticated entry350 only", () => {
  it("routes to activation-350 with activate=1 without any guest Checkout or paid mutation", async () => {
    render(<MemoryRouter initialEntries={["/entrepreneur/activer/paiement?ref=QA-REF&utm_source=synthetic"]}><ScreenPayment /><Location /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("button", { name: /Payer 402\.41/ })[0]);
    await waitFor(() => expect(screen.getByTestId("destination").textContent).toMatch(/^\/entrepreneurs\/activation-350\?/));
    const destination = new URL(screen.getByTestId("destination").textContent || "", "https://unpro.ca");
    expect(destination.searchParams.get("activate")).toBe("1");
    expect(destination.searchParams.get("ref")).toBe("QA-REF");
    expect(destination.searchParams.get("utm_source")).toBe("synthetic");
    expect(sessionStorage.getItem("unpro_entry350_declared_name")).toBe("Atelier synthétique");
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});