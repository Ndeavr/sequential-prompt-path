import { describe, it, expect } from "vitest";
import { entry350PaymentBlockReason, entry350CommissionArgs } from "../../supabase/functions/_shared/checkoutGuards";
import {
  ENTRY350_PROMO_TAX_CONTRACT, ENTRY350_PROMO_COUPON_MARKER, resolveEntry350Promo, verifyEntry350PromoContract,
} from "../../supabase/functions/_shared/entry350Promo";

const coupon = (o: Record<string, unknown> = {}) => ({ id: "co_1", livemode: false, valid: true, amount_off: 34900, currency: "cad",
  duration: "once", max_redemptions: 1, times_redeemed: 0, applies_to: { products: ["prod_entry"] }, metadata: { unpro_offer: ENTRY350_PROMO_COUPON_MARKER }, ...o });
const pc = (o: Record<string, unknown> = {}, c = coupon()) => ({ id: "promo_1", code: "PROMO", livemode: false, active: true, max_redemptions: 1, times_redeemed: 0, coupon: c, restrictions: {}, ...o });
const stripeWith = (codes: unknown[]) => ({ promotionCodes: { list: async () => ({ data: codes }) } });
const md = { offer: "entry_activation_350", entry_tax_contract: ENTRY350_PROMO_TAX_CONTRACT, promo_code_id: "promo_1", promo_coupon_id: "co_1", contractor_id: "c1" };
const paidSession = (o: Record<string, unknown> = {}) => ({ id: "cs_test_x", livemode: false, mode: "payment", currency: "cad", payment_status: "paid",
  amount_subtotal: 35000, amount_total: 115, total_details: { amount_tax: 15, amount_discount: 34900 }, metadata: md,
  discounts: [{ promotion_code: "promo_1", coupon: "co_1" }], ...o });
const line = { quantity: 1, currency: "cad", amount_subtotal: 35000, amount_discount: 34900, amount_tax: 15, amount_total: 115, price: { product: "prod_entry" },
  taxes: [{ amount: 5, rate: { inclusive: false, percentage: 5, metadata: { unpro_tax: "gst_5" } } }, { amount: 10, rate: { inclusive: false, percentage: 9.975, metadata: { unpro_tax: "qst_9975" } } }] };
const fakeStripe = (session: unknown, lines: unknown[] = [line], promo = pc()) => ({
  checkout: { sessions: { retrieve: async () => session, listLineItems: async () => ({ has_more: false, data: lines }) } },
  promotionCodes: { retrieve: async () => promo }, coupons: { retrieve: async () => coupon() },
});

describe("PROMO 349 $ — entrée 350 $", () => {
  it("le prix normal reste exactement 350 $ / 402,41 $ sans rabais", () => {
    const full = { mode: "payment", currency: "cad", payment_status: "paid", amount_subtotal: 35000, amount_total: 40241, total_details: { amount_tax: 5241 }, metadata: { entry_tax_contract: "qc-exclusive-v1" } };
    expect(entry350PaymentBlockReason(full)).toBeNull();
    // Un total de 1,15 $ sous le contrat plein prix est toujours refusé.
    expect(entry350PaymentBlockReason({ ...full, amount_total: 115, total_details: { amount_tax: 15 } })).toBe("ignored_amount_mismatch");
  });

  it("refuse code invalide, déjà utilisé, mauvais montant ou sans restriction produit", async () => {
    expect(await resolveEntry350Promo(stripeWith([pc()]), "nope", false)).toEqual({ ok: false, code: "promo_invalid" });
    expect(await resolveEntry350Promo(stripeWith([pc({ times_redeemed: 1 })]), "promo", false)).toEqual({ ok: false, code: "promo_used" });
    expect(await resolveEntry350Promo(stripeWith([pc({ active: false })]), "PROMO", false)).toEqual({ ok: false, code: "promo_used" });
    expect(await resolveEntry350Promo(stripeWith([pc({}, coupon({ amount_off: 35000 }))]), "PROMO", false)).toEqual({ ok: false, code: "promo_unavailable" });
    expect(await resolveEntry350Promo(stripeWith([pc({}, coupon({ applies_to: undefined }))]), "PROMO", false)).toEqual({ ok: false, code: "promo_unavailable" });
    expect(await resolveEntry350Promo(stripeWith([pc({ max_redemptions: null })]), "PROMO", false)).toEqual({ ok: false, code: "promo_used" });
    expect(await resolveEntry350Promo(stripeWith([pc()]), "PROMO", true)).toEqual({ ok: false, code: "promo_unavailable" }); // TEST objet ≠ LIVE
    expect(await resolveEntry350Promo(stripeWith([]), "PROMO", false)).toEqual({ ok: false, code: "promo_invalid" });
    expect(await resolveEntry350Promo(stripeWith([pc()]), " promo ", false)).toEqual({ ok: true, promotionCodeId: "promo_1", couponId: "co_1", productId: "prod_entry" });
  });

  it("rabais exact : 350 − 349 = 1 $, TPS 0,05 $, TVQ 0,10 $, total 1,15 $", async () => {
    expect(entry350PaymentBlockReason(paidSession())).toBeNull();
    expect(entry350PaymentBlockReason(paidSession({ amount_total: 100 }))).toBe("ignored_amount_mismatch");
    expect(entry350PaymentBlockReason(paidSession({ amount_total: 0, total_details: { amount_tax: 0, amount_discount: 35000 } }))).toBe("ignored_amount_mismatch");
    const ok = await verifyEntry350PromoContract(fakeStripe(paidSession()), paidSession(), false, false);
    expect(ok.amount_total).toBe(115);
    await expect(verifyEntry350PromoContract(fakeStripe(paidSession()), paidSession(), false, false).then(() => "ok")).resolves.toBe("ok");
    await expect(verifyEntry350PromoContract(fakeStripe(paidSession(), [{ ...line, amount_tax: 14, amount_total: 114 }]), paidSession(), false, false)).rejects.toThrow();
    await expect(verifyEntry350PromoContract(fakeStripe(paidSession(), [{ ...line, price: { product: "prod_monthly" } }]), paidSession(), false, false)).rejects.toThrow();
  });

  it("webhook : non payé, rejoué, mode croisé ou deuxième rabais n'activent rien", async () => {
    expect(entry350PaymentBlockReason(paidSession({ payment_status: "unpaid" }))).toBe("ignored_unpaid");
    await expect(verifyEntry350PromoContract(fakeStripe(paidSession()), paidSession(), false, true)).rejects.toThrow(); // replay
    await expect(verifyEntry350PromoContract(fakeStripe(paidSession()), paidSession(), true, false)).rejects.toThrow(); // TEST session sur événement LIVE
    const twoDiscounts = paidSession({ discounts: [{ promotion_code: "promo_1" }, { promotion_code: "promo_2" }] });
    await expect(verifyEntry350PromoContract(fakeStripe(twoDiscounts), twoDiscounts, false, false)).rejects.toThrow();
    const forged = paidSession();
    await expect(verifyEntry350PromoContract(fakeStripe(forged, [line], pc({}, coupon({ amount_off: 30000 }))), forged, false, false)).rejects.toThrow();
  });

  it("aucune commission affiliée calculée sur un faux 350 $ pour une vente PROMO", () => {
    const session = paidSession({ metadata: { ...md, ref: "LORRAINE-UNPRO", affiliate_id: "00000000-0000-0000-0000-000000000001" } });
    expect(entry350CommissionArgs({ livemode: true, decision: "activate", session, contractorId: "c1" })).toBeNull();
  });
});
