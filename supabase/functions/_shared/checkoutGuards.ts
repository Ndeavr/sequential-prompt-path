// Pure guards shared by checkout + webhook (no Deno APIs: unit-tested in vitest).
import { ENTRY350_AMOUNTS, ENTRY350_TAX_CONTRACT } from "./entry350Tax.ts";
import { ENTRY350_PROMO_TAX_CONTRACT, entry350PromoAmountsOk } from "./entry350Promo.ts";

const ALLOWED_HOSTS = new Set([
  "unpro.ca", "www.unpro.ca", "app.unpro.ca", "unpro.lovable.app",
  "id-preview--ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovable.app",
  "ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovableproject.com",
]);

/** Only our own origins may receive the Stripe redirect (no open redirect). */
export function safeRedirectUrl(url: unknown, fallback: string): string {
  if (typeof url !== "string" || !url) return fallback;
  try {
    const u = new URL(url);
    const local = u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
    if (local || (u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname.toLowerCase()))) return url;
  } catch { /* invalid */ }
  return fallback;
}

/**
 * Resolve the return origin for the public invited CA$350 Checkout.
 * In LIVE, always return the canonical domain: request Origin is user-controlled
 * and must never receive a Stripe session ID. For Stripe TEST, allow only
 * explicitly allowlisted preview/local origins so isolated QA stays usable.
 * Accept an origin only, never a path, credentials, query, or fragment.
 */
export function resolveInvitedCheckoutOrigin(
  rawOrigin: unknown,
  stripeEnv: "live" | "test",
): string {
  const canonical = "https://unpro.ca";
  if (stripeEnv !== "test" || typeof rawOrigin !== "string") return canonical;
  if (safeRedirectUrl(rawOrigin, "") !== rawOrigin) return canonical;
  try {
    const url = new URL(rawOrigin);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return canonical;
    return url.origin;
  } catch {
    return canonical;
  }
}

export interface WebhookEventRow { processing_status?: string | null; received_at?: string | null }

/**
 * A redelivered event is skipped only if it was already processed or is being
 * processed right now. A previous failed/stuck attempt must be retried,
 * otherwise a paid contractor is never activated.
 */
export function shouldSkipRedelivery(row: WebhookEventRow | null, nowMs = Date.now()): boolean {
  if (!row) return true; // unknown state: keep historical behaviour
  const s = row.processing_status ?? "";
  if (s === "processed" || s === "duplicate_promo_redemption" || s === "ignored" || s === "ignored_unpaid" || s === "success") return true;
  if (s === "processing") {
    const t = row.received_at ? Date.parse(row.received_at) : nowMs;
    return nowMs - t < 5 * 60_000;
  }
  return false;
}

/** Session paid states that may drive activation (never the return URL). */
export function isSessionPaid(s: { payment_status?: string | null; status?: string | null }): boolean {
  return s.payment_status === "paid" || s.payment_status === "no_payment_required";
}

/** Entry offers only: no free/discounted Checkout may grant a paid activation.
 * Versioned contracts share exclusive GST/QST; preserve unversioned historical contracts.
 */
export function entry350PaymentBlockReason(s: {
  payment_status?: string | null;
  mode?: string | null;
  currency?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  total_details?: { amount_tax?: number | null; amount_discount?: number | null } | null;
  metadata?: Record<string, string> | null;
}): "ignored_unpaid" | "ignored_amount_mismatch" | null {
  if (s.payment_status !== "paid") return "ignored_unpaid";
  // Separate versioned promo contract: never weakens the full-price checks below.
  if (s.metadata?.entry_tax_contract === ENTRY350_PROMO_TAX_CONTRACT) {
    return entry350PromoAmountsOk(s) ? null : "ignored_amount_mismatch";
  }
  if (s.metadata?.entry_tax_contract) {
    if (s.metadata.entry_tax_contract !== ENTRY350_TAX_CONTRACT || s.mode !== "payment" ||
        s.currency !== "cad" || s.amount_subtotal !== ENTRY350_AMOUNTS.subtotal || s.amount_total !== ENTRY350_AMOUNTS.total ||
        s.total_details?.amount_tax !== ENTRY350_AMOUNTS.tax) return "ignored_amount_mismatch";
    return null;
  }
  const tax = s.total_details?.amount_tax ?? 0;
  const minimumTax = s.metadata?.offer === "entry_activation_350"
    ? Math.round(35000 * 0.05) + Math.round(35000 * 0.09975) : 0;
  if (s.mode !== "payment" || (s.currency ?? "").toLowerCase() !== "cad" ||
      s.amount_subtotal !== 35000 || !Number.isSafeInteger(tax) || tax < 0 ||
      !Number.isSafeInteger(s.amount_total) ||
      (s.amount_total ?? 0) < 35000 + Math.max(minimumTax, tax)) {
    return "ignored_amount_mismatch";
  }
  return null;
}

/** Strict Stripe Checkout Session id format (cs_test_… / cs_live_…). */
export function isValidCheckoutSessionId(v: unknown): v is string {
  return typeof v === "string" && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(v);
}

export interface SessionLike {
  livemode?: boolean | null;
  mode?: string | null;
  currency?: string | null;
  amount_subtotal?: number | null;
  metadata?: Record<string, string> | null;
}

/**
 * Why a Stripe session must NOT confirm this quote (null = consistent).
 * Wrong quote/account, test/live mix, and for the 350 $ entry activation:
 * one-time payment, CAD, exactly 35 000 cents before taxes.
 */
export function sessionMismatch(s: SessionLike, ctx: { quoteId: string; userId: string; testKey: boolean }): string | null {
  const m = s.metadata ?? {};
  if (m.quote_id !== ctx.quoteId) return "quote_mismatch";
  if (m.user_id && m.user_id !== ctx.userId) return "user_mismatch";
  if (!!s.livemode === ctx.testKey) return "livemode_mismatch";
  if (m.offer === "entry_activation_350") {
    if (s.mode !== "payment") return "mode_mismatch";
    if ((s.currency ?? "").toLowerCase() !== "cad") return "currency_mismatch";
    if (s.amount_subtotal !== 35000) return "amount_mismatch";
  }
  return null;
}

/** Client-side: the return page may only start confirming with a real session id. */
export function returnConfirmationMode(search: string): "none" | "confirm" | "canceled" | "invalid" {
  const p = new URLSearchParams(search);
  const outcome = p.get("checkout");
  if (outcome === "canceled") return "canceled";
  if (outcome !== "success") return "none";
  return isValidCheckoutSessionId(p.get("session_id")) ? "confirm" : "invalid";
}

/**
 * Décision du webhook pour une session 350 $ payée et au bon montant.
 * - TEST (livemode=false) n'active QUE des comptes QA marqués : jamais une
 *   activation commerciale réelle depuis un événement de test.
 * - Une deuxième session payée pour une fiche déjà activée n'active rien :
 *   c'est un double paiement à rembourser, signalé à l'admin.
 */
export type EntryActivationDecision = "activate" | "already_processed" | "duplicate_payment" | "test_on_non_qa";
export function entryActivationDecision(i: {
  livemode: boolean | null | undefined;
  isQaAccount: boolean;
  sessionAlreadyInLedger: boolean;
  activatedByOtherSession: boolean;
}): EntryActivationDecision {
  if (i.sessionAlreadyInLedger) return "already_processed";
  if (i.livemode !== true && !i.isQaAccount) return "test_on_non_qa";
  if (i.activatedByOtherSession) return "duplicate_payment";
  return "activate";
}

/** Le webhook a-t-il échoué de façon définitive ou reste-t-il bloqué (> 5 min) ? */
export function webhookConfirmationFailed(row: WebhookEventRow | null, nowMs = Date.now()): boolean {
  if (!row) return false;
  if (row.processing_status === "failed") return true;
  if (row.processing_status === "processing") {
    const t = row.received_at ? Date.parse(row.received_at) : nowMs;
    return nowMs - t >= 5 * 60_000;
  }
  return false;
}

/** Pack d'entrée invité : raison de blocage, ou null si LIVE exact 35 000 ¢ CAD. */
export function entryPackBlockReason(i: {
  livemode: boolean | null | undefined;
  amountSubtotal: number | null | undefined;
  currency: string | null | undefined;
}): "ignored_test" | "ignored_amount_mismatch" | null {
  if (i.livemode !== true) return "ignored_test";
  if (i.amountSubtotal !== 35000 || (i.currency ?? "").toLowerCase() !== "cad") return "ignored_amount_mismatch";
  return null;
}

/** Code affilié normalisé (A-Z, 0-9, tiret, 2-64), sinon null. Jamais une preuve d'affiliée active. */
export function normalizeAffiliateRef(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toUpperCase();
  return /^[A-Z0-9-]{2,64}$/.test(v) ? v : null;
}

/** Ajoute n mois calendaires (UTC), borné au dernier jour du mois cible (31 janv. → 28/29 févr.). */
export function addCalendarMonths(from: Date, n: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

/**
 * Arguments de record_affiliate_payment_conversion pour l'activation 350 $,
 * ou null : seulement LIVE, payé, 35000 avant taxes, avec une affiliée résolue
 * côté serveur au checkout (affiliate_id + ref présents dans les metadata).
 */
export function entry350CommissionArgs(i: {
  livemode: boolean | null | undefined;
  decision: string;
  session: { id: string; payment_status?: string | null; amount_subtotal?: number | null; metadata?: Record<string, unknown> | null };
  contractorId: string;
}): Record<string, unknown> | null {
  if (i.livemode !== true) return null;
  if (i.decision !== "activate" && i.decision !== "already_processed") return null;
  if (i.session.payment_status !== "paid" || i.session.amount_subtotal !== 35000) return null;
  const md = i.session.metadata ?? {};
  // Promo 349 $: 1 $ really collected, never a commission on a fictitious 350 $.
  if (md.entry_tax_contract === ENTRY350_PROMO_TAX_CONTRACT) return null;
  const ref = normalizeAffiliateRef(md.ref);
  const affiliateId = typeof md.affiliate_id === "string" && /^[0-9a-f-]{36}$/i.test(md.affiliate_id) ? md.affiliate_id : null;
  if (!ref || !affiliateId) return null;
  return {
    p_prospect_id: (md.prospect_id as string) || null,
    p_contractor_id: i.contractorId,
    p_user_id: null,
    p_amount_pretax_cents: 35000,
    p_stripe_session_id: i.session.id,
    p_affiliate_id: affiliateId,
    p_referral_code: ref,
    p_metadata: { offer: "entry_activation_350", quote_id: md.quote_id ?? null },
  };
}

/**
 * An entry-pack duplicate-key is an idempotent replay ONLY if the durable
 * receipt belongs to the same contractor, LIVE payment intent and offer.
 * Never treat an unrelated unique violation or a different business as paid.
 */
export function entryPackReplayReceiptMatches(
  prior: { contractor_id?: string | null; source?: string | null; metadata?: Record<string, unknown> | null } | null,
  expected: { contractorId: string; paymentIntentId: string | null },
): boolean {
  const md = prior?.metadata;
  return !!expected.paymentIntentId &&
    !!prior &&
    prior.contractor_id === expected.contractorId &&
    prior.source === "stripe_webhook" &&
    md?.offer === "entry_pack_350" &&
    md?.livemode === true &&
    md?.stripe_payment_intent === expected.paymentIntentId;
}

/**
 * The personalized 350 entry cannot repair a partially processed payment on
 * the strength of a matching session ID alone. Protect the original business,
 * mode and Stripe PaymentIntent (including concurrent unique-index replays).
 * action='entry_activation_350_paid' is checked by the caller's ledger query.
 */
export function entryActivationReplayReceiptMatches(
  prior: { contractor_id?: string | null; source?: string | null; metadata?: Record<string, unknown> | null } | null,
  expected: { contractorId: string; sessionId: string; paymentIntentId: string | null; livemode: boolean },
): boolean {
  const md = prior?.metadata;
  return !!prior &&
    !!expected.paymentIntentId &&
    prior.contractor_id === expected.contractorId &&
    prior.source === "stripe_webhook" &&
    md?.stripe_session_id === expected.sessionId &&
    md?.stripe_payment_intent === expected.paymentIntentId &&
    md?.livemode === expected.livemode &&
    md?.amount_subtotal_cents === 35000;
}

/** Classify an entry-350 ledger insert error. The promo index must win over the generic
 * duplicate-key match: a second session redeeming PROMO is NEVER an idempotent replay. */
export function entry350LedgerConflict(message: string | null | undefined): "promo_already_redeemed" | "same_session" | null {
  if (!message) return null;
  if (/uq_entry350_single_promo_redemption/i.test(message)) return "promo_already_redeemed";
  // An unrelated unique violation is not proof that THIS Stripe session exists.
  // Fail closed rather than provisioning without its receipt.
  if (/uq_ledger_entry350_session/i.test(message)) return "same_session";
  return null;
}
