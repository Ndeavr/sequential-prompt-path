/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PanelRealStripeValidation from "@/components/go-live/verification/PanelRealStripeValidation";
import FirstRevenueTracker, {
  REVENUE_UNAVAILABLE,
} from "@/components/admin/outreach/FirstRevenueTracker";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    functions: { invoke: mocks.invoke },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.select.mockResolvedValue({ count: 4, error: null });
  mocks.from.mockImplementation(() => ({
    select: mocks.select,
    insert: mocks.insert,
  }));
});

afterEach(() => {
  cleanup();
});

describe("Stripe diagnostics remain read-only and fail closed", () => {
  it("does not create Checkouts, activate plans, write tests or claim a payment because traces exist", async () => {
    render(<PanelRealStripeValidation />);
    fireEvent.click(screen.getByRole("button", { name: /Consulter les traces/i }));

    await waitFor(() => expect(mocks.select).toHaveBeenCalledTimes(3));
    expect(mocks.from).toHaveBeenCalledWith("unpro_payment_activation_audit");
    expect(mocks.from).toHaveBeenCalledWith("unpro_stripe_webhook_events");
    expect(mocks.from).toHaveBeenCalledWith("billing_checkout_sessions");
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();

    expect(screen.getByText("Paiement non vérifié")).toBeTruthy();
    expect(screen.getAllByText(/Une trace ne constitue pas une preuve de vente réglée/i)).toHaveLength(3);
  });

  it("fails closed when access to hosted evidence is denied", async () => {
    mocks.select.mockResolvedValue({ count: null, error: { message: "RLS denied" } });

    render(<PanelRealStripeValidation />);
    fireEvent.click(screen.getByRole("button", { name: /Consulter les traces/i }));

    await waitFor(() => expect(screen.getAllByText(/Lecture indisponible/i)).toHaveLength(3));
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(screen.queryByText("Paiement vérifié")).toBeNull();
  });
});

describe("Historical funnel statuses are not booked Stripe revenue", () => {
  it.each([1, 4, 21])(
    "does not infer $350 payments from %i historical activation or plan indicators",
    (historicalCount) => {
      render(
        <FirstRevenueTracker
          snapshot={{
            activations_today: historicalCount,
            activations_7d: historicalCount,
            activations_30d: historicalCount,
            contacted_7d: 0,
            contacted_30d: 0,
            registrations_7d: 0,
            profiles_completed_7d: 0,
            paid_plans_active: historicalCount,
            last_activation_at: null,
            alert_no_activation_48h: false,
          }}
        />,
      );
      expect(screen.getAllByText(REVENUE_UNAVAILABLE)).toHaveLength(2);
      expect(screen.getByText(/Activations déclarées aujourd'hui \(non vérifiées\)/)).toBeTruthy();
      expect(screen.getByText(/Plans indiqués payants \(non vérifiés\)/)).toBeTruthy();
      expect(screen.getByText(/paiement Stripe LIVE réglé/)).toBeTruthy();
    },
  );
});
