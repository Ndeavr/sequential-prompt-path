/** @vitest-environment jsdom */
// Reconciles PR #39 with the current component; synthetic I/O only.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PanelRealStripeValidation from "@/components/go-live/verification/PanelRealStripeValidation";

const mocks = vi.hoisted(() => ({
  from: vi.fn(), select: vi.fn(), insert: vi.fn(), update: vi.fn(),
  delete: vi.fn(), upsert: vi.fn(), rpc: vi.fn(), invoke: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc, functions: { invoke: mocks.invoke } },
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.select.mockResolvedValue({ count: 4, error: null });
  mocks.from.mockImplementation(() => ({
    select: mocks.select, insert: mocks.insert, update: mocks.update,
    delete: mocks.delete, upsert: mocks.upsert,
  }));
});
afterEach(cleanup);

async function consult() {
  render(<PanelRealStripeValidation />);
  const button = screen.getByRole("button", { name: "Consulter les traces" });
  fireEvent.click(button);
  await waitFor(() => expect(mocks.select).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(button).not.toBeDisabled());
}
function assertReadOnly() {
  expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
    "unpro_payment_activation_audit", "unpro_stripe_webhook_events", "billing_checkout_sessions",
  ]);
  expect(mocks.select.mock.calls).toEqual(Array.from({ length: 3 }, () => ["id", { count: "exact", head: true }]));
  for (const method of [mocks.insert, mocks.update, mocks.delete, mocks.upsert, mocks.rpc, mocks.invoke]) {
    expect(method).not.toHaveBeenCalled();
  }
}
describe("PR #39 — diagnostics cannot create a payment or activation", () => {
  it.each([0, 4, 21])("only SELECTs even with %i historical traces", async (count) => {
    mocks.select.mockResolvedValue({ count, error: null });
    await consult();
    assertReadOnly();
  });
  it.each(["401", "403", "RLS denied", "503"])("denied/failed read %s never invokes a fallback", async (message) => {
    mocks.select.mockResolvedValue({ count: null, error: { message } });
    await consult();
    assertReadOnly();
  });
  it.each([null, -1, Number.NaN])("incomplete count %s never triggers writes", async (count) => {
    mocks.select.mockResolvedValue({ count, error: null });
    await consult();
    assertReadOnly();
  });
  it("network exceptions never invoke a provider or mutation", async () => {
    mocks.select.mockRejectedValue(new Error("synthetic unavailable"));
    await consult();
    assertReadOnly();
  });
});