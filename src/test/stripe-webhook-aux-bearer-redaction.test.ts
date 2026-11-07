// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Source-contract check only. Hosted RLS, retention and authenticated Stripe
// replay remain separate release gates: this test does not claim E2E safety.
const webhook = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");

describe("Stripe webhook auxiliary metadata bearer minimization", () => {
  it("preserves useful attribution without duplicating activation/landing bearer tokens", () => {
    const start = webhook.indexOf("const aiAttribution = {");
    const end = webhook.indexOf("};", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const attribution = webhook.slice(start, end);
    expect(attribution).toContain("agent_run_id:");
    expect(attribution).toContain("campaign_id:");
    expect(attribution).not.toMatch(/(?:activation|landing)_token\s*:/);
  });

  it("still resolves SMS token for identity, without copying it into the auxiliary ledger/status metadata or logs", () => {
    expect(webhook).toContain('.eq("landing_token", landingToken)');
    const start = webhook.indexOf("// Step 5 — ledger (best-effort)");
    const end = webhook.indexOf("// Step 6 — trigger match recomputation", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(webhook.slice(start, end)).not.toContain("landing_token: landingToken");
    expect(webhook).not.toContain('console.error("[stripe-webhook] sms_outreach prospect not found", landingToken)');
    expect(webhook).toContain('console.error("[stripe-webhook] sms_outreach prospect not found", session.id)');
  });

  it("does not modify signed event replay provenance or paid-only ledger gate", () => {
    expect(webhook).toContain("payload: event as any");
    expect(webhook).toContain('action: "entry_activation_350_paid"');
    expect(webhook).toContain('event.livemode === true');
  });
});
