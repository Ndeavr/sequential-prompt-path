// @vitest-environment node
// Synthetic in-memory DB only. Mirrors trigger affiliate_sync_override_status.
import { describe, it, expect } from "vitest";
import { reverseEntry350Commission, entry350SessionRevoked } from "../../supabase/functions/_shared/entry350CommissionReversal";

type Row = Record<string, any>;
function memDb(seed: Record<string, Row[]>) {
  const t: Record<string, Row[]> = { contractor_activation_ledger: [], affiliate_conversions: [], admin_notifications: [], ...seed };
  const get = (r: Row, k: string) => k.includes("->>") ? r[k.split("->>")[0]]?.[k.split("->>")[1]] : r[k];
  const from = (name: string) => {
    const f: [string, unknown][] = []; let patch: Row | null = null; let ret = false;
    const rows = () => t[name].filter((r) => f.every(([k, v]) => get(r, k) === v));
    const run = () => {
      if (!patch) return { data: rows(), error: null };
      const hit = rows();
      for (const r of hit) {
        const old = r.status; Object.assign(r, patch);
        if (name === "affiliate_conversions" && r.commission_kind === "direct" && patch.status && patch.status !== old)
          t[name].filter((o) => o.source_conversion_id === r.id && o.commission_kind === "subaffiliate_override").forEach((o) => { o.status = r.status; });
      }
      return { data: ret ? hit.map((r) => ({ id: r.id })) : null, error: null };
    };
    const q: any = {
      select: () => { if (patch) ret = true; return q; }, eq: (k: string, v: unknown) => { f.push([k, v]); return q; },
      limit: () => q, update: (p: Row) => { patch = p; return q; },
      insert: async (r: Row) => { t[name].push(r); return { error: null }; },
      then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  };
  return { t, db: { from } };
}

const ledger = (sid = "cs_live_1", pi = "pi_1") => ({ contractor_id: "c1", action: "entry_activation_350_paid", source: "stripe_webhook", metadata: { stripe_session_id: sid, stripe_payment_intent: pi } });
const direct = (status = "pending", sid = "cs_live_1") => ({ id: `d_${sid}`, commission_kind: "direct", status, affiliate_id: "aff", metadata: { stripe_session_id: sid, offer: "entry_pack_350" } });
const override = (status = "pending", src = "d_cs_live_1") => ({ id: `o_${src}`, commission_kind: "subaffiliate_override", status, source_conversion_id: src, metadata: {} });
const args = { paymentIntentId: "pi_1", eventId: "evt_r", livemode: true, reason: "refunded" as const, partial: false };

describe("350 $ — annulation de la commission affiliée (remboursement/litige)", () => {
  it("remboursement LIVE complet : directe 20 % et équipe 5 % rejetées, historique conservé", async () => {
    const { t, db } = memDb({ contractor_activation_ledger: [ledger()], affiliate_conversions: [direct(), override()] });
    expect(await reverseEntry350Commission(db, args)).toBe("reversed");
    expect(t.affiliate_conversions.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(t.affiliate_conversions[0].metadata.reversal.stripe_event_id).toBe("evt_r");
    expect(t.affiliate_conversions[0].metadata.offer).toBe("entry_pack_350");
    expect(t.affiliate_conversions).toHaveLength(2);
  });
  it("idempotent : 2e remboursement ou litige = already_reversed", async () => {
    const { db } = memDb({ contractor_activation_ledger: [ledger()], affiliate_conversions: [direct(), override()] });
    await reverseEntry350Commission(db, args);
    expect(await reverseEntry350Commission(db, { ...args, eventId: "evt_d", reason: "disputed" })).toBe("already_reversed");
  });
  it("événement TEST : aucune commission modifiée", async () => {
    const { t, db } = memDb({ contractor_activation_ledger: [ledger()], affiliate_conversions: [direct()] });
    expect(await reverseEntry350Commission(db, { ...args, livemode: false })).toBe("test_ignored");
    expect(t.affiliate_conversions[0].status).toBe("pending");
  });
  it("commission déjà versée : aucune reprise, alerte de réconciliation", async () => {
    const { t, db } = memDb({ contractor_activation_ledger: [ledger()], affiliate_conversions: [direct("paid"), override("paid")] });
    expect(await reverseEntry350Commission(db, args)).toBe("paid_needs_reconciliation");
    expect(t.affiliate_conversions.map((r) => r.status)).toEqual(["paid", "paid"]);
    expect(t.admin_notifications[0].type).toBe("entry_activation_350_commission_paid_reconcile");
  });
  it("équipe 5 % déjà versée seule : rien n'est écrasé", async () => {
    const { t, db } = memDb({ contractor_activation_ledger: [ledger()], affiliate_conversions: [direct("approved"), override("paid")] });
    expect(await reverseEntry350Commission(db, args)).toBe("paid_needs_reconciliation");
    expect(t.affiliate_conversions.map((r) => r.status)).toEqual(["approved", "paid"]);
  });
  it("remboursement partiel : commission inchangée, revue manuelle", async () => {
    const { t, db } = memDb({ contractor_activation_ledger: [ledger()], affiliate_conversions: [direct()] });
    expect(await reverseEntry350Commission(db, { ...args, partial: true })).toBe("manual_review");
    expect(t.affiliate_conversions[0].status).toBe("pending");
    expect(t.admin_notifications[0].type).toBe("entry_activation_350_commission_partial_refund");
  });
  it("autre session ou autre paiement : jamais touchés", async () => {
    const { t, db } = memDb({ contractor_activation_ledger: [ledger(), ledger("cs_live_2", "pi_2")], affiliate_conversions: [direct("pending", "cs_live_2")] });
    expect(await reverseEntry350Commission(db, args)).toBe("no_commission");
    expect(await reverseEntry350Commission(db, { ...args, paymentIntentId: "pi_inconnu" })).toBe("not_found");
    expect(t.affiliate_conversions[0].status).toBe("pending");
  });
  it("remboursement reçu avant la commission : la session est marquée révoquée", async () => {
    const { db } = memDb({ contractor_activation_ledger: [{ action: "deactivated", source: "stripe_webhook", metadata: { stripe_session_id: "cs_live_1" } }] });
    expect(await entry350SessionRevoked(db, "cs_live_1")).toBe(true);
    expect(await entry350SessionRevoked(db, "cs_live_9")).toBe(false);
  });
});
