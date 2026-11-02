// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hook = readFileSync("src/hooks/useFirstDollarFunnel.ts", "utf8");
const page = readFileSync("src/pages/admin/PageAdminFirstDollar.tsx", "utf8");

describe("First Dollar diagnostic: no false paid $350 claims", () => {
  it("never converts legacy CRM paid/activated lead statuses into payment totals", () => {
    expect(hook).not.toContain("passPaid");
    expect(hook).not.toContain("lead_status");
    expect(hook).toContain('counts.payment_success = cnt("payment_succeeded") + cnt("payment_success")');
    expect(hook).toContain("Historical diagnostic event counts only");
  });

  it("labels payment and activation counters as unverified raw events", () => {
    expect(hook).toContain('label: "Signal paiement · non vérifié"');
    expect(hook).toContain('label: "Signal activation · non vérifié"');
    expect(page).toContain("Signal brut, non dédupliqué");
  });

  it("does not present application telemetry as a successful Stripe webhook or sale", () => {
    expect(page).not.toContain("🎉 Objectif atteint");
    expect(page).not.toContain("1 paiement 1 $");
    expect(page).not.toContain("payment_success\",\"payment_success");
    expect(page).toContain("Paiements 350 $ vérifiés : indéterminés");
    expect(page).toContain("Stripe LIVE");
    expect(page).toContain("webhook");
    expect(page).toContain("12 mois");
  });
});
