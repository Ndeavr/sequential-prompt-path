// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Source-level regression gate only: this is not proof of a settled Stripe payment,
// entitlement, live deployment, or a completed Google Calendar OAuth exchange.
const page = readFileSync("src/pages/checkout/PageActivationStart.tsx", "utf8");
const router = readFileSync("src/app/router.tsx", "utf8");

describe("P0: public /activation/start must never invent activation success", () => {
  it("keeps the public route from claiming an unverified payment or appointments", () => {
    expect(router).toContain('<Route path="/activation/start"');
    expect(router).toContain("<PageActivationStart />");
    expect(page).toContain("Activation à vérifier");
    expect(page).toContain("Cette page ne certifie pas le paiement");
    expect(page).toContain("Les droits de 12 mois nécessitent une confirmation serveur");
    for (const falseClaim of [
      "Plan activé",
      "Paiement reçu",
      "Rendez-vous qualifiés prêts",
      "Synchronisation active",
    ]) {
      expect(page).not.toContain(falseClaim);
    }
  });

  it("does not simulate Calendar OAuth or grant appointment readiness", () => {
    expect(page).not.toMatch(/setTimeout|setCalendarConnected|calendarConnected|setSteps|allDone/);
    expect(page).toContain("La connexion Google Calendar ne s'effectue pas sur cette page");
    expect(page).toContain("navigate(\"/pro\")");
    expect(page).toContain("Elle n'inclut ni ne garantit de rendez-vous");
  });
});
