import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { safeRedirectUrl, resolveInvitedCheckoutOrigin, shouldSkipRedelivery, isSessionPaid } from "../../supabase/functions/_shared/checkoutGuards";

describe("checkout redirect allowlist", () => {
  it("keeps our origins and rejects others", () => {
    expect(safeRedirectUrl("https://unpro.ca/x?checkout=success", "F")).toBe("https://unpro.ca/x?checkout=success");
    expect(safeRedirectUrl("https://id-preview--ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovable.app/x", "F")).toContain("lovable.app");
    expect(safeRedirectUrl("https://attacker.lovable.app/x", "F")).toBe("F");
    expect(safeRedirectUrl("http://localhost:8080/x", "F")).toContain("localhost");
    expect(safeRedirectUrl("https://evil.com/x", "F")).toBe("F");
    expect(safeRedirectUrl("https://unpro.ca.evil.com/x", "F")).toBe("F");
    expect(safeRedirectUrl("javascript:alert(1)", "F")).toBe("F");
  });
});

describe("public invited Checkout return origin", () => {
  const canonical = "https://unpro.ca";
  it.each([
    [null], [""], ["https://evil.example"],
    ["https://unpro.ca.evil.example"], ["https://unpro.ca@evil.example"],
    ["javascript:alert(1)"], ["http://localhost:8080"],
    ["https://id-preview--ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovable.app"],
    ["https://unpro.ca"], ["https://www.unpro.ca"],
  ])("LIVE always uses canonical origin, never the client Origin: %s", (origin) => {
    expect(resolveInvitedCheckoutOrigin(origin, "live")).toBe(canonical);
  });

  it("permits exact, vetted TEST preview/local origins only", () => {
    expect(resolveInvitedCheckoutOrigin("http://localhost:8080", "test")).toBe("http://localhost:8080");
    expect(resolveInvitedCheckoutOrigin(
      "https://id-preview--ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovable.app", "test",
    )).toBe("https://id-preview--ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovable.app");
    expect(resolveInvitedCheckoutOrigin("https://www.unpro.ca", "test")).toBe("https://www.unpro.ca");
  });

  it.each([
    "https://attacker.lovable.app",
    "https://unpro.ca.evil.example",
    "https://unpro.ca@evil.example",
    "http://unpro.ca",
    "javascript:alert(1)",
    "https://unpro.ca/redirect",
    "https://unpro.ca/?token=123",
    "https://unpro.ca#fragment",
    "http://localhost:8080/?session_id=unsafe",
    "https://unpro.ca\\evil.example",
  ])("rejects unsafe or non-origin input in TEST: %s", (origin) => {
    expect(resolveInvitedCheckoutOrigin(origin, "test")).toBe(canonical);
  });

  it("wires the guard into the real invited Checkout before Stripe session creation", () => {
    const invited = readFileSync("supabase/functions/create-activation-checkout/index.ts", "utf8");
    expect(invited).toContain('resolveInvitedCheckoutOrigin(req.headers.get("origin"), stripeEnv)');
    expect(invited).not.toContain('const origin = req.headers.get("origin") ||');
    expect(invited).toContain('success_url: `${origin}${successPath}`');
    expect(invited).toContain('cancel_url: `${origin}${cancelPath}`');
  });
});

describe("webhook redelivery", () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  it("skips processed and in-flight events", () => {
    expect(shouldSkipRedelivery({ processing_status: "processed" }, now)).toBe(true);
    expect(shouldSkipRedelivery({ processing_status: "processing", received_at: "2026-10-08T11:58:00Z" }, now)).toBe(true);
  });
  it("retries failed or stalled events instead of dropping a payment", () => {
    expect(shouldSkipRedelivery({ processing_status: "failed" }, now)).toBe(false);
    expect(shouldSkipRedelivery({ processing_status: "processing", received_at: "2026-10-08T11:00:00Z" }, now)).toBe(false);
  });
});

describe("paid status", () => {
  it("only Stripe payment_status drives activation", () => {
    expect(isSessionPaid({ payment_status: "paid" })).toBe(true);
    expect(isSessionPaid({ payment_status: "unpaid", status: "complete" })).toBe(false);
  });
});

describe("wiring", () => {
  const checkout = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
  const hook = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
  const plan = readFileSync("src/pages/contractor-funnel/PageContractorPersonalizedPlan.tsx", "utf8");
  it("checkout validates redirects, blocks paid quotes, reuses open sessions, reconciles", () => {
    expect(checkout).toContain("safeRedirectUrl(rawSuccessUrl");
    expect(checkout).toContain('code: "already_paid"');
    expect(checkout).toContain("reused: true");
    expect(checkout).toContain('action === "reconcile"');
  });
  it("webhook handles async payments and failed redeliveries", () => {
    expect(hook).toContain('case "checkout.session.async_payment_succeeded":');
    expect(hook).toContain("shouldSkipRedelivery(prior)");
  });
  it("delayed webhook triggers server reconciliation, never URL activation", () => {
    expect(plan).toContain("reconcileQuoteDetail(quoteId, sid)");
    expect(plan).not.toContain("Paiement reçu, confirmation en attente.");
  });
});
