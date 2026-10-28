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
    expect(mock.telemetry).not.toHaveBeenCalled();
  });

  it("does not redirect when no valid checkout URL was returned", async () => {
    mock.invoke.mockResolvedValue({ data: { error: "checkout_unavailable" }, error: null });
    start();
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible d'ouvrir le paiement");
    expect(mock.redirect).not.toHaveBeenCalled();
    expect(mock.telemetry).not.toHaveBeenCalled();
  });
});
