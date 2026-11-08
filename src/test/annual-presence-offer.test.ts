import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ANNUAL_PRESENCE_LINE_TYPE, annualPresenceLineItem, decideAnnualPresence, isPreRuleProposal, isPresenceOverlapError, sessionMatchesPresence, verifyCombinedPresenceLine } from "../../supabase/functions/_shared/annualPresence";
import { annualPresenceLines, readPresenceDecision } from "@/lib/pricing/annualPresenceView";
import { ENTRY_350, OFFER_350 } from "@/lib/copy/offer350";
import { homeFin3 } from "@/lib/copy/homeFin3";
import { OFFER } from "../../supabase/functions/_shared/offerCopy";

describe("Présence IA annuelle : décision serveur, achat combiné, aucune double facturation", () => {
  it("Présence valide ou droit historique prouvé : forfait seul", () => {
    expect(decideAnnualPresence({ rpc: { required: false, reason: "valid_annual_presence", valid_until: "2027-06-01T00:00:00Z" }, preRuleProposal: false }))
      .toEqual({ include: false, reason: "valid_annual_presence", validUntil: "2027-06-01T00:00:00Z" });
    expect(decideAnnualPresence({ rpc: { required: false, reason: "historical_subscription" }, preRuleProposal: false })?.include).toBe(false);
    expect(decideAnnualPresence({ rpc: { required: false, reason: "historical_activation" }, preRuleProposal: false })?.include).toBe(false);
  });
  it("aucune Présence valide (nouvelle ou expirée) : ligne 350 $ ajoutée au même paiement", () => {
    expect(decideAnnualPresence({ rpc: { required: true, reason: "annual_presence_required" }, preRuleProposal: false })).toEqual({ include: true, reason: "annual_presence_required", validUntil: null });
    expect(decideAnnualPresence({ rpc: { required: true, reason: "annual_presence_expired" }, preRuleProposal: false })?.reason).toBe("annual_presence_expired");
  });
  it("aucun contournement large : code de plan, activation_status ou raison inconnue ne suffisent pas", () => {
    expect(decideAnnualPresence({ rpc: { required: false, reason: "croissance_v2" }, preRuleProposal: false })).toBeNull();
    expect(decideAnnualPresence({ rpc: "presence", preRuleProposal: false })).toBeNull();
    expect(decideAnnualPresence({ rpc: null, preRuleProposal: false })).toBeNull();
  });
  it("proposition affiliée émise avant la règle : conditions d'origine; après : Présence incluse", () => {
    expect(isPreRuleProposal("2026-10-01T00:00:00Z")).toBe(true);
    expect(isPreRuleProposal("2026-11-10T00:00:00Z")).toBe(false);
    expect(decideAnnualPresence({ rpc: { required: true, reason: "annual_presence_required" }, preRuleProposal: true })?.reason).toBe("existing_promotion");
  });
  it("ligne Présence : ponctuelle, 350 $ CAD, quantité 1, identifiable", () => {
    const li = annualPresenceLineItem();
    expect(li.price_data.unit_amount).toBe(35000);
    expect(li.price_data.currency).toBe("cad");
    expect("recurring" in li.price_data).toBe(false);
    expect(li.price_data.product_data.metadata.type).toBe(ANNUAL_PRESENCE_LINE_TYPE);
  });
  it("session ouverte réutilisée seulement avec la même décision Présence", () => {
    expect(sessionMatchesPresence({ annual_presence: "included" }, true)).toBe(true);
    expect(sessionMatchesPresence({}, true)).toBe(false);
    expect(sessionMatchesPresence({ annual_presence: "included" }, false)).toBe(false);
  });
  it("webhook (fixture synthétique) : seule une ligne 350 $ exacte, non réduite, ouvre le droit", () => {
    const session = { payment_status: "paid", currency: "cad", metadata: { annual_presence: "included", annual_presence_cents: "35000" } };
    const line = (o: Record<string, unknown> = {}) => ({ quantity: 1, amount_subtotal: 35000, amount_discount: 0, currency: "cad", price: { type: "one_time", unit_amount: 35000, product: { metadata: { type: ANNUAL_PRESENCE_LINE_TYPE } } }, ...o });
    const plan = { quantity: 1, amount_subtotal: 50000, price: { type: "recurring", unit_amount: 50000, product: { metadata: {} } } };
    expect(verifyCombinedPresenceLine(session, [plan, line()])).toEqual({ ok: true });
    expect(verifyCombinedPresenceLine(session, [plan])).toEqual({ ok: false, reason: "missing_line" });
    expect(verifyCombinedPresenceLine(session, [line({ amount_discount: 17500 })])).toEqual({ ok: false, reason: "discounted" });
    expect(verifyCombinedPresenceLine(session, [line({ amount_subtotal: 1 })])).toEqual({ ok: false, reason: "amount" });
    expect(verifyCombinedPresenceLine(session, [line({ quantity: 2 })])).toEqual({ ok: false, reason: "quantity" });
    expect(verifyCombinedPresenceLine({ ...session, payment_status: "unpaid" }, [line()])).toEqual({ ok: false, reason: "unpaid" });
    expect(verifyCombinedPresenceLine({ ...session, metadata: {} }, [line()])).toEqual({ ok: false, reason: "not_tagged" });
    expect(isPresenceOverlapError('new row violates: annual_presence_still_valid')).toBe(true);
  });
  it("checkout : décision serveur avant Stripe, ligne ajoutée, aucun refus « payer séparément », indicateur client ignoré", () => {
    const src = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
    const decision = src.indexOf('rpc("annual_presence_decision"');
    const create = src.indexOf("const session = await stripe.checkout.sessions.create(checkoutConfig)");
    expect(decision).toBeGreaterThan(0);
    expect(decision).toBeLessThan(create);
    expect(src).toContain("if (presenceIncluded) lineItems.push(annualPresenceLineItem());");
    expect(src).not.toContain('code: "annual_presence_required"');
    expect(src).not.toMatch(/quoteRow && !includeProfileFee/);
    expect(src).toContain("couponParams.applies_to = { products: [planProduct] }");
  });
  it("webhook : renouvellement après expiration permis, doublon < 12 mois refusé par garde SQL", () => {
    const src = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    expect(src).toContain('.gte("created_at", addCalendarMonths(new Date(), -12).toISOString())');
    expect(src).toContain("verifyCombinedPresenceLine(session");
    expect(src).toContain("isPresenceOverlapError(ledgerErr.message)");
  });
});

describe("plan personnalisé : lignes distinctes et total dû aujourd'hui", () => {
  it("Présence requise : 500 $ + 350 $ → TPS 42,50 $, TVQ 84,79 $, total 977,29 $", () => {
    const v = annualPresenceLines(50000, readPresenceDecision({ required: true, reason: "annual_presence_required" }));
    expect(v.includePresence).toBe(true);
    expect(v.today).toEqual({ gst: 4250, qst: 8479, total: 97729 });
    expect(v.note).toContain("jamais automatique");
  });
  it("Présence valide : forfait seul 574,88 $, date d'échéance réelle", () => {
    const v = annualPresenceLines(50000, readPresenceDecision({ required: false, reason: "valid_annual_presence", valid_until: "2027-06-15T16:00:00Z" }));
    expect(v.includePresence).toBe(false);
    expect(v.today.total).toBe(57488);
    expect(v.note).toContain("15 juin 2027");
  });
  it("décision inconnue (non connecté) : rien n'est présumé payé ni facturé à l'affichage", () => {
    const v = annualPresenceLines(50000, readPresenceDecision(undefined));
    expect(v.includePresence).toBe(false);
    expect(v.note).toContain("UNPRO le vérifie avant le paiement");
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
