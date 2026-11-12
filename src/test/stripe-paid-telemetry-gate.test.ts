import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const webhook = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");

describe("Stripe paid telemetry gate (source-level regression, not E2E)", () => {
  it("never treats checkout.session.completed with an unpaid payment as success", () => {
    const start = webhook.indexOf("// Founder / activation flow observability.");
    const end = webhook.indexOf("if (session.subscription)", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const paidTelemetry = webhook.slice(start, end);
    expect(paidTelemetry).toMatch(
      /if \(session\.payment_status === "paid"\) \{\s*await logActivationStep\(supabase, "stripe_payment_succeeded"/,
    );
    expect(paidTelemetry).not.toContain('session.status === "complete"');
    expect(paidTelemetry).toContain("stripe_session_id: session.id");
  });
});
