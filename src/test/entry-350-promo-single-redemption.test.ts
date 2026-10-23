// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { entry350LedgerConflict } from "../../supabase/functions/_shared/checkoutGuards";
import { compileWebhookBranch, realSharedImports } from "./support/stripeWebhookHarness";
import { ENTRY350_PROMO_TAX_CONTRACT } from "../../supabase/functions/_shared/entry350Promo";

const setup = async () => {
  const db = new PGlite();
  await db.exec(`CREATE TABLE public.contractor_activation_ledger(id uuid default gen_random_uuid(), contractor_id uuid,
    action text, source text, metadata jsonb, created_at timestamptz default now());`);
  await db.exec(readFileSync("drizzle/migrations/0014_entry_activation_350_ledger_action.sql", "utf8").split("\n").filter(l => !/CONSTRAINT/.test(l)).join("\n"));
  await db.exec(readFileSync("docs/migrations-staged/20261023_entry350_single_promo_redemption.sql", "utf8"));
  return db;
};
const insert = (db: PGlite, contractor: string, session: string, promo?: string) =>
  db.query(`INSERT INTO contractor_activation_ledger(contractor_id,action,source,metadata) VALUES($1,'entry_activation_350_paid','stripe_webhook',$2)`,
    [contractor, JSON.stringify({ stripe_session_id: session, amount_cents: promo ? 115 : 40241, ...(promo ? { promo_code_id: promo } : {}) })])
    .then(() => null, (e: Error) => entry350LedgerConflict(e.message));

// In-memory Postgres boot takes ~3 s alone; allow headroom under the full parallel suite.
describe("PROMO : un seul reçu global", { timeout: 30_000 }, () => {
  it("deux sessions payées concurrentes, deux comptes, même code : une seule inscrite, l'autre bloquée", async () => {
    const db = await setup();
    const results = await Promise.all([
      insert(db, "00000000-0000-0000-0000-00000000000a", "cs_test_A", "promo_test_1"),
      insert(db, "00000000-0000-0000-0000-00000000000b", "cs_test_B", "promo_test_1"),
    ]);
    expect(results.sort()).toEqual([null, "promo_already_redeemed"].sort());
    const rows = await db.query<{ n: number; total: number }>(`SELECT count(*)::int n, sum((metadata->>'amount_cents')::int)::int total FROM contractor_activation_ledger`);
    expect(rows.rows[0]).toEqual({ n: 1, total: 115 }); // aucun deuxième revenu fictif
    // Un ID promo LIVE distinct et les ventes plein prix ne sont pas touchés.
    expect(await insert(db, "00000000-0000-0000-0000-00000000000c", "cs_live_C", "promo_live_1")).toBeNull();
    expect(await insert(db, "00000000-0000-0000-0000-00000000000d", "cs_test_D")).toBeNull();
    expect(await insert(db, "00000000-0000-0000-0000-00000000000e", "cs_test_E")).toBeNull();
  });

  it("relivraison de la même session = idempotente, jamais classée comme deuxième usage", async () => {
    const db = await setup();
    expect(await insert(db, "00000000-0000-0000-0000-00000000000a", "cs_test_A", "promo_test_1")).toBeNull();
    // Même session : l'index de session échoue en premier ou l'index promo… le webhook doit vérifier la session.
    const err = await insert(db, "00000000-0000-0000-0000-00000000000a", "cs_test_A", "promo_test_1");
    expect(err).not.toBeNull();
    expect(entry350LedgerConflict('duplicate key value violates unique constraint "uq_ledger_entry350_session"')).toBe("same_session");
    expect(entry350LedgerConflict('duplicate key value violates unique constraint "uq_entry350_single_promo_redemption"')).toBe("promo_already_redeemed");
    expect(entry350LedgerConflict('duplicate key value violates unique constraint "contractor_activation_ledger_pkey"')).toBeNull();
    expect(entry350LedgerConflict(null)).toBeNull();
  });

  it("branche réelle : course PROMO TEST = un reçu et un seul compte activé; autre session alertée; retry sans nouveau revenu", async () => {
    const db = await setup();
    const activated = new Set<string>();
    const roles = new Set<string>();
    const alerts: Record<string, any>[] = [];
    const statuses: string[] = [];
    const adapter = {
      auth: { admin: { getUserById: async () => ({ data: { user: { email: "e2e+promo@unpro.ca" } } }) } },
      from(table: string) {
        let payload: any, operation = "read", originalLookup = false, contractor = "";
        const q: any = {
          select(columns: string) { originalLookup = columns === "contractor_id, metadata"; return q; },
          eq(key: string, value: string) { if (key === "id") contractor = value; return q; },
          neq() { return q; }, limit() { return q; },
          insert(value: any) { payload = value; operation = "insert"; return q; },
          upsert(value: any) { payload = value; operation = "upsert"; return q; },
          update(value: any) { payload = value; operation = "update"; return q; },
          async maybeSingle() {
            if (table === "contractors") return { data: { user_id: contractor, activation_status: "pending" }, error: null };
            if (originalLookup) {
              const r = await db.query(`SELECT contractor_id, metadata FROM contractor_activation_ledger LIMIT 1`);
              return { data: r.rows[0] ?? null, error: null };
            }
            // Deliberately stale reads for BOTH workers: only the SQL constraint can arbitrate.
            return { data: null, error: null };
          },
          then(resolve: (v: any) => unknown, reject: (e: unknown) => unknown) {
            const run = async () => {
              if (table === "contractor_activation_ledger" && operation === "insert") {
                try {
                  await db.query(`INSERT INTO contractor_activation_ledger(contractor_id,action,source,metadata) VALUES($1,$2,$3,$4)`,
                    [payload.contractor_id, payload.action, payload.source, JSON.stringify(payload.metadata)]);
                } catch (e) { return { error: { message: e instanceof Error ? e.message : String(e) } }; }
              }
              if (table === "user_roles") roles.add(payload.user_id);
              if (table === "contractors" && operation === "update") activated.add(contractor);
              if (table === "admin_notifications" && payload.type === "entry_activation_350_promo_duplicate") alerts.push(payload);
              if (table === "stripe_webhook_events") statuses.push(payload.processing_status);
              return { error: null };
            };
            return run().then(resolve, reject);
          },
        };
        return q;
      },
    };
    const shared = await realSharedImports();
    const branch = await compileWebhookBranch('if (session.metadata?.offer === "entry_activation_350")', "// ── OFFRE DE REPLI",
      ["supabase", "session", "event", "corsHeaders", ...Object.keys(shared)]);
    const sessions = ["a", "b"].map((suffix) => ({ id: `cs_test_${suffix}`, mode: "payment", currency: "cad", payment_status: "paid",
      amount_subtotal: 35000, amount_total: 115, total_details: { amount_tax: 15, amount_discount: 34900 },
      metadata: { offer: "entry_activation_350", contractor_id: `00000000-0000-0000-0000-00000000000${suffix}`,
        entry_tax_contract: ENTRY350_PROMO_TAX_CONTRACT, promo_code_id: "promo_test_race", promo_coupon_id: "coupon_test" } }));
    const run = (session: typeof sessions[number]) => branch(adapter, session, { id: `evt_${session.id}`, livemode: false }, {}, ...Object.values(shared));
    const results = await Promise.all(sessions.map(run));
    expect(results.filter((r) => r instanceof Response)).toHaveLength(1);
    expect(activated.size).toBe(1);
    expect(roles.size).toBe(1);
    expect(alerts).toHaveLength(1);
    expect(statuses).toEqual(["duplicate_promo_redemption"]);
    const receipts = await db.query<{ metadata: { stripe_session_id: string; livemode: boolean; amount_cents: number } }>(`SELECT metadata FROM contractor_activation_ledger`);
    expect(receipts.rows).toHaveLength(1);
    const receipt = receipts.rows[0].metadata;
    expect(receipt.livemode).toBe(false); // a local TEST receipt is never a LIVE sale
    expect(receipt.amount_cents).toBe(115);
    expect(alerts[0].payload_json.original_stripe_session_id).toBe(receipt.stripe_session_id);
    expect(alerts[0].payload_json.stripe_session_id).not.toBe(receipt.stripe_session_id);
    const winner = sessions.find((s) => s.id === receipt.stripe_session_id);
    if (!winner) throw new Error("Winning TEST session missing");
    await run(winner); // force same-session unique violation, including promo-index-first handling
    expect(activated.size).toBe(1);
    expect(alerts).toHaveLength(1);
    const totals = await db.query<{ n: number; live: number; total: number }>(`SELECT count(*)::int n,
      count(*) FILTER (WHERE metadata->>'livemode'='true')::int live, sum((metadata->>'amount_cents')::int)::int total FROM contractor_activation_ledger`);
    expect(totals.rows[0]).toEqual({ n: 1, live: 0, total: 115 });
    await db.close();
  });
});
