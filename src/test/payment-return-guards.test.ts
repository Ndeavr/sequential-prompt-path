import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { returnConfirmationMode, sessionMismatch, isValidCheckoutSessionId, shouldSkipRedelivery, isSessionPaid } from "../../supabase/functions/_shared/checkoutGuards";
import { planReturnUrl } from "@/lib/billing/reconcileQuotePayment";

const ok = { livemode: false, mode: "payment", currency: "cad", amount_subtotal: 35000, metadata: { quote_id: "q1", user_id: "u1", offer: "entry_activation_350" } };
const ctx = { quoteId: "q1", userId: "u1", testKey: true };

describe("retour Stripe sans session", () => {
  it("accès direct / sans paramètre : aucune confirmation", () => {
    expect(returnConfirmationMode("")).toBe("none");
    expect(returnConfirmationMode("?utm_source=sms")).toBe("none");
  });
  it("faux succès sans session_id ou avec un id inventé : invalide, jamais d'attente", () => {
    expect(returnConfirmationMode("?checkout=success")).toBe("invalid");
    expect(returnConfirmationMode("?checkout=success&session_id={CHECKOUT_SESSION_ID}")).toBe("invalid");
    expect(returnConfirmationMode("?checkout=success&session_id=paid")).toBe("invalid");
    expect(isValidCheckoutSessionId("cs_test_a1b2c3d4e5f6")).toBe(true);
    expect(returnConfirmationMode("?checkout=success&session_id=cs_test_a1b2c3d4e5f6")).toBe("confirm");
  });
  it("annulation reconnue", () => {
    expect(returnConfirmationMode("?checkout=canceled")).toBe("canceled");
  });
  it("URL de retour porte le vrai identifiant Stripe et efface un ancien", () => {
    const u = planReturnUrl("https://unpro.ca", "q1", "?ref=A&checkout=success&session_id=cs_test_old123456789", "success");
    expect(u).toMatch(/&session_id=\{CHECKOUT_SESSION_ID\}$/);
    expect(u).not.toContain("cs_test_old");
    expect(planReturnUrl("https://unpro.ca", "q1", "?ref=A", "canceled")).not.toContain("session_id");
  });
});

describe("session Stripe authentique pour le bon devis", () => {
  it("accepte 350 $ CAD paiement unique en test", () => expect(sessionMismatch(ok, ctx)).toBeNull());
  it("refuse autre devis, autre compte, test/live mélangés", () => {
    expect(sessionMismatch({ ...ok, metadata: { ...ok.metadata, quote_id: "q2" } }, ctx)).toBe("quote_mismatch");
    expect(sessionMismatch({ ...ok, metadata: { ...ok.metadata, user_id: "u2" } }, ctx)).toBe("user_mismatch");
    expect(sessionMismatch({ ...ok, livemode: true }, ctx)).toBe("livemode_mismatch");
    expect(sessionMismatch(ok, { ...ctx, testKey: false })).toBe("livemode_mismatch");
  });
  it("refuse mauvais montant, devise ou abonnement", () => {
    expect(sessionMismatch({ ...ok, amount_subtotal: 0 }, ctx)).toBe("amount_mismatch");
    expect(sessionMismatch({ ...ok, amount_subtotal: 3500 }, ctx)).toBe("amount_mismatch");
    expect(sessionMismatch({ ...ok, currency: "usd" }, ctx)).toBe("currency_mismatch");
    expect(sessionMismatch({ ...ok, mode: "subscription" }, ctx)).toBe("mode_mismatch");
  });
  it("non payé / expiré ne confirme rien; webhook doublé ignoré", () => {
    expect(isSessionPaid({ payment_status: "unpaid", status: "expired" })).toBe(false);
    expect(isSessionPaid({ payment_status: "unpaid", status: "open" })).toBe(false);
    expect(shouldSkipRedelivery({ processing_status: "processed" })).toBe(true);
  });
});

describe("câblage", () => {
  const plan = readFileSync("src/pages/contractor-funnel/PageContractorPersonalizedPlan.tsx", "utf8");
  const entry = readFileSync("src/pages/contractor-funnel/PageContractorPlanEntry.tsx", "utf8");
  const co = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
  it("page : corrélation serveur sans session, déjà activé TEST/LIVE, attente bornée", () => {
    expect(plan).toContain("Paiement introuvable pour ce lien");
    expect(plan).toContain('const sid = confirmMode === "confirm" ? stripeSessionId : null;');
    expect(plan).not.toContain("Rien n'a été facturé");
    expect(plan).toContain("Paiement TEST confirmé");
    expect(plan).toContain("Votre profil est déjà activé.");
    expect(co).toContain('status: dup ? "duplicate_payment" : "already_active"');
    expect(co).toContain('payload->data->object->metadata->>user_id');
    expect(plan).toContain("i < 20");
    expect(plan).toContain("La page de paiement a expiré");
  });
  it("entrée plan ne transporte jamais un ancien retour Stripe", () => {
    expect(entry).toContain('carry.delete("checkout")');
    expect(entry).toContain('carry.delete("session_id")');
  });
  it("serveur valide la session fournie avant toute réconciliation", () => {
    expect(co).toContain("isValidCheckoutSessionId(v)");
    expect(co).toContain("sessionMismatch(sess as never");
  });
});
