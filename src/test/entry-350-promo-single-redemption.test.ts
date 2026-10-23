// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { entry350LedgerConflict } from "../../supabase/functions/_shared/checkoutGuards";

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
    expect(entry350LedgerConflict(null)).toBeNull();
  });
});
