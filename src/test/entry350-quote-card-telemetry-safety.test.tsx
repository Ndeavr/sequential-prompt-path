import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const mock = vi.hoisted(() => ({
  session: vi.fn(),
  invoke: vi.fn(),
  telemetry: vi.fn(),
  redirect: vi.fn(),
  login: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mock.session }, functions: { invoke: mock.invoke } },
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: mock.telemetry }));
vi.mock("@/lib/redirectToCheckout", () => ({ redirectToCheckout: mock.redirect }));
vi.mock("@/components/contact/CallUnproLink", () => ({ CallUnproLink: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { EntryActivation350Card } from "@/components/entrepreneur/EntryActivation350Card";

const props = {
  quoteId: "PRIVATE-QUOTE-IDENTIFIER",
  contractorId: "synthetic-business-id",
  guaranteedAppointments: null,
  affiliateRef: "PRIVATE-AFFILIATE-REF",
  activationToken: "PRIVATE-ACTIVATION-TOKEN",
  successUrl: "https://unpro.ca/confirmation",
  cancelUrl: "https://unpro.ca/activation",
  onLogin: mock.login,
  onMore: vi.fn(),
};

function clickCheckout() {
  render(<EntryActivation350Card {...props} />);
  fireEvent.click(within(screen.getByTestId("entry-350-card")).getAllByRole("button")[0]);
}

describe("350 $ quote card telemetry privacy — synthetic only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/entrepreneurs/activation-350?t=PRIVATE-URL-TOKEN&prospect=PRIVATE-PROSPECT");
    mock.session.mockResolvedValue({ data: { session: { user: { id: "qa-only" } } } });
    mock.telemetry.mockResolvedValue(undefined);
  });
  afterEach(() => cleanup());

  it("never records private quote, token or upstream error in failed-checkout telemetry", async () => {
    mock.invoke.mockResolvedValue({
      data: { error: "PRIVATE-REMOTE-ERROR: contact@private.example / PRIVATE-ACTIVATION-TOKEN" },
      error: null,
    });

    clickCheckout();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() => expect(mock.telemetry).toHaveBeenCalledTimes(2));

    const events = mock.telemetry.mock.calls.map(([event]) => event);
    expect(events).toEqual([
      {
        event_type: "entry_350_clicked",
        contractor_id: "synthetic-business-id",
        step: "quote_card_clicked",
        current_path: "/entrepreneurs/activation-350",
        token: "",
        suppress_prospect_ref: true,
        metadata: { surface: "entry_350_quote_card", phase: "pre_stripe_session" },
      },
      {
        event_type: "entry_350_checkout_failed",
        contractor_id: "synthetic-business-id",
        step: "checkout_unavailable",
        current_path: "/entrepreneurs/activation-350",
        token: "",
        suppress_prospect_ref: true,
        metadata: { surface: "entry_350_quote_card", phase: "pre_stripe_session" },
      },
    ]);
    const serialized = JSON.stringify(events);
    for (const secret of [
      "PRIVATE-QUOTE-IDENTIFIER",
      "PRIVATE-URL-TOKEN",
      "PRIVATE-PROSPECT",
      "PRIVATE-ACTIVATION-TOKEN",
      "PRIVATE-AFFILIATE-REF",
      "PRIVATE-REMOTE-ERROR",
      "contact@private.example",
    ]) expect(serialized).not.toContain(secret);
    expect(mock.redirect).not.toHaveBeenCalled();
  });

  it("preserves server-created Stripe redirect without claiming payment", async () => {
    mock.invoke.mockResolvedValue({
      data: { url: "https://checkout.stripe.com/c/pay/cs_test_synthetic" },
      error: null,
    });
    clickCheckout();
    await waitFor(() => expect(mock.redirect).toHaveBeenCalledExactlyOnceWith(
      "https://checkout.stripe.com/c/pay/cs_test_synthetic",
    ));
    expect(mock.telemetry).toHaveBeenCalledTimes(1);
    expect(mock.telemetry.mock.calls[0][0].event_type).toBe("entry_350_clicked");
    expect(mock.invoke).toHaveBeenCalledWith("create-checkout-session", {
      body: expect.objectContaining({ entryActivation: true, quoteId: "PRIVATE-QUOTE-IDENTIFIER" }),
    });
  });
  it("keeps a non-2xx reconciliation-pending reservation from looking like a failed payment — synthetic only", async () => {
    const responseBody = { code: "checkout_reconciliation_pending", error: "checkout_record_unavailable" };
    mock.invoke.mockResolvedValue({
      data: null,
      error: {
        message: "FunctionsHttpError",
        context: {
          json: async () => responseBody,
          clone: () => ({ json: async () => responseBody }),
        },
      },
    });

    clickCheckout();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Ne payez pas deux fois");
    expect(alert.textContent).not.toMatch(/rien n.a été facturé|aucun paiement n.a été/i);
    expect(mock.redirect).not.toHaveBeenCalled();
    expect(mock.invoke).toHaveBeenCalledTimes(1);
    // Pending reconciliation is not a confirmed checkout failure or a second Stripe request.
    await waitFor(() => expect(mock.telemetry).toHaveBeenCalledTimes(1));
    expect(mock.telemetry.mock.calls[0][0].event_type).toBe("entry_350_clicked");
    expect(JSON.stringify(mock.telemetry.mock.calls)).not.toContain("checkout_record_unavailable");
  });

  it("does not claim that no charge occurred when the network result is unknown — synthetic only", async () => {
    mock.invoke.mockRejectedValue(new Error("SYNTHETIC_PROVIDER_INTERNAL_DETAIL"));
    clickCheckout();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Impossible de confirmer l'ouverture du paiement");
    expect(alert.textContent).not.toMatch(/rien n.a été facturé|aucun paiement n.a été/i);
    expect(alert.textContent).not.toContain("SYNTHETIC_PROVIDER_INTERNAL_DETAIL");
    expect(mock.redirect).not.toHaveBeenCalled();
    await waitFor(() => expect(mock.telemetry).toHaveBeenCalledTimes(2));
    expect(mock.telemetry.mock.calls.map(([event]) => event.event_type)).toEqual([
      "entry_350_clicked",
      "entry_350_checkout_failed",
    ]);
    expect(JSON.stringify(mock.telemetry.mock.calls)).not.toContain("SYNTHETIC_PROVIDER_INTERNAL_DETAIL");
  });

});
