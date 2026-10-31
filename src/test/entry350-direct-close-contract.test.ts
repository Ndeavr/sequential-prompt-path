import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const links = readFileSync("src/lib/activation350Links.ts", "utf8");
const page = readFileSync("src/pages/entrepreneur/PageActivation350.tsx", "utf8");
const fast = readFileSync("src/components/entrepreneur/Entry350FastCheckout.tsx", "utf8");
const payment = readFileSync("src/pages/entrepreneur/activation/ScreenPayment.tsx", "utf8");
const close = readFileSync("src/services/clara/claraActivationClose.ts", "utf8");
const edge = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");

describe("Clara entry350 quote-free handoff", () => {
  it("does not log Stripe Checkout session IDs in the browser", () => {
    expect(payment).not.toMatch(/console\.(?:log|info|warn|error|debug)\s*\(/);
    expect(payment).toContain("await updateFunnel({ stripe_session_id: data.session_id });");
  });
  it("prevents legacy founder checkout bypass of authenticated $350 activation", () => {
    expect(payment).not.toContain('create-founder-activation-checkout');
    expect(payment).toContain('const declaredName = state.business_name.trim();');
    expect(payment).toContain('sessionStorage.setItem("unpro_entry350_declared_name", declaredName)');
    expect(payment).toContain('navigate(claraActivationLinks(window.location.search).activate)');
    expect(close).toContain('const stored = getStoredAttribution()');
    expect(close).toContain('if (!params.has("ref") && stored?.refCode) params.set("ref", stored.refCode)');
    expect(payment).toContain('Continuer vers le paiement sécurisé');
  });
  it("routes the base activation to its existing landing instead of monthly intake", () => {
    expect(links).toContain("activate: `/entrepreneurs/activation-350?");
    expect(links).toContain('activate.set("activate", "1")');
    expect(links).toContain("more: `/entrepreneur/devis-personnalise?");
    expect(page).toContain("reviewOpen && <Entry350FastCheckout query={sp}");
  });
  it("preserves declared business identity through auth, never calculates monthly capacity", () => {
    expect(fast).toContain("getClaraQualification().business_name");
    expect(fast).toContain("contractorLoginPath(");
    expect(fast).toContain("entryActivation: true");
    expect(fast).toContain("declaredCompanyName: name");
    expect(fast).not.toContain("computePricingQuote");
    expect(fast).not.toContain("target_monthly_appointments");
    expect(fast).toContain("402,41 $");
  });
  it("retains buyer and Stripe attempt for manual recovery without marking paid", () => {
    expect(edge).toContain('"entry_350_checkout_attempted"');
    expect(edge).toContain('"entry_350_checkout_failed"');
    expect(edge).toContain('"checkout_recovery_available"');
    expect(edge).toContain('stripe_checkout_session_id: fbSession.id');
    expect(edge).toContain('snapshotError.code !== "23505"');
    expect(edge).toContain('user_id: userId');
    expect(edge).toContain('email: userEmail');
    expect(fast).toContain('Demander assistance pour mon activation');
    expect(fast).toContain('Vos informations d\'inscription sont conservées');
    // There is no client-side paid mutation or fake success.
    expect(fast).not.toContain('payment_status: "paid"');
    expect(fast).not.toContain('activation_status: "active"');
  });

  it("keeps all payment authority server-side and refuses false success claims", () => {
    expect(edge).toContain("const isEntryActivation = entryActivation === true");
    expect(edge).toContain("const entryDeclaredName");
    expect(edge).toContain('code: "business_name_required"');
    expect(edge).not.toContain("entry350_live_not_released");
    expect(edge).toContain("idempotencyKey:");
    expect(fast).toContain('reply?.code === "payment_received_pending"');
    expect(fast).toContain("Ce retour ne prouve pas le paiement");
  });
});
