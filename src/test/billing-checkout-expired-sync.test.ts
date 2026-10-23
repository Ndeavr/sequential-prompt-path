// @vitest-environment node
import { describe, it, expect } from "vitest";
import { compileWebhookBranch, webhookSource } from "./support/stripeWebhookHarness";
import { webhookEntryDecision } from "../../supabase/functions/_shared/webhookAuth";

type Row = { stripe_checkout_session_id: string; checkout_status: string; payment_status: string };

function fakeDb(rows: Row[]) {
  const writes: { table: string; patch: Record<string, unknown> }[] = [];
  return {
    writes,
    from(table: string) {
      let patch: Record<string, unknown> = {};
      const f: Record<string, unknown> = {};
      const q: any = {
        update(p: Record<string, unknown>) { patch = p; return q; },
        eq(k: string, v: unknown) { f[k] = v; return q; },
        then(res: (v: unknown) => void) {
          if (table === "billing_checkout_sessions") {
            for (const r of rows) {
              if (Object.entries(f).every(([k, v]) => (r as any)[k] === v)) {
                Object.assign(r, patch);
                writes.push({ table, patch });
              }
            }
          }
          return Promise.resolve({ error: null }).then(res);
        },
      };
      return q;
    },
  };
}

const run = async (session: unknown, db: unknown) => {
  const fn = await compileWebhookBranch(
    "const redemptionId = session.metadata?.redemption_id;",
    "// Reverse promo reservation",
    ["session", "supabase"],
  );
  await fn(session, db);
};

const expired = { id: "cs_live_A", status: "expired", payment_status: "unpaid", metadata: {} };

describe("checkout.session.expired → billing_checkout_sessions", () => {
  it("open/unpaid exact id becomes expired; other rows untouched", async () => {
    const rows = [
      { stripe_checkout_session_id: "cs_live_A", checkout_status: "open", payment_status: "unpaid" },
      { stripe_checkout_session_id: "cs_live_B", checkout_status: "open", payment_status: "unpaid" },
    ];
    await run(expired, fakeDb(rows));
    expect(rows[0].checkout_status).toBe("expired");
    expect(rows[1].checkout_status).toBe("open");
  });

  it("double callback is idempotent (second is a no-op)", async () => {
    const rows = [{ stripe_checkout_session_id: "cs_live_A", checkout_status: "open", payment_status: "unpaid" }];
    const db = fakeDb(rows);
    await run(expired, db); await run(expired, db);
    expect(db.writes.filter((w) => w.table === "billing_checkout_sessions")).toHaveLength(1);
  });

  it("absent session: no write", async () => {
    const db = fakeDb([]);
    await run(expired, db);
    expect(db.writes).toHaveLength(0);
  });

  it("paid row never downgraded; paid payload never expires anything", async () => {
    const rows = [{ stripe_checkout_session_id: "cs_live_A", checkout_status: "paid", payment_status: "paid" }];
    await run(expired, fakeDb(rows));
    expect(rows[0]).toMatchObject({ checkout_status: "paid", payment_status: "paid" });
    const open = [{ stripe_checkout_session_id: "cs_live_A", checkout_status: "open", payment_status: "unpaid" }];
    await run({ ...expired, payment_status: "paid" }, fakeDb(open));
    expect(open[0].checkout_status).toBe("open");
  });

  it("forged/unsigned POST without secret is rejected before any branch", () => {
    expect(webhookEntryDecision({ liveSecret: null, testSecret: null, replayToken: "forged", serviceRoleKey: "k" }))
      .toBe("reject_unavailable");
    expect(webhookSource()).toContain("constructEventAsync");
  });

  it("expired branch grants no entitlement", () => {
    const src = webhookSource();
    const s = src.indexOf('case "checkout.session.expired": {');
    const branch = src.slice(s, src.indexOf("break;", s));
    expect(branch).not.toMatch(/entitlement|activate_contractor|activation_status/);
  });
});
