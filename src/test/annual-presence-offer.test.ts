import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { decideAnnualPresence } from "../../supabase/functions/_shared/annualPresence";
import { ENTRY_350, OFFER_350 } from "@/lib/copy/offer350";
import { homeFin3 } from "@/lib/copy/homeFin3";
import { OFFER } from "../../supabase/functions/_shared/offerCopy";

describe("Présence IA annuelle : droits serveur, aucune double facturation", () => {
  it("Présence valide (paiement 350 $ LIVE < 12 mois) : forfait seul", () =>
    expect(decideAnnualPresence({ planCode: "presence", activationStatus: null, hasValidatedPromotion: false })).toEqual({ required: false, reason: "valid_annual_presence" }));
  it("nouvel entrepreneur sans droit : Présence IA requise d'abord", () =>
    expect(decideAnnualPresence({ planCode: null, activationStatus: "not_started", hasValidatedPromotion: false })).toEqual({ required: true, reason: "annual_presence_required" }));
  it("droits historiques et promotions préservés (aucune conversion en paiement annuel)", () => {
    expect(decideAnnualPresence({ planCode: "croissance_v2", activationStatus: null, hasValidatedPromotion: false }).required).toBe(false);
    expect(decideAnnualPresence({ planCode: null, activationStatus: "activated", hasValidatedPromotion: false }).reason).toBe("historical_activation");
    expect(decideAnnualPresence({ planCode: null, activationStatus: null, hasValidatedPromotion: true }).reason).toBe("existing_promotion");
  });
  it("le paiement de forfait applique la décision serveur avant toute session Stripe", () => {
    const src = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
    const gate = src.indexOf('code: "annual_presence_required"');
    expect(gate).toBeGreaterThan(0);
    expect(src.indexOf('rpc("contractor_plan_code"')).toBeLessThan(gate);
    expect(gate).toBeLessThan(src.indexOf("const session = await stripe.checkout.sessions.create(checkoutConfig)"));
  });
});

describe("formulation commerciale : 350 $ + taxes PAR ANNÉE", () => {
  it("FR/EN et miroir serveur : par année, 12 mois, aucun « paiement unique »", () => {
    const all = JSON.stringify([OFFER_350, ENTRY_350, homeFin3.en.entrepreneurs.note, OFFER.payment_note]);
    expect(all).not.toMatch(/Paiement unique|une seule fois|one-time|Aucun abonnement/i);
    expect(ENTRY_350.paymentNote).toContain("par année");
    expect(ENTRY_350.paymentNote).toContain("402,41 $");
    expect(OFFER.payment_note).toContain("par année");
    expect(homeFin3.en.entrepreneurs.note).toContain("per year");
  });
  it("carte de repli : textes approuvés", () => {
    expect(ENTRY_350.fallback.title).toBe("Pas encore prêt pour un forfait de rendez-vous? Commencez par votre Présence IA.");
    expect(ENTRY_350.fallback.cta).toBe("Commencer ma Présence IA — 350 $/an");
    expect(ENTRY_350.fallback.body).toBe("Commencez à bâtir votre présence dès aujourd’hui. Un profil complet, tenu à jour, aide UNPRO à comprendre votre entreprise et à vous présenter pour les projets adaptés. Ajoutez des rendez-vous lorsque vous êtes prêt.");
  });
});
