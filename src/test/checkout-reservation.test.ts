import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  acquireCheckoutReservation, attachCheckoutSession, expireUndeliverable, provenNotCreated, purchaseFingerprint,
  releaseIfNotCreated, stableStringify, stepKey,
  type ReservationDeps, type SessionLike,
} from "../../supabase/functions/_shared/checkoutReservation";

/**
 * Synthetic harness: an in-memory mirror of reserve_contractor_checkout /
 * settle_contractor_checkout (one active row per contractor+mode, serialized
 * like the advisory lock) and a fake Stripe. No real Stripe object, charge,
 * session or webhook is involved.
 */
type Row = { id: string; fp: string; status: string; session: string | null; key: string; createdAt: number; presence: boolean };

function world() {
  const rows: Row[] = [];
  const sessions = new Map<string, SessionLike>();
  const unreadable = new Set<string>();
  let n = 0;
  let lock: Promise<void> = Promise.resolve();
  const calls = { create: 0, expire: 0 };
  let failAttach: boolean | number = false; // true = toujours; n = n échecs transitoires
  let expireMode: "ok" | "throw" | "throw_unreadable" | "paid_during_cleanup" = "ok";
  let failReserve = false;
  let presencePaid = false;
  let now = 0;

  function serialized<T>(fn: () => T): Promise<T> {
    const run = lock.then(async () => { await new Promise((r) => setTimeout(r, 1)); return fn(); });
    lock = run.then(() => undefined, () => undefined);
    return run;
  }

  function reserveFor(fp: string, presence: boolean) {
    return () => serialized(() => {
      if (failReserve) return { data: null, error: { message: "db down" } };
      if (presence && presencePaid) return { data: { action: "refuse", reason: "presence_payment_already_received" }, error: null };
      const active = rows.find((r) => r.status === "reserved" || r.status === "open");
      if (active) {
        if (active.session) return { data: { action: "verify_existing", reservation_id: active.id, stripe_session_id: active.session, same_fingerprint: active.fp === fp }, error: null };
        // Miroir SQL 0045 : jamais de remplacement avant l'échéance de session + 10 min.
        if (now > active.createdAt + 3_600_000 + 600_000) active.status = "superseded";
        else if (active.fp === fp) return { data: { action: "create", reservation_id: active.id, idempotency_key: active.key, session_expires_at: 3600, retry: true }, error: null };
        else return { data: { action: "busy", reason: now - active.createdAt > 120_000 ? "reconciliation_pending" : "in_flight" }, error: null };
      }
      const row: Row = { id: `res-${++n}`, fp, status: "reserved", session: null, key: `ckr_${n}`, createdAt: now, presence };
      rows.push(row);
      return { data: { action: "create", reservation_id: row.id, idempotency_key: row.key, session_expires_at: 3600, retry: false }, error: null };
    });
  }

  const base: Omit<ReservationDeps, "reserve"> = {
    settle: (id, status, sid) => serialized(() => {
      const r = rows.find((x) => x.id === id);
      if (!r) return { data: { ok: false }, error: null };
      if (status === "open") {
        if (failAttach === true || (typeof failAttach === "number" && failAttach > 0)) {
          if (typeof failAttach === "number") failAttach--;
          return { data: null, error: { message: "write failed" } };
        }
        if (r.status === "open" && r.session === sid) return { data: { ok: true }, error: null }; // idempotent, as in SQL
        if (r.status !== "reserved") return { data: { ok: false }, error: null };
        r.session = sid; r.status = "open"; return { data: { ok: true }, error: null };
      }
      if (r.status === "paid") return { data: { ok: false }, error: null };
      r.status = status; return { data: { ok: true }, error: null };
    }),
    retrieve: async (id) => { if (unreadable.has(id)) throw Object.assign(new Error("timeout"), { statusCode: 500 }); const s = sessions.get(id); if (!s) throw Object.assign(new Error("missing"), { code: "resource_missing" }); return { ...s }; },
    expire: async (id) => {
      calls.expire++;
      const s = sessions.get(id)!;
      if (expireMode === "throw") throw new Error("network");
      if (expireMode === "throw_unreadable") { unreadable.add(id); throw new Error("network"); }
      if (expireMode === "paid_during_cleanup") { s.status = "complete"; s.payment_status = "paid"; throw new Error("session complete"); }
      if (s.status !== "open") throw new Error("cannot expire");
      s.status = "expired"; return { ...s };
    },
  };

  /** Mimics the edge function: acquire → (create with idempotency key) → attach. */
  async function checkout(fp: string, opts: { embedded?: boolean; presence?: boolean; failRecord?: boolean } = {}) {
    const deps: ReservationDeps = { ...base, reserve: reserveFor(fp, opts.presence ?? true) };
    const a = await acquireCheckoutReservation(deps, { embedded: !!opts.embedded });
    if (a.kind !== "create") return a;
    const key = stepKey(a.idempotencyKey, "session");
    let s = sessions.get(key);
    if (!s) { calls.create++; s = { id: `cs_${calls.create}`, status: "open", url: `https://pay/${calls.create}`, client_secret: `sec_${calls.create}` }; sessions.set(key, s); sessions.set(s.id, s); }
    const att = await attachCheckoutSession(deps, a.reservationId, s);
    if (att.ok && opts.failRecord) {
      const outcome = await expireUndeliverable(deps, a.reservationId, s.id, "checkout_record_failed");
      return { kind: "undeliverable" as const, session: sessions.get(s.id)!, outcome };
    }
    return att.ok ? { kind: "created" as const, session: s } : { kind: "undeliverable" as const, session: sessions.get(s.id)!, outcome: att.expired ? "released" : "blocked" };
  }

  const payable = () => [...sessions.entries()].filter(([k, s]) => k === s.id && s.status === "open").length;
  return {
    rows, sessions, calls, checkout, payable, unreadable,
    active: () => rows.filter((r) => r.status === "reserved" || r.status === "open"),
    pay: (id: string) => { const s = sessions.get(id)!; s.status = "complete"; s.payment_status = "paid"; },
    set: (o: { failAttach?: boolean | number; failReserve?: boolean; presencePaid?: boolean; now?: number; expireMode?: typeof expireMode }) => {
      if (o.failAttach !== undefined) failAttach = o.failAttach;
      if (o.expireMode !== undefined) expireMode = o.expireMode;
      if (o.failReserve !== undefined) failReserve = o.failReserve;
      if (o.presencePaid !== undefined) presencePaid = o.presencePaid;
      if (o.now !== undefined) now = o.now;
    },
  };
}

describe("réservation d'achat : jamais deux sessions payables pour la même entreprise", () => {
  it("double clic (page hébergée) : la même session est réutilisée, Stripe appelé une fois", async () => {
    const w = world();
    const a = await w.checkout("fp-quote-A-hosted");
    const b = await w.checkout("fp-quote-A-hosted");
    expect(a.kind).toBe("created");
    expect(b.kind).toBe("reuse");
    expect(w.calls.create).toBe(1);
    expect(w.payable()).toBe(1);
  });

  it("paiement intégré : réutilisé avec le même secret client", async () => {
    const w = world();
    await w.checkout("fp-embedded", { embedded: true });
    const b = await w.checkout("fp-embedded", { embedded: true });
    expect(b.kind === "reuse" && b.session.client_secret).toBe("sec_1");
  });

  it("autre devis, intégré ↔ hébergé ou seul ↔ combiné : l'ancienne session est expirée AVANT la nouvelle", async () => {
    const w = world();
    await w.checkout("fp-standalone-350");
    await w.checkout("fp-combined-quote-B");
    await w.checkout("fp-combined-quote-B-embedded", { embedded: true });
    expect(w.calls.create).toBe(3);
    expect(w.calls.expire).toBe(2);
    expect(w.payable()).toBe(1);
    expect(w.rows.filter((r) => r.status === "open")).toHaveLength(1);
  });

  it("ancienne session déjà payée : refus, aucune nouvelle session", async () => {
    const w = world();
    const a = await w.checkout("fp-A");
    if (a.kind !== "created") throw new Error("setup");
    w.pay(a.session.id);
    const b = await w.checkout("fp-B");
    expect(b).toMatchObject({ kind: "refuse", code: "payment_received_pending", status: 409 });
    expect(w.calls.create).toBe(1);
  });

  it("Présence payée en attente de confirmation : refus avant tout objet Stripe", async () => {
    const w = world();
    w.set({ presencePaid: true });
    expect(await w.checkout("fp-A")).toMatchObject({ kind: "refuse", code: "presence_payment_already_received" });
    expect(w.calls.create).toBe(0);
  });

  it("enregistrement UNPRO impossible : session expirée aussitôt, jamais remise", async () => {
    const w = world();
    w.set({ failAttach: true });
    const a = await w.checkout("fp-A");
    expect(a.kind).toBe("undeliverable");
    expect(w.payable()).toBe(0);
  });

  it("base indisponible : refus fermé, aucun paiement créé", async () => {
    const w = world();
    w.set({ failReserve: true });
    expect(await w.checkout("fp-A")).toMatchObject({ kind: "refuse", status: 503 });
    expect(w.calls.create).toBe(0);
  });

  it("concurrence : dix onglets, deux devis différents en parallèle → une seule session payable", async () => {
    const w = world();
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => w.checkout(i % 2 ? "fp-quote-1" : "fp-quote-2")));
    expect(w.payable()).toBe(1);
    expect(results.filter((r) => r.kind === "refuse").every((r) => r.kind === "refuse" && ["checkout_in_progress"].includes(r.code))).toBe(true);
    expect(w.rows.filter((r) => r.status === "reserved" || r.status === "open")).toHaveLength(1);
  });

  it("nouvel essai après panne : même clé d'idempotence Stripe, aucune deuxième session", async () => {
    const w = world();
    const deps = { reserve: () => Promise.resolve({ data: { action: "create", reservation_id: "r1", idempotency_key: "ckr_x", session_expires_at: 1 }, error: null }) } as unknown as ReservationDeps;
    const a = await acquireCheckoutReservation(deps, { embedded: false });
    const b = await acquireCheckoutReservation(deps, { embedded: false });
    expect(a.kind === "create" && b.kind === "create" && stepKey(a.idempotencyKey, "session") === stepKey(b.idempotencyKey, "session")).toBe(true);
    expect(w.calls.create).toBe(0);
  });

  it("état Stripe illisible : refus, aucune nouvelle session", async () => {
    const deps: ReservationDeps = {
      reserve: async () => ({ data: { action: "verify_existing", reservation_id: "r1", stripe_session_id: "cs_1", same_fingerprint: false }, error: null }),
      settle: async () => ({ data: { ok: true }, error: null }),
      retrieve: async () => { throw Object.assign(new Error("timeout"), { statusCode: 500 }); },
      expire: async () => { throw new Error("never"); },
    };
    expect(await acquireCheckoutReservation(deps, { embedded: false })).toMatchObject({ kind: "refuse", code: "checkout_state_unverified" });
  });

  it("empreinte stable (ordre des clés) et sensible au mode d'affichage", async () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
    expect(await purchaseFingerprint({ ui_mode: "embedded", q: 1 })).not.toBe(await purchaseFingerprint({ q: 1 }));
  });
});

describe("caisse : chaque objet Stripe créé avec une clé dérivée de la réservation", () => {
  const src = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
  const sql = readFileSync("drizzle/migrations/0044_checkout_reservation_and_historical_right_provenance.sql", "utf8");
  const sql45 = readFileSync("drizzle/migrations/0045_checkout_reservation_recovery_and_presence_review_evidence.sql", "utf8");
  it("aucune création de session, client ou coupon sans idempotence", () => {
    expect(src).not.toMatch(/sessions\.create\(checkoutConfig\)/);
    expect(src).toMatch(/sessions\.create\(checkoutConfig, \{ idempotencyKey: stepKey\(idemKey, "session"\) \}\)/);
    expect(src).toMatch(/customers\.create\([\s\S]*?idempotencyKey: stepKey\(idemKey, "customer"\)/);
    expect(src).toMatch(/coupons\.create\(couponParams, \{ idempotencyKey: stepKey\(idemKey, "coupon"\) \}\)/);
    expect(src).toMatch(/entryRequestOptions = \{ idempotencyKey: stepKey\(acquired\.idempotencyKey, "session"\) \}/);
  });
  it("réservation avant Stripe, rattachement avant remise, écriture échouée = session expirée", () => {
    const iReserve = src.indexOf("acquireCheckoutReservation(reservationDeps");
    const iCreate = src.indexOf('sessions.create(checkoutConfig, { idempotencyKey');
    const iAttach = src.indexOf("attachCheckoutSession(reservationDeps");
    expect(iReserve).toBeGreaterThan(0);
    expect(iReserve).toBeLessThan(iCreate);
    expect(iCreate).toBeLessThan(iAttach);
    expect(src).toMatch(/recordErr && recordErr\.code !== "23505"[\s\S]{0,200}expireUndeliverable/);
    expect(src).toMatch(/snapshotError && snapshotError\.code !== "23505"[\s\S]{0,300}expireUndeliverable/);
    expect(src).not.toMatch(/quoteId && !isEmbedded/);
  });
  it("SQL : verrou par entreprise + mode, une seule réservation active, payé jamais refermé", () => {
    expect(sql).toMatch(/pg_advisory_xact_lock\(hashtextextended\('checkout_reservation:'/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_checkout_reservation_active[\s\S]*WHERE status IN \('reserved', 'open'\)/);
    expect(sql).toMatch(/IF r\.status = 'paid' THEN RETURN jsonb_build_object\('ok', false, 'reason', 'already_paid'\)/);
  });
  it("SQL 0045 : aucune libération sur délai court; même demande = même clé; remplacement après l'échéance seulement", () => {
    expect(sql45).toMatch(/IF now\(\) > r\.session_expires_at \+ interval '10 minutes' THEN/);
    expect(sql45).not.toMatch(/IF r\.created_at < now\(\) - interval '2 minutes' THEN\s+UPDATE/);
    expect(sql45).toMatch(/ELSIF r\.fingerprint = _fingerprint THEN\s+RETURN jsonb_build_object\('action', 'create', 'reservation_id', r\.id, 'idempotency_key', r\.idempotency_key/);
  });
  it("caisse : aucune libération sur « tout 4xx »; seulement non-création prouvée", () => {
    expect(src).not.toMatch(/sc >= 400 && sc < 500/);
    expect(src.match(/releaseIfNotCreated\(/g)?.length).toBe(2);
    expect(src).toMatch(/fbSession\.id, "snapshot_failed"\)[\s\S]{0,40}: "blocked"/);
  });
  it("webhook : paiement signé et expiration ferment la réservation", () => {
    const wh = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    expect(wh).toMatch(/_status: "paid", _stripe_session_id: session\.id/);
    expect(wh).toMatch(/_status: "expired", _stripe_session_id: session\.id/);
  });
});

describe("nettoyage incertain : la réservation reste bloquante tant que Stripe n'a pas tranché", () => {
  it("expiration Stripe en échec (réseau) puis session relue ouverte : bloquée, session enregistrée, aucune deuxième session", async () => {
    const w = world();
    w.set({ failAttach: true, expireMode: "throw" });
    const a = await w.checkout("fp-A");
    expect(a).toMatchObject({ kind: "undeliverable", outcome: "blocked" });
    expect(w.active()).toHaveLength(1);
    w.set({ failAttach: false, expireMode: "ok" });
    // L'enregistrement a échoué aussi : la réservation reste « reserved » sans session → autre demande bloquée.
    expect(await w.checkout("fp-B")).toMatchObject({ kind: "refuse", code: "checkout_in_progress" });
    expect(w.calls.create).toBe(1);
  });

  it("session illisible pendant le nettoyage : jamais libérée", async () => {
    const w = world();
    const a = await w.checkout("fp-A", { failRecord: true });
    expect(a).toMatchObject({ outcome: "released" }); // contrôle : expiration confirmée = libérée
    const w2 = world();
    w2.set({ expireMode: "throw_unreadable" });
    const b = await w2.checkout("fp-A", { failRecord: true });
    expect(b).toMatchObject({ kind: "undeliverable", outcome: "blocked" });
    expect(w2.active()).toHaveLength(1);
    expect(await w2.checkout("fp-B")).toMatchObject({ kind: "refuse", code: "checkout_state_unverified" });
    expect(w2.calls.create).toBe(1);
  });

  it("payée pendant le nettoyage : bloquée, puis refus « paiement reçu » au lieu d'une deuxième session", async () => {
    const w = world();
    w.set({ expireMode: "paid_during_cleanup" });
    const a = await w.checkout("fp-A", { failRecord: true });
    expect(a).toMatchObject({ outcome: "blocked" });
    w.set({ expireMode: "ok" });
    expect(await w.checkout("fp-B")).toMatchObject({ kind: "refuse", code: "payment_received_pending" });
    expect(w.calls.create).toBe(1);
  });

  it("nouvel essai concurrent : un rattachement transitoirement en échec est réessayé; la session remise n'est pas expirée", async () => {
    const w = world();
    w.set({ failAttach: 1 });
    const [a, b] = await Promise.all([w.checkout("fp-A"), w.checkout("fp-A")]);
    expect([a.kind, b.kind].sort()).toEqual(["created", "created"]);
    expect(w.calls.create).toBe(1);
    expect(w.calls.expire).toBe(0);
    expect(w.payable()).toBe(1);
  });

  it("plantage avant rattachement : même demande 40 min plus tard = même clé (Stripe rejoue la session); autre demande bloquée jusqu'à l'échéance", async () => {
    const w = world();
    // Réservation + session créées chez Stripe, puis plantage : aucun rattachement.
    w.set({ failAttach: true, expireMode: "throw_unreadable" });
    await w.checkout("fp-A"); // session créée, rattachement + nettoyage impossibles
    w.unreadable.clear();
    w.set({ failAttach: false, expireMode: "ok", now: 40 * 60_000 });
    expect(await w.checkout("fp-B")).toMatchObject({ kind: "refuse", code: "checkout_reconciliation_pending" });
    const again = await w.checkout("fp-A");
    expect(again.kind).toBe("created");
    expect(w.calls.create).toBe(1); // rejouée par la même clé, pas recréée
    w.set({ now: 0 });
  });

  it("statut Stripe inconnu : refus, jamais traité comme expiré", async () => {
    const settled: string[] = [];
    const deps: ReservationDeps = {
      reserve: async () => ({ data: { action: "verify_existing", reservation_id: "r1", stripe_session_id: "cs_1", same_fingerprint: false }, error: null }),
      settle: async (_id, st) => { settled.push(st); return { data: { ok: true }, error: null }; },
      retrieve: async () => ({ id: "cs_1", status: "processing_unknown" }),
      expire: async () => { throw new Error("never"); },
    };
    expect(await acquireCheckoutReservation(deps, { embedded: false })).toMatchObject({ kind: "refuse", code: "checkout_state_unverified" });
    expect(settled).toEqual([]);
  });

  it("erreurs Stripe : seule la non-création prouvée sur réservation neuve libère", async () => {
    const validation = { statusCode: 400, type: "StripeInvalidRequestError", rawType: "invalid_request_error" };
    const idem = { statusCode: 400, type: "StripeIdempotencyError", rawType: "idempotency_error" };
    const conflict = { statusCode: 409, type: "StripeInvalidRequestError" };
    const rate = { statusCode: 429, type: "StripeRateLimitError" };
    const net = { type: "StripeConnectionError" };
    expect(provenNotCreated(validation)).toBe(true);
    for (const e of [idem, conflict, rate, net, { statusCode: 500 }]) expect(provenNotCreated(e)).toBe(false);
    const calls: string[] = [];
    const deps = { settle: async (_i: string, st: string) => { calls.push(st); return { data: { ok: true }, error: null }; } } as unknown as ReservationDeps;
    expect(await releaseIfNotCreated(deps, "r1", true, validation, "x")).toBe("released");
    expect(await releaseIfNotCreated(deps, "r1", false, validation, "x")).toBe("kept");
    expect(await releaseIfNotCreated(deps, "r1", true, conflict, "x")).toBe("kept");
    expect(calls).toEqual(["failed"]);
  });
});
