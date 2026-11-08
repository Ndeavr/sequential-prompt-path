/**
 * Réservation atomique d'achat entrepreneur (avant tout objet Stripe payable).
 *
 * Une seule session payable par entrepreneur et mode Stripe (live/test), qu'il
 * s'agisse de l'activation 350 $ seule, d'un forfait avec la Présence incluse
 * ou d'un forfait seul. Le verrou et la règle vivent en SQL
 * (`reserve_contractor_checkout` / `settle_contractor_checkout`); ce module
 * orchestre Stripe autour :
 *
 * - même demande (empreinte identique) → même session (réutilisée) ou même clé
 *   d'idempotence Stripe (nouvel essai sûr après une panne réseau);
 * - demande différente (autre devis, autre décision Présence, intégré ↔ page
 *   hébergée) → l'ancienne session ouverte est EXPIRÉE chez Stripe avant d'en
 *   créer une autre; si Stripe indique qu'elle est déjà payée/complétée → refus;
 * - session créée mais non enregistrée chez UNPRO → expirée aussitôt, jamais
 *   remise au client (aucune session payable orpheline);
 * - toute lecture illisible → refus, aucun paiement créé.
 */

export interface SessionLike {
  id: string;
  status?: string | null; // open | complete | expired
  payment_status?: string | null;
  url?: string | null;
  client_secret?: string | null;
}

type RpcResult = { data: unknown; error: { message?: string; code?: string } | null };

export interface ReservationDeps {
  reserve(): Promise<RpcResult>;
  settle(reservationId: string, status: "open" | "expired" | "superseded" | "failed", sessionId: string | null, reason: string): Promise<RpcResult>;
  retrieve(sessionId: string): Promise<SessionLike>;
  expire(sessionId: string): Promise<SessionLike>;
}

export type AcquireResult =
  | { kind: "create"; reservationId: string; idempotencyKey: string; expiresAt: number }
  | { kind: "reuse"; reservationId: string; session: SessionLike }
  | { kind: "refuse"; status: number; code: string; message: string };

const REFUSALS: Record<string, { status: number; message: string }> = {
  annual_presence_still_valid: { status: 409, message: "Votre Présence IA est encore valide. Aucun paiement n'a été créé." },
  presence_payment_already_received: { status: 409, message: "Votre paiement a déjà été reçu. La confirmation est en cours chez UNPRO." },
  payment_received_pending: { status: 409, message: "Un paiement est déjà en cours pour votre entreprise. La confirmation est en cours chez UNPRO." },
  checkout_in_progress: { status: 409, message: "Un paiement est en préparation dans un autre onglet. Réessayez dans un instant." },
  checkout_reservation_unavailable: { status: 503, message: "Impossible de préparer le paiement pour le moment. Aucun paiement n'a été créé." },
  checkout_state_unverified: { status: 503, message: "Impossible de vérifier votre paiement précédent. Aucun nouveau paiement n'a été créé." },
};

export function refusal(code: keyof typeof REFUSALS | string): AcquireResult {
  const r = REFUSALS[code] ?? REFUSALS.checkout_reservation_unavailable;
  return { kind: "refuse", status: r.status, code: REFUSALS[code] ? code : "checkout_reservation_unavailable", message: r.message };
}

/** JSON stable (clés triées) : la même demande produit toujours la même empreinte. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).filter((k) => obj[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export async function purchaseFingerprint(contract: unknown): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableStringify(contract)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Clé d'idempotence Stripe dérivée de la réservation pour chaque objet créé. */
export function stepKey(idempotencyKey: string, step: "session" | "customer" | "plan_product" | "coupon"): string {
  return `${idempotencyKey}:${step}`;
}

function isMissing(err: unknown): boolean {
  const e = err as { code?: string; statusCode?: number } | null;
  return e?.code === "resource_missing" || e?.statusCode === 404;
}

function usable(session: SessionLike, embedded: boolean): boolean {
  return session.status === "open" && (embedded ? !!session.client_secret : !!session.url);
}

/**
 * Obtient le droit de créer (ou de réutiliser) LA session payable de
 * l'entrepreneur. Au plus trois passages (remplacement d'une ancienne session).
 */
export async function acquireCheckoutReservation(deps: ReservationDeps, opts: { embedded: boolean }): Promise<AcquireResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await deps.reserve();
    if (error) return refusal("checkout_reservation_unavailable");
    const r = data as {
      action?: string; reason?: string; reservation_id?: string; idempotency_key?: string;
      session_expires_at?: number; stripe_session_id?: string; same_fingerprint?: boolean;
    } | null;
    if (!r || typeof r.action !== "string") return refusal("checkout_reservation_unavailable");

    if (r.action === "refuse") return refusal(r.reason ?? "checkout_reservation_unavailable");
    if (r.action === "busy") return refusal("checkout_in_progress");
    if (r.action === "create") {
      if (!r.reservation_id || !r.idempotency_key || typeof r.session_expires_at !== "number") return refusal("checkout_reservation_unavailable");
      return { kind: "create", reservationId: r.reservation_id, idempotencyKey: r.idempotency_key, expiresAt: r.session_expires_at };
    }
    if (r.action !== "verify_existing" || !r.reservation_id || !r.stripe_session_id) return refusal("checkout_reservation_unavailable");

    // Une session est déjà rattachée : Stripe fait foi sur son état.
    let existing: SessionLike;
    try {
      existing = await deps.retrieve(r.stripe_session_id);
    } catch (err) {
      if (!isMissing(err)) return refusal("checkout_state_unverified");
      const s = await deps.settle(r.reservation_id, "failed", r.stripe_session_id, "stripe_session_missing");
      if (s.error) return refusal("checkout_reservation_unavailable");
      continue;
    }
    if (existing.status === "complete" || existing.payment_status === "paid") return refusal("payment_received_pending");
    if (existing.status === "open" && r.same_fingerprint && usable(existing, opts.embedded)) {
      return { kind: "reuse", reservationId: r.reservation_id, session: existing };
    }
    if (existing.status === "open") {
      try {
        existing = await deps.expire(existing.id);
      } catch {
        // Expiration refusée : relire. Payée ou en cours de paiement → jamais de deuxième session.
        try { existing = await deps.retrieve(existing.id); } catch { return refusal("checkout_state_unverified"); }
        if (existing.status !== "expired") return refusal(existing.status === "complete" ? "payment_received_pending" : "checkout_state_unverified");
      }
      if (existing.status !== "expired") return refusal("checkout_state_unverified");
      const s = await deps.settle(r.reservation_id, "superseded", existing.id, r.same_fingerprint ? "session_not_reusable" : "superseded_by_new_request");
      if (s.error) return refusal("checkout_reservation_unavailable");
      continue;
    }
    // expired chez Stripe : libérer la réservation puis recommencer.
    const s = await deps.settle(r.reservation_id, "expired", existing.id, "stripe_session_expired");
    if (s.error) return refusal("checkout_reservation_unavailable");
  }
  return refusal("checkout_in_progress");
}

/**
 * Rattache la session créée à la réservation AVANT de la remettre au client.
 * Échec → la session est expirée chez Stripe et la réservation fermée.
 */
export async function attachCheckoutSession(deps: ReservationDeps, reservationId: string, session: SessionLike): Promise<{ ok: true } | { ok: false; expired: boolean }> {
  const res = await deps.settle(reservationId, "open", session.id, "attached");
  const ok = !res.error && (res.data as { ok?: boolean } | null)?.ok === true;
  if (ok) return { ok: true };
  return { ok: false, expired: await expireUndeliverable(deps, reservationId, session.id, "attach_failed") };
}

/** Dépendances réelles : RPC SQL (service) + API Stripe de la clé du même mode. */
// deno-lint-ignore no-explicit-any
export function liveReservationDeps(db: any, stripe: any, req: {
  contractorId: string; stripeMode: "live" | "test"; kind: "entry_350" | "combined_presence_plan" | "plan";
  includesPresence: boolean; quoteId: string | null; fingerprint: string; ttlSeconds?: number;
}): ReservationDeps {
  return {
    reserve: () => db.rpc("reserve_contractor_checkout", {
      _contractor_id: req.contractorId, _stripe_mode: req.stripeMode, _kind: req.kind,
      _includes_presence: req.includesPresence, _quote_id: req.quoteId, _fingerprint: req.fingerprint,
      _ttl_seconds: req.ttlSeconds ?? 3600,
    }),
    settle: (id, status, sessionId, reason) => db.rpc("settle_contractor_checkout", {
      _reservation_id: id, _status: status, _stripe_session_id: sessionId, _reason: reason,
    }),
    retrieve: (id) => stripe.checkout.sessions.retrieve(id),
    expire: (id) => stripe.checkout.sessions.expire(id),
  };
}

/** Paiement Présence déjà signé chez Stripe mais pas encore confirmé : true/false; null = illisible (refus). */
// deno-lint-ignore no-explicit-any
export async function presencePaymentAwaitingConfirmation(db: any, contractorId: string, live: boolean): Promise<boolean | null> {
  const since = new Date(Date.now() - 365 * 86400000).toISOString();
  const base = () => db.from("stripe_webhook_events").select("stripe_event_id")
    .eq("contractor_id", contractorId)
    .in("event_type", ["checkout.session.completed", "checkout.session.async_payment_succeeded"])
    .eq("livemode", live)
    .eq("payload->data->object->>payment_status", "paid")
    .gte("received_at", since);
  const [entry, combined] = await Promise.all([
    base().in("payload->data->object->metadata->>offer", ["entry_activation_350", "entry_pack_350"]).limit(1),
    base().eq("payload->data->object->metadata->>annual_presence", "included").limit(1),
  ]);
  if (entry.error || combined.error) return null;
  const evIds = [...(entry.data ?? []), ...(combined.data ?? [])].map((e: { stripe_event_id: string }) => e.stripe_event_id);
  if (!evIds.length) return false;
  // Déjà confirmé dans le registre = la Présence valide est décidée ailleurs; ici seulement l'écart.
  const { data: led, error: ledErr } = await db.from("contractor_activation_ledger").select("id")
    .eq("contractor_id", contractorId).eq("action", "entry_activation_350_paid")
    .in("metadata->>stripe_event_id", evIds).limit(1);
  if (ledErr) return null;
  return !(led ?? []).length;
}

/** Session créée mais non remise (écriture UNPRO échouée) : expirée, jamais payable. */
export async function expireUndeliverable(deps: ReservationDeps, reservationId: string, sessionId: string, reason: string): Promise<boolean> {
  let expired = false;
  try { expired = (await deps.expire(sessionId)).status === "expired"; } catch { expired = false; }
  await deps.settle(reservationId, "failed", sessionId, reason).catch(() => null);
  return expired;
}
