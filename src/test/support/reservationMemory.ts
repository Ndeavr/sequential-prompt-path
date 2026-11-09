/**
 * In-memory mirror of the reservation SQL (0044 settle + 0045 contractor reserve +
 * 0046 prospect reserve) for isolated tests only. The real SQL is exercised by
 * scripts/qa/checkout-reservation-sql on a throwaway Postgres; this mirror lets
 * the edge handlers run end-to-end against mocks. Never a hosted call.
 */
type Row = {
  id: string; subject: string; stripe_mode: string; includes_presence: boolean; fingerprint: string;
  idempotency_key: string; status: string; stripe_session_id: string | null; session_expires_at: number;
  created_at: number; updated_at: number; closed_reason: string | null;
};

export function createReservationMemory(now: () => number = Date.now) {
  const rows: Row[] = [];
  let seq = 0;
  const epoch = (ms: number) => Math.floor(ms / 1000);

  function reserve(subject: string, mode: string, includesPresence: boolean, fingerprint: string, ttl: number, presenceValid: boolean, paidElsewhere = false) {
    if (includesPresence && presenceValid) return { action: "refuse", reason: "annual_presence_still_valid" };
    if (includesPresence && (paidElsewhere || rows.some((p) => p.subject === subject && p.stripe_mode === mode && p.includes_presence && p.status === "paid" && p.updated_at > now() - 365 * 86400000))) {
      return { action: "refuse", reason: "presence_payment_already_received" };
    }
    const r = rows.find((x) => x.subject === subject && x.stripe_mode === mode && (x.status === "reserved" || x.status === "open"));
    if (r) {
      if (r.stripe_session_id) {
        return { action: "verify_existing", reservation_id: r.id, stripe_session_id: r.stripe_session_id, same_fingerprint: r.fingerprint === fingerprint, idempotency_key: r.idempotency_key, session_expires_at: epoch(r.session_expires_at) };
      }
      if (now() > r.session_expires_at + 600000) {
        r.status = "superseded"; r.closed_reason = "reserved_without_session_past_expiry"; r.updated_at = now();
      } else if (r.fingerprint === fingerprint) {
        return { action: "create", reservation_id: r.id, idempotency_key: r.idempotency_key, session_expires_at: epoch(r.session_expires_at), retry: true };
      } else {
        return { action: "busy", reason: r.created_at < now() - 120000 ? "reconciliation_pending" : "in_flight" };
      }
    }
    const n: Row = {
      id: `00000000-0000-4000-9000-${String(++seq).padStart(12, "0")}`, subject, stripe_mode: mode, includes_presence: includesPresence,
      fingerprint, idempotency_key: `ckr_mem_${seq}`, status: "reserved", stripe_session_id: null,
      session_expires_at: now() + ttl * 1000, created_at: now(), updated_at: now(), closed_reason: null,
    };
    rows.push(n);
    return { action: "create", reservation_id: n.id, idempotency_key: n.idempotency_key, session_expires_at: epoch(n.session_expires_at), retry: false };
  }

  function settle(id: string | null, status: string, sessionId: string | null, reason: string | null) {
    const r = id ? rows.find((x) => x.id === id) : rows.find((x) => x.stripe_session_id === sessionId);
    if (!r) return { ok: false, reason: "not_found" };
    if (sessionId && r.stripe_session_id && r.stripe_session_id !== sessionId) return { ok: false, reason: "session_mismatch" };
    if (status === "open") {
      if (r.status === "open" && r.stripe_session_id === sessionId) return { ok: true, status: "open" };
      if (r.status !== "reserved" || !sessionId) return { ok: false, reason: "not_reserved" };
    } else if (status === "paid") {
      if (r.status === "paid") return { ok: true, status: "paid" };
    } else {
      if (r.status === "paid") return { ok: false, reason: "already_paid" };
      if (r.status !== "reserved" && r.status !== "open") return { ok: true, status: r.status };
    }
    r.status = status; r.stripe_session_id = r.stripe_session_id ?? sessionId; r.updated_at = now();
    if (["expired", "superseded", "failed"].includes(status)) r.closed_reason = reason ?? status;
    return { ok: true, status };
  }

  return { rows, reserve, settle };
}
