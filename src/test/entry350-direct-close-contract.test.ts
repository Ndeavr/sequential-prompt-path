import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const links = readFileSync("src/lib/activation350Links.ts", "utf8");
const page = readFileSync("src/pages/entrepreneur/PageActivation350.tsx", "utf8");
const fast = readFileSync("src/components/entrepreneur/Entry350FastCheckout.tsx", "utf8");
const edge = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");

describe("Clara entry350 quote-free handoff", () => {
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
