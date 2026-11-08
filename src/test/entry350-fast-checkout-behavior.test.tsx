import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mock = vi.hoisted(() => ({
  session: vi.fn(),
  invoke: vi.fn(),
  telemetry: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: mock.session }, functions: { invoke: mock.invoke } },
}));
vi.mock("@/services/clara/claraContractorQualification", () => ({
  getClaraQualification: () => ({ business_name: "" }),
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: mock.telemetry }));
vi.mock("@/lib/redirectToCheckout", () => ({ redirectToCheckout: mock.redirect }));

import Entry350FastCheckout from "@/components/entrepreneur/Entry350FastCheckout";

function start(query = "") {
  render(<MemoryRouter><Entry350FastCheckout query={new URLSearchParams(query)} /></MemoryRouter>);
  fireEvent.change(screen.getByTestId("entry-350-business-name"), { target: { value: "Atelier de test" } });
  fireEvent.click(screen.getByTestId("entry-350-checkout"));
}

describe("350 $ direct checkout — client handoff, all providers synthetic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mock.session.mockResolvedValue({ data: { session: { user: { id: "synthetic-only" } } }, error: null });
    mock.invoke.mockResolvedValue({
      data: { url: "https://checkout.stripe.com/c/pay/cs_test_synthetic" }, error: null,
    });
    mock.telemetry.mockResolvedValue(undefined);
  });
  afterEach(() => cleanup());

  it("redirects when the server returned Checkout URL and optional telemetry finishes", async () => {
    start("?ref=LORRAINE-UNPRO");
    await waitFor(() => expect(mock.redirect).toHaveBeenCalledExactlyOnceWith("https://checkout.stripe.com/c/pay/cs_test_synthetic"));
    expect(mock.invoke).toHaveBeenCalledWith("create-checkout-session", {
      body: expect.objectContaining({ entryActivation: true, declaredCompanyName: "Atelier de test", ref: "LORRAINE-UNPRO" }),
    });
    expect(mock.telemetry).toHaveBeenCalledWith(expect.objectContaining({ event_type: "stripe_checkout_started" }));
  });

  it("still redirects with a real server-returned URL when analytics never resolves", async () => {
    mock.telemetry.mockReturnValue(new Promise<void>(() => {}));
    start();
    await waitFor(() => expect(mock.redirect).toHaveBeenCalledExactlyOnceWith("https://checkout.stripe.com/c/pay/cs_test_synthetic"), { timeout: 2500 });
    expect(mock.telemetry).toHaveBeenCalledTimes(1);
  });

  it("never attaches activation or referral URL tokens to successful Checkout analytics", async () => {
    start("?t=synthetic-private-activation-token&ref=SECRET-REF");
    await waitFor(() => expect(mock.redirect).toHaveBeenCalledExactlyOnceWith("https://checkout.stripe.com/c/pay/cs_test_synthetic"));
    const handoffs = mock.telemetry.mock.calls
      .map(([input]) => input)
      .filter(input => input.event_type === "stripe_checkout_started");
    expect(handoffs).toEqual([{
      event_type: "stripe_checkout_started",
      step: "entry350_checkout_created",
      current_path: "/entrepreneurs/activation-350",
      token: "",
      suppress_prospect_ref: true,
      metadata: { surface: "activation_350", entry_activation: true },
    }]);
    expect(JSON.stringify(handoffs)).not.toContain("synthetic-private-activation-token");
    expect(JSON.stringify(handoffs)).not.toContain("SECRET-REF");
    expect(JSON.stringify(handoffs)).not.toContain("Atelier de test");
  });

  it("does not let rejected optional analytics block a verified Checkout URL", async () => {
    mock.telemetry.mockRejectedValue(new Error("synthetic analytics outage"));
    start();
    await waitFor(() => expect(mock.redirect).toHaveBeenCalledExactlyOnceWith("https://checkout.stripe.com/c/pay/cs_test_synthetic"));
  });

  it("does not redirect or claim payment if LIVE entry checkout is locked", async () => {
    mock.invoke.mockResolvedValue({ data: { code: "entry350_live_not_released" }, error: null });
    start();
    expect(await screen.findByRole("alert")).toHaveTextContent("Le paiement n'est pas encore ouvert");
    expect(mock.redirect).not.toHaveBeenCalled();
    expect(mock.telemetry).toHaveBeenCalledWith(expect.objectContaining({
      event_type: "entry_350_checkout_failed", step: "live_gate_closed",
      current_path: "/entrepreneurs/activation-350",
    }));
  });

  it("does not redirect when no valid checkout URL was returned", async () => {
    mock.invoke.mockResolvedValue({ data: { error: "checkout_unavailable" }, error: null });
    start();
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible d'ouvrir le paiement");
    expect(mock.redirect).not.toHaveBeenCalled();
    expect(mock.telemetry).toHaveBeenCalledWith(expect.objectContaining({
      event_type: "entry_350_checkout_failed", step: "checkout_unavailable",
      metadata: { surface: "activation_350", phase: "pre_stripe_session" },
    }));
  });

  it("does not leak a proposal or referral token in pre-checkout blocker telemetry", async () => {
    mock.invoke.mockResolvedValue({ data: { error: "provider_error" }, error: null });
    start("?t=synthetic-private-token&ref=PRIVATE-REF");
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible d'ouvrir le paiement");
    const failures = mock.telemetry.mock.calls
      .map(([input]) => input)
      .filter(input => input.event_type === "entry_350_checkout_failed");
    expect(failures).toEqual([{
      event_type: "entry_350_checkout_failed",
      step: "checkout_unavailable",
      current_path: "/entrepreneurs/activation-350",
      token: "",
      suppress_prospect_ref: true,
      metadata: { surface: "activation_350", phase: "pre_stripe_session" },
    }]);
    expect(JSON.stringify(failures)).not.toContain("synthetic-private-token");
    expect(JSON.stringify(failures)).not.toContain("PRIVATE-REF");
    expect(JSON.stringify(failures)).not.toContain("Atelier de test");
    expect(mock.redirect).not.toHaveBeenCalled();
  });

  it("never lets refused browser storage block authentication or checkout", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    try {
      start();
      await waitFor(() => expect(mock.redirect).toHaveBeenCalledExactlyOnceWith("https://checkout.stripe.com/c/pay/cs_test_synthetic"));
    } finally { spy.mockRestore(); }
  });

  it("keeps the promo code folded behind its toggle and the server-validated discount logic", () => {
    render(<MemoryRouter><Entry350FastCheckout query={new URLSearchParams()} /></MemoryRouter>);
    expect(screen.queryByTestId("entry-350-promo-input")).toBeNull();
    fireEvent.click(screen.getByTestId("entry-350-promo-toggle"));
    expect(screen.getByTestId("entry-350-promo-input")).toBeTruthy();
  });

  it("shows a human pending message with a dashboard link on return, never paid, and blocks a second payment", () => {
    render(<MemoryRouter><Entry350FastCheckout query={new URLSearchParams("?checkout=success")} /></MemoryRouter>);
    const box = screen.getByTestId("entry-350-return-pending");
    expect(box).toHaveTextContent("Confirmation de votre activation en cours");
    expect(screen.getByRole("link", { name: "Voir mon espace entrepreneur" }).getAttribute("href")).toBe("/pro");
    expect(box.textContent).not.toMatch(/payé|confirmé le paiement|Stripe/i);
    expect((screen.getByTestId("entry-350-checkout") as HTMLButtonElement).disabled).toBe(true);
  });
});
