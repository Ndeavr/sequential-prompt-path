// @vitest-environment node
// Invited CAD350 checkout (create-activation-checkout): canonical identity, one payable
// session, no double Presence across circuits. Isolated mocks only — no Stripe, no network.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createQa, OWNER } from "./support/entry350Qa";
import { resolveInvitedIdentity } from "../../supabase/functions/_shared/invitedIdentity";

let qa: Awaited<ReturnType<typeof createQa>>;
beforeEach(async () => { qa = await createQa(); }, 15000);
afterEach(async () => { await qa.close(); });

const active = () => qa.reservations.rows.filter((r) => r.status === "reserved" || r.status === "open");

describe("invited checkout — canonical identity before Stripe", () => {
  it("refuses slug-only, unknown, expired and revoked tokens with the canonical path, no Stripe object", async () => {
    const bodies = [
      { slug: "some-page", email: "x@qa.invalid", test_mode: true },
      { activation_token: "vpt_unknown_token_000000", test_mode: true },
      { activation_token: qa.invite({ expired: true }).token, test_mode: true },
      { activation_token: qa.invite({ revoked: true }).token, test_mode: true },
      { landing_token: "landing_unknown_000000", test_mode: true },
    ];
    for (const b of bodies) {
      const r = await qa.checkout("invited", b);
      expect(r.status).toBe(401);
      expect(r.body.code).toBe("verified_identity_required");
      expect(r.body.next_path).toBe("/entrepreneurs");
    }
    expect(qa.configs).toHaveLength(0);
    expect(qa.reservations.rows).toHaveLength(0);
  });

  it("refuses an ambiguous contractor link (two accounts, same email) before Stripe", async () => {
    await qa.db.query("insert into contractors(user_id,email) values ($1,'dup@qa.invalid'),(gen_random_uuid(),'dup@qa.invalid')", [OWNER]);
    const r = await qa.checkout("invited", { activation_token: qa.invite({ email: "dup@qa.invalid" }).token, test_mode: true });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("identity_ambiguous");
    expect(qa.configs).toHaveLength(0);
  });

  it("resolver never accepts a token prefix or a client-declared identity", async () => {
    const { token } = qa.invite();
    const db = { from: (t: string) => ({ select: () => ({ eq: (k: string, v: string) => ({
      maybeSingle: async () => ({ data: (qa.peripheral.get(t) ?? []).find((r: any) => r[k] === v) ?? null, error: null }),
      limit: async () => ({ data: [], error: null }),
    }) }) }) };
    expect((await resolveInvitedIdentity(db, { activation_token: token.slice(0, -3) })).ok).toBe(false);
    expect((await resolveInvitedIdentity(db, { activation_token: token })).ok).toBe(true);
  });
});

describe("invited checkout — one payable session", () => {
  it("identical retries reuse the same session; one Stripe create, one active reservation", async () => {
    const { token } = qa.invite({ email: "inv1@qa.invalid" });
    const body = { activation_token: token, email: "inv1@qa.invalid", test_mode: true };
    const [a, b, c] = [await qa.checkout("invited", body), await qa.checkout("invited", body), await qa.checkout("invited", body)];
    expect([a.status, b.status, c.status]).toEqual([200, 200, 200]);
    expect(b.body.url).toBe(a.body.url);
    expect(b.body.reused).toBe(true);
    expect(qa.configs).toHaveLength(1);
    expect(active()).toHaveLength(1);
    expect(active()[0].subject.startsWith("p:verified_contractor_prospects:")).toBe(true);
    expect(qa.configs[0].metadata.checkout_reservation_id).toBe(active()[0].id);
    expect(typeof qa.configs[0].expires_at).toBe("number");
  });

  it("a different request expires the open session before creating another (never two payable)", async () => {
    const { token } = qa.invite();
    expect((await qa.checkout("invited", { activation_token: token, email: "a@qa.invalid", test_mode: true })).status).toBe(200);
    expect((await qa.checkout("invited", { activation_token: token, email: "b@qa.invalid", test_mode: true })).status).toBe(200);
    expect(qa.sessions).toHaveLength(2);
    expect(qa.sessions[0].status).toBe("expired");
    expect(qa.sessions.filter((s) => s.status === "open")).toHaveLength(1);
    expect(active()).toHaveLength(1);
  });

  it("a paid session blocks any new invited payment for the same prospect", async () => {
    const { token } = qa.invite({ email: "paid@qa.invalid" });
    const body = { activation_token: token, email: "paid@qa.invalid", test_mode: true };
    expect((await qa.checkout("invited", body)).status).toBe(200);
    qa.sessions[0].delivered = true; // Stripe now reports it paid/complete
    const r = await qa.checkout("invited", { ...body, email: "other@qa.invalid" });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("payment_received_pending");
    expect(qa.configs).toHaveLength(1);
  });

  it("reservation failure refuses before Stripe", async () => {
    qa.failRpcNext("reserve_prospect_checkout");
    const r = await qa.checkout("invited", { activation_token: qa.invite().token, test_mode: true });
    expect(r.status).toBe(503);
    expect(qa.configs).toHaveLength(0);
  });

  it("record failure: session expired at Stripe, reservation released only after confirmed expiry", async () => {
    qa.failNext("billing_checkout_sessions");
    const r = await qa.checkout("invited", { activation_token: qa.invite().token, test_mode: true });
    expect(r.status).toBe(503);
    expect(r.body.url).toBeUndefined();
    expect(qa.sessions[0].status).toBe("expired");
    expect(active()).toHaveLength(0);
    expect(qa.reservations.rows[0].status).toBe("expired");
  });
});

describe("invited checkout — proven existing contractor uses the contractor lock", () => {
  it("valid annual Presence → refused, no Stripe object", async () => {
    const { rows } = await qa.db.query<any>("insert into contractors(user_id,email) values ($1,'owner-one@qa.invalid') returning id", [OWNER]);
    await qa.db.query("insert into contractor_activation_ledger(contractor_id,action,source,metadata) values ($1,'entry_activation_350_paid','stripe_webhook','{\"stripe_session_id\":\"cs_x\"}')", [rows[0].id]);
    const r = await qa.checkout("invited", { activation_token: qa.invite({ email: "owner-one@qa.invalid" }).token, test_mode: true });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("annual_presence_still_valid");
    expect(qa.configs).toHaveLength(0);
  });

  it("no valid Presence → reservation keyed on the contractor (shared with the personal circuit)", async () => {
    const { rows } = await qa.db.query<any>("insert into contractors(user_id,email) values ($1,'owner-one@qa.invalid') returning id", [OWNER]);
    const r = await qa.checkout("invited", { activation_token: qa.invite({ email: "owner-one@qa.invalid" }).token, test_mode: true });
    expect(r.status).toBe(200);
    expect(active()).toHaveLength(1);
    expect(active()[0].subject).toBe(`c:${rows[0].id}`);
    expect(qa.peripheral.get("billing_checkout_sessions")?.[0]?.contractor_id).toBe(rows[0].id);
  });
});

describe("invited checkout — Stripe wording", () => {
  it("says 350 $ per year + taxes, 12 months, manual renewal; never one-time / no subscription", async () => {
    expect((await qa.checkout("invited", { activation_token: qa.invite().token, test_mode: true })).status).toBe(200);
    const c = qa.configs[0];
    const texts = [c.line_items[0].price_data.product_data.name, c.line_items[0].price_data.product_data.description, c.payment_intent_data.description, c.custom_text.submit.message].join(" | ");
    expect(c.line_items[0].price_data.product_data.name).toContain("350 $ CA par année + taxes");
    expect(c.custom_text.submit.message).toContain("402,41 $");
    expect(c.custom_text.submit.message).toContain("renouvellement manuel");
    expect(c.payment_intent_data.description).toContain("Renouvellement manuel, jamais automatique");
    expect(texts).not.toMatch(/paiement unique|aucun abonnement/i);
  });
});
