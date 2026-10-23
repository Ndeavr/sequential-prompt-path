// Entry 350 one-time promo (Stripe-native coupon + promotion code). Pure + SDK-injected,
// unit-tested in vitest. The full-price contract (qc-exclusive-v1) is NOT touched here.
import { QUEBEC_TAX_DEFS } from "./entry350Tax.ts";

export const ENTRY350_PROMO_TAX_CONTRACT = "qc-exclusive-promo349-v1";
export const ENTRY350_PROMO_CODE = "PROMO";
/** Coupon metadata marker an admin sets in Stripe; no endpoint creates/resets it. */
export const ENTRY350_PROMO_COUPON_MARKER = "entry_activation_350_promo349";
// 350,00 $ − 349,00 $ = 1,00 $ taxable; TPS 5 ¢; TVQ 9,975 ¢ → 10 ¢ (Stripe half-up); total 1,15 $.
export const ENTRY350_PROMO_AMOUNTS = { subtotal: 35000, discount: 34900, net: 100, gst: 5, qst: 10, tax: 15, total: 115 } as const;

export type PromoRefusal = "promo_invalid" | "promo_used" | "promo_unavailable";

export function normalizePromoInput(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toUpperCase();
  return v.length > 0 && v.length <= 40 ? v : null;
}

const idOf = (v: any): string | null => typeof v === "string" ? v : (v && typeof v.id === "string" ? v.id : null);
const couponOf = (pc: any) => pc?.coupon ?? pc?.promotion?.coupon ?? null;

/** Every condition must hold or the code is refused (fail closed). */
export function promotionCodeRefusal(pc: any, coupon: any, live: boolean, nowSec = Math.floor(Date.now() / 1000)): PromoRefusal | null {
  if (!pc || !coupon) return "promo_unavailable";
  if (pc.livemode !== live || coupon.livemode !== live) return "promo_unavailable";
  if (String(pc.code ?? "").toUpperCase() !== ENTRY350_PROMO_CODE) return "promo_invalid";
  if (pc.max_redemptions !== 1 || (pc.times_redeemed ?? 0) >= 1) return "promo_used";
  if (pc.active !== true || coupon.valid !== true) return "promo_used";
  if (pc.expires_at && pc.expires_at <= nowSec) return "promo_used";
  if (pc.customer || pc.restrictions?.first_time_transaction || pc.restrictions?.minimum_amount) return "promo_unavailable";
  if (coupon.metadata?.unpro_offer !== ENTRY350_PROMO_COUPON_MARKER) return "promo_unavailable";
  if (coupon.amount_off !== ENTRY350_PROMO_AMOUNTS.discount || coupon.currency !== "cad" || coupon.percent_off) return "promo_unavailable";
  if (coupon.duration !== "once") return "promo_unavailable";
  if (coupon.max_redemptions != null && (coupon.max_redemptions !== 1 || (coupon.times_redeemed ?? 0) >= 1)) return "promo_used";
  const products = coupon.applies_to?.products;
  if (!Array.isArray(products) || products.length !== 1 || typeof products[0] !== "string") return "promo_unavailable";
  return null;
}

/** Server resolves the code against Stripe with the mode-matched key. Never trusts the client. */
export async function resolveEntry350Promo(stripe: any, input: unknown, live: boolean):
  Promise<{ ok: true; promotionCodeId: string; couponId: string; productId: string } | { ok: false; code: PromoRefusal }> {
  if (normalizePromoInput(input) !== ENTRY350_PROMO_CODE) return { ok: false, code: "promo_invalid" };
  let list;
  try { list = await stripe.promotionCodes.list({ code: ENTRY350_PROMO_CODE, limit: 10, expand: ["data.coupon"] }); }
  catch { return { ok: false, code: "promo_unavailable" }; }
  const candidates = (list?.data ?? []).filter((pc: any) => couponOf(pc)?.metadata?.unpro_offer === ENTRY350_PROMO_COUPON_MARKER);
  if (candidates.length !== 1) return { ok: false, code: candidates.length ? "promo_unavailable" : "promo_invalid" };
  const pc = candidates[0];
  let coupon = couponOf(pc);
  if (typeof coupon === "string") { try { coupon = await stripe.coupons.retrieve(coupon); } catch { return { ok: false, code: "promo_unavailable" }; } }
  const refusal = promotionCodeRefusal(pc, coupon, live);
  if (refusal) return { ok: false, code: refusal };
  return { ok: true, promotionCodeId: pc.id, couponId: coupon.id, productId: coupon.applies_to.products[0] };
}

/** Preliminary signed-event check for the promo contract only. */
export function entry350PromoAmountsOk(s: any): boolean {
  return s.mode === "payment" && s.currency === "cad" && s.amount_subtotal === ENTRY350_PROMO_AMOUNTS.subtotal &&
    s.amount_total === ENTRY350_PROMO_AMOUNTS.total && s.total_details?.amount_tax === ENTRY350_PROMO_AMOUNTS.tax &&
    s.total_details?.amount_discount === ENTRY350_PROMO_AMOUNTS.discount &&
    typeof s.metadata?.promo_code_id === "string" && typeof s.metadata?.promo_coupon_id === "string";
}

/** Independently retrieve session, line and the actual Stripe promo before any right is granted. */
export async function verifyEntry350PromoContract(stripe: any, signed: any, live: boolean, replay: boolean) {
  if (replay || signed.metadata?.entry_tax_contract !== ENTRY350_PROMO_TAX_CONTRACT) throw new Error("entry_promo_contract_unverified");
  const session = await stripe.checkout.sessions.retrieve(signed.id);
  const md = session.metadata ?? {};
  if (session.id !== signed.id || session.livemode !== live || md.entry_tax_contract !== ENTRY350_PROMO_TAX_CONTRACT ||
      md.offer !== "entry_activation_350" || md.promo_code_id !== signed.metadata?.promo_code_id ||
      md.promo_coupon_id !== signed.metadata?.promo_coupon_id || session.payment_status !== "paid" ||
      !entry350PromoAmountsOk(session) || session.automatic_tax?.enabled === true) throw new Error("entry_promo_session_mismatch");
  const discounts = session.discounts ?? [];
  if (discounts.length !== 1 || idOf(discounts[0].promotion_code) !== md.promo_code_id ||
      (discounts[0].coupon && idOf(discounts[0].coupon) !== md.promo_coupon_id)) throw new Error("entry_promo_discount_mismatch");
  const pc = await stripe.promotionCodes.retrieve(md.promo_code_id, { expand: ["coupon"] });
  let coupon = couponOf(pc);
  if (typeof coupon === "string") coupon = await stripe.coupons.retrieve(coupon);
  if (!pc || pc.livemode !== live || String(pc.code).toUpperCase() !== ENTRY350_PROMO_CODE || pc.max_redemptions !== 1 ||
      idOf(coupon) !== md.promo_coupon_id || coupon.metadata?.unpro_offer !== ENTRY350_PROMO_COUPON_MARKER ||
      coupon.amount_off !== ENTRY350_PROMO_AMOUNTS.discount || coupon.currency !== "cad" || coupon.duration !== "once" ||
      coupon.applies_to?.products?.length !== 1) throw new Error("entry_promo_coupon_mismatch");
  const lines = await stripe.checkout.sessions.listLineItems(signed.id, { limit: 100 });
  const line = lines.data?.[0];
  if (lines.has_more || lines.data?.length !== 1 || line.quantity !== 1 || line.currency !== "cad" ||
      line.amount_subtotal !== ENTRY350_PROMO_AMOUNTS.subtotal || line.amount_discount !== ENTRY350_PROMO_AMOUNTS.discount ||
      line.amount_tax !== ENTRY350_PROMO_AMOUNTS.tax || line.amount_total !== ENTRY350_PROMO_AMOUNTS.total ||
      idOf(line.price?.product) !== coupon.applies_to.products[0] || line.taxes?.length !== 2) throw new Error("entry_promo_lines_mismatch");
  for (const [index, def] of QUEBEC_TAX_DEFS.entries()) {
    const t = line.taxes.filter((x: any) => x.rate?.metadata?.unpro_tax === def.key);
    if (t.length !== 1 || t[0].rate.inclusive !== false || t[0].rate.percentage !== def.percentage ||
        t[0].amount !== (index === 0 ? ENTRY350_PROMO_AMOUNTS.gst : ENTRY350_PROMO_AMOUNTS.qst)) throw new Error("entry_promo_tax_mismatch");
  }
  return session;
}
