import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { isIdentityKnown } from "@/pages/contractor-funnel/PageContractorPricingIntake";
import { isContractorAgreementActive } from "@/lib/billing/contractorActivationState";

let mockProfile: any = null;
vi.mock("@/layouts/ContractorLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/hooks/useContractor", () => ({ useContractorProfile: () => ({ data: mockProfile, isLoading: false }) }));
vi.mock("@/hooks/useAppointments", () => ({ useAppointments: () => ({ data: [], isLoading: false }) }));
vi.mock("@/components/pro-dashboard/ProActivationCompact", () => ({ default: () => <div data-testid="compact-activation" /> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ count: 1 }) }) }) }) },
}));
import ProDashboard from "@/pages/pro/ProDashboard";

const renderDash = (p: any) => {
  mockProfile = p;
  return render(<MemoryRouter><ProDashboard /></MemoryRouter>);
};

describe("pricing intake — editing never drops back to business search", () => {
  it("identity stays known while city/trade are cleared mid-keystroke", () => {
    expect(isIdentityKnown({ businessConfirmed: true, data: { company_name: "Toiture X", city: "" } as any })).toBe(true);
    expect(isIdentityKnown({ businessConfirmed: true, data: { company_name: "Toiture X", trade_primary: "" } as any })).toBe(true);
  });
  it("unconfirmed or empty name is not a known identity", () => {
    expect(isIdentityKnown({ businessConfirmed: false, data: { company_name: "Toiture X" } as any })).toBe(false);
    expect(isIdentityKnown({ businessConfirmed: true, data: { company_name: "  " } as any })).toBe(false);
  });
});

describe("contractor dashboard — agreement status is server-authoritative", () => {
  it("default account_status=active with unpaid activation shows the 3-step activation", () => {
    renderDash({ id: "c1", account_status: "active", activation_status: "not_ready" });
    expect(screen.getByTestId("compact-activation")).toBeTruthy();
    expect(screen.queryByText(/entente est activée/)).toBeNull();
  });
  it("pending payment shows activation, never success", () => {
    renderDash({ id: "c1", account_status: "active", activation_status: "pending" });
    expect(screen.getByTestId("compact-activation")).toBeTruthy();
  });
  it("paid or eligible-free (server activated) shows active agreement", () => {
    renderDash({ id: "c1", account_status: "active", activation_status: "activated", rbq_number: "1", rbq_compliance_status: "verified" });
    expect(screen.getByText(/entente est activée/)).toBeTruthy();
  });
  it("missing profile (load error) never claims activation", () => {
    expect(isContractorAgreementActive(null)).toBe(false);
    expect(isContractorAgreementActive({ activation_status: "failed" })).toBe(false);
  });
});
