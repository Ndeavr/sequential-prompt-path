import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Source-level privacy regression guard. No Stripe request, production DB or
// webhook is invoked by this test; fixtures and provider data are not needed.
const edge = readFileSync("supabase/functions/create-activation-checkout/index.ts", "utf8");

describe("Invited 350 $ checkout — provider error privacy", () => {
  it("preserves machine-readable failure stages without returning provider messages", () => {
    expect(edge).toContain('return json({ error: "stripe_error", stage: "stripe_create" }, 502);');
    expect(edge).toContain('return json({ error: "internal_error", stage: "fatal" }, 500);');
    // Persist failure: fixed stage + reservation code only (released vs reconciliation pending).
    expect(edge).toContain('{ error: "checkout_record_unavailable", stage: "persist", code: "checkout_reservation_unavailable" }');
    expect(edge).toContain('{ error: "checkout_record_unavailable", stage: "persist", code: "checkout_reconciliation_pending" }');

    // Provider messages can contain customer-supplied text or internal details.
    expect(edge).not.toMatch(/detail:\s*(?:stripeErr|e)\b/);
    expect(edge).not.toContain("stripeErr?.message");
    expect(edge).not.toContain("String(stripeErr)");
    expect(edge).not.toContain("e?.message");
    expect(edge).not.toContain("String(e)");
  });

  it("keeps server logs at fixed diagnostic codes, without exception bodies", () => {
    expect(edge).toContain('console.error("[create-activation-checkout] stripe_create_failed");');
    expect(edge).toContain('console.error("[create-activation-checkout] session_persist_failed");');
    expect(edge).toContain('console.error("[create-activation-checkout] fatal");');
    expect(edge).not.toContain("persistError.message");
    expect(edge).not.toMatch(/console\.error\([^\n]*(?:stripeErr|persistError|, e\))/);
  });
});
