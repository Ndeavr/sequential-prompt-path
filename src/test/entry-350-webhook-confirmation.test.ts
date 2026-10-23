import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { entryActivationDecision, webhookConfirmationFailed, shouldSkipRedelivery } from "../../supabase/functions/_shared/checkoutGuards";

const base = { livemode: true, isQaAccount: false, sessionAlreadyInLedger: false, activatedByOtherSession: false };

describe("350 $ — idempotence", () => {
  it("une session déjà inscrite n'active jamais deux fois", () => {
    expect(entryActivationDecision({ ...base, sessionAlreadyInLedger: true })).toBe("already_processed");
    expect(entryActivationDecision({ ...base, livemode: false, isQaAccount: true, sessionAlreadyInLedger: true })).toBe("already_processed");
  });
  it("deuxième session payée pour la même fiche = double paiement, aucune activation", () => {
    expect(entryActivationDecision({ ...base, activatedByOtherSession: true })).toBe("duplicate_payment");
  });
  it("relivraison : traité = ignoré; bloqué > 5 min = retraité", () => {
    const now = Date.parse("2026-10-12T16:30:00Z");
    expect(shouldSkipRedelivery({ processing_status: "processed" }, now)).toBe(true);
    expect(shouldSkipRedelivery({ processing_status: "processing", received_at: "2026-10-12T16:12:03Z" }, now)).toBe(false);
    expect(shouldSkipRedelivery({ processing_status: "failed" }, now)).toBe(false);
  });
});

describe("350 $ — séparation TEST/LIVE", () => {
  it("événement TEST sur un compte non QA : aucune activation", () => {
    expect(entryActivationDecision({ ...base, livemode: false })).toBe("test_on_non_qa");
    expect(entryActivationDecision({ ...base, livemode: null })).toBe("test_on_non_qa");
  });
  it("événement TEST sur compte QA marqué : activation de test seulement", () => {
    expect(entryActivationDecision({ ...base, livemode: false, isQaAccount: true })).toBe("activate");
  });
  it("événement LIVE : activation", () => {
    expect(entryActivationDecision(base)).toBe("activate");
  });
});

describe("page de retour — sortie de l'attente", () => {
  const now = Date.parse("2026-10-12T16:30:00Z");
  it("échec ou blocage du webhook = problème de confirmation explicite", () => {
    expect(webhookConfirmationFailed({ processing_status: "failed" }, now)).toBe(true);
    expect(webhookConfirmationFailed({ processing_status: "processing", received_at: "2026-10-12T16:12:03Z" }, now)).toBe(true);
    expect(webhookConfirmationFailed({ processing_status: "processing", received_at: "2026-10-12T16:29:00Z" }, now)).toBe(false);
    expect(webhookConfirmationFailed({ processing_status: "processed" }, now)).toBe(false);
  });
});

describe("câblage", () => {
  const wh = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
  const co = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
  const plan = readFileSync("src/pages/contractor-funnel/PageContractorPersonalizedPlan.tsx", "utf8");
  const mig = readFileSync("drizzle/migrations/0014_entry_activation_350_ledger_action.sql", "utf8");
  it("contrainte du registre accepte l'action + index unique par session", () => {
    expect(mig).toContain("'entry_activation_350_paid'");
    expect(mig).toMatch(/UNIQUE INDEX[\s\S]*stripe_session_id[\s\S]*entry_activation_350_paid/);
  });
  it("le bloc d'erreur réutilise le corps déjà lu (plus d'échec silencieux)", () => {
    expect(wh).not.toContain("req.clone().text()");
    expect(wh).toContain("rawBody = body;");
    expect(wh).toContain('processing_status: "failed"');
  });
  it("le rôle entrepreneur n'est donné qu'après l'inscription au registre", () => {
    const i = wh.indexOf('decision === "activate"');
    const ledger = wh.indexOf('action: "entry_activation_350_paid"', i);
    const role = wh.indexOf('role: "contractor"', i);
    expect(i).toBeGreaterThan(0);
    expect(ledger).toBeLessThan(role);
  });
  it("un paiement TEST n'alimente jamais le pipeline commercial", () => {
    const i = wh.indexOf('decision === "activate"');
    const branch = wh.slice(i, i + 9000);
    expect(branch).toMatch(/if \(event\.livemode === true\) \{\s*await supabase\.from\("contractor_leads"\)/);
  });
  it("aucune deuxième facturation si Stripe a déjà reçu le paiement", () => {
    expect(co).toContain('code: "payment_received_pending"');
    expect(co).toContain('status: "confirmation_failed"');
  });
  it("page : état d'échec explicite, sans inviter à repayer", () => {
    expect(plan).toContain('if (st === "confirmation_failed") return done("confirmation_failed");');
    expect(plan).toContain("Ne payez pas une deuxième fois.");
    expect(plan).toContain("Problème de confirmation");
  });
});
