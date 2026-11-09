// @vitest-environment node
/**
 * Garantie « 350 $ : 10 contrats » — règles SQL réelles (PGlite, rôles et RLS
 * Postgres). Données synthétiques seulement; aucune connexion distante.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const OWNER = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000a2";
const ADMIN = "00000000-0000-4000-8000-0000000000a3";
const C1 = "10000000-0000-4000-8000-000000000001";
const C2 = "10000000-0000-4000-8000-000000000002";

function migrationSql(): string {
  if (process.env.GUARANTEE_SQL_FILE) return readFileSync(process.env.GUARANTEE_SQL_FILE, "utf8");
  const file = readdirSync("drizzle/migrations").find((f) => f.endsWith("_contract_guarantee_offer.sql"));
  if (!file) throw new Error("migration contract_guarantee_offer introuvable");
  return readFileSync(`drizzle/migrations/${file}`, "utf8");
}

let db: PGlite;

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE ${uid ? "authenticated" : "service_role"}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  try { return await fn(); } finally { await db.exec("RESET ROLE"); }
}

async function recordPayment(session: string, contractor = C1, paidAt = "2026-11-10T12:00:00Z", extra: Partial<{ subtotal: number; discount: number; mode: string }> = {}) {
  return as(null, async () => (await db.query<{ r: Record<string, string> }>(
    "select public.record_contract_guarantee_payment($1,'allume_350_10_contrats_v1',$2,$3,'pi_'||$3,'evt_'||$3,$4,5241,40241,$5,$6::timestamptz) r",
    [contractor, extra.mode ?? "test", session, extra.subtotal ?? 35000, extra.discount ?? 0, paidAt])).rows[0].r);
}

async function declare(uid: string, guarantee: string) {
  return as(uid, async () => (await db.query<{ id: string }>(
    "select public.declare_guarantee_contract($1,'Installation de lumières de Noël','Laval','Client synthétique A','C-001','Contrat signé') id", [guarantee])).rows[0].id);
}

async function count(contractId: string, acceptedAt = "2026-12-01T12:00:00Z") {
  await as(ADMIN, () => db.query(
    "select public.admin_review_guarantee_contract($1,'counted','signed_contract',$2::timestamptz,'Contrat signé par le client (synthétique)',true,'Preuve synthétique vérifiée pour le test')",
    [contractId, acceptedAt]));
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    CREATE TABLE public.user_roles(user_id uuid, role text, UNIQUE(user_id, role));
    CREATE FUNCTION public.has_role(_u uuid, _r text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
      SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _u AND role = _r) $$;
    GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;
    CREATE TABLE public.contractors(id uuid PRIMARY KEY, user_id uuid, business_name text);
    GRANT SELECT ON public.contractors TO authenticated; GRANT ALL ON public.contractors TO service_role;
    INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
    INSERT INTO public.contractors VALUES ('${C1}', '${OWNER}', 'Entreprise synthétique 1'), ('${C2}', '${OTHER}', 'Entreprise synthétique 2');
  `);
  await db.exec(migrationSql());
});

describe("garantie 10 contrats — paiement", () => {
  it("un paiement signé enregistre une seule garantie, même relivré", async () => {
    const first = await recordPayment("cs_test_a");
    const replay = await recordPayment("cs_test_a");
    expect(first.status).toBe("recorded");
    expect(replay.status).toBe("already_recorded");
    const rows = (await db.query<{ n: number; ends: string }>("select count(*)::int n, max(ends_at)::text ends from contractor_contract_guarantees")).rows[0];
    expect(rows.n).toBe(1);
    expect(rows.ends.startsWith("2027-11-10")).toBe(true);
  });

  it("refuse un deuxième paiement pendant une garantie en cours, un rabais ou un mauvais montant", async () => {
    await recordPayment("cs_test_a");
    expect((await recordPayment("cs_test_b", C1, "2027-01-01T00:00:00Z")).status).toBe("overlap");
    expect((await recordPayment("cs_test_c", C2, undefined, { discount: 34900 })).reason).toBe("amount_mismatch");
    expect((await recordPayment("cs_test_d", C2, undefined, { subtotal: 100 })).reason).toBe("amount_mismatch");
    expect((await db.query<{ n: number }>("select count(*)::int n from contractor_contract_guarantees")).rows[0].n).toBe(1);
  });

  it("sépare LIVE et TEST", async () => {
    await recordPayment("cs_test_a", C1, undefined, { mode: "test" });
    expect((await recordPayment("cs_live_a", C1, undefined, { mode: "live" })).status).toBe("recorded");
  });

  it("un remboursement ou litige met la garantie en revue sans la supprimer", async () => {
    await recordPayment("cs_test_a");
    const r = await as(null, async () => (await db.query<{ r: Record<string, string> }>(
      "select public.flag_contract_guarantee_payment_event('pi_cs_test_a','evt_refund_1','refunded',40241) r")).rows[0].r);
    const again = await as(null, async () => (await db.query<{ r: Record<string, string> }>(
      "select public.flag_contract_guarantee_payment_event('pi_cs_test_a','evt_refund_1','refunded',40241) r")).rows[0].r);
    expect(r.status).toBe("flagged");
    expect(again.status).toBe("already_processed");
    expect((await db.query<{ status: string }>("select status from contractor_contract_guarantees")).rows[0].status).toBe("payment_review");
  });

  it("le client ne peut ni enregistrer un paiement ni écrire directement", async () => {
    await expect(as(OWNER, () => db.query(
      "select public.record_contract_guarantee_payment($1,'allume_350_10_contrats_v1','live','cs_x','pi','evt',35000,0,35000,0,now())", [C1]))).rejects.toThrow(/permission denied/);
    await recordPayment("cs_test_a");
    await expect(as(OWNER, () => db.query("update contractor_contract_guarantees set status='refund_due'"))).rejects.toThrow(/permission denied/);
    await expect(as(OWNER, () => db.query("insert into contractor_guarantee_contracts(guarantee_id,contractor_id,service_label,city,client_reference,contractor_accepted_at,contractor_accepted_by,status) select id,$1,'x x','Laval','client',now(),$2,'counted' from contractor_contract_guarantees", [C1, OWNER]))).rejects.toThrow(/permission denied/);
  });

  it("la version d'offre est immuable", async () => {
    await expect(db.query("update contractor_offer_versions set refund_per_missing_cents=1000")).rejects.toThrow(/offer_version_immutable/);
    await expect(db.query("delete from contractor_offer_versions")).rejects.toThrow(/offer_version_immutable/);
  });
});

describe("garantie 10 contrats — solde", () => {
  async function balance(uid = OWNER) {
    return as(uid, async () => (await db.query<{ counted_contracts: number; refund_base_cents: number; missing_contracts: number }>(
      "select counted_contracts, refund_base_cents, missing_contracts from public.my_contract_guarantees()")).rows);
  }

  it.each([[0, 35000], [4, 21000], [10, 0], [12, 0]])("%i contrats comptés → base %i cents", async (n, expected) => {
    const g = (await recordPayment("cs_test_a")).guarantee_id;
    for (let i = 0; i < n; i++) await count(await declare(OWNER, g));
    const [row] = await balance();
    expect(row.counted_contracts).toBe(n);
    expect(row.refund_base_cents).toBe(expected);
  });

  it("formule SQL 0/4/10/12 → 350/210/0/0 $", async () => {
    const r = (await db.query<{ a: number; b: number; c: number; d: number }>(
      "select contract_guarantee_refund_base_cents(0,10,3500,35000) a, contract_guarantee_refund_base_cents(4,10,3500,35000) b, contract_guarantee_refund_base_cents(10,10,3500,35000) c, contract_guarantee_refund_base_cents(12,10,3500,35000) d")).rows[0];
    expect([r.a, r.b, r.c, r.d]).toEqual([35000, 21000, 0, 0]);
  });

  it("une déclaration unilatérale ne compte pas; un contrat sans preuve client ni concordance est refusé", async () => {
    const g = (await recordPayment("cs_test_a")).guarantee_id;
    const c = await declare(OWNER, g);
    expect((await balance())[0].counted_contracts).toBe(0);
    await expect(as(ADMIN, () => db.query(
      "select public.admin_review_guarantee_contract($1,'counted',NULL,NULL,NULL,true,'Tentative sans acceptation du client')", [c]))).rejects.toThrow(/contract_not_countable/);
    await expect(as(ADMIN, () => db.query(
      "select public.admin_review_guarantee_contract($1,'counted','signed_contract','2026-12-01'::timestamptz,'Contrat signé par le client',false,'Service hors du profil déclaré')", [c]))).rejects.toThrow(/contract_not_countable/);
    await expect(as(ADMIN, () => db.query(
      "select public.admin_review_guarantee_contract($1,'counted','signed_contract','2028-01-01'::timestamptz,'Contrat signé par le client',true,'Acceptation après la période')", [c]))).rejects.toThrow(/contract_not_countable/);
    expect((await balance())[0].counted_contracts).toBe(0);
  });

  it("une revue d'annulation ouverte conserve le contrat compté jusqu'à décision", async () => {
    const g = (await recordPayment("cs_test_a")).guarantee_id;
    const c = await declare(OWNER, g);
    await count(c);
    await as(ADMIN, () => db.query("select public.admin_review_guarantee_contract($1,'open_cancellation_review',NULL,NULL,NULL,NULL,'Client signale une annulation à vérifier')", [c]));
    expect((await balance())[0].counted_contracts).toBe(1);
  });

  it("un autre entrepreneur ne voit ni ne déclare sur la garantie", async () => {
    const g = (await recordPayment("cs_test_a")).guarantee_id;
    await declare(OWNER, g);
    expect(await balance(OTHER)).toEqual([]);
    expect((await as(OTHER, () => db.query("select id from contractor_contract_guarantees"))).rows).toEqual([]);
    expect((await as(OTHER, () => db.query("select id from contractor_guarantee_contracts"))).rows).toEqual([]);
    await expect(declare(OTHER, g)).rejects.toThrow(/guarantee_not_found/);
    await expect(as(OTHER, () => db.query("select * from public.admin_contract_guarantee_queue()"))).rejects.toThrow(/admin_required/);
  });

  it("file admin : remboursement dû seulement à l'échéance, jamais exécuté automatiquement", async () => {
    const g = (await recordPayment("cs_test_a", C1, "2025-01-01T00:00:00Z")).guarantee_id;
    const q = await as(ADMIN, async () => (await db.query<{ refund_base_cents: number; refund_total_estimate_cents: number; is_due: boolean }>(
      "select refund_base_cents, refund_total_estimate_cents, is_due from public.admin_contract_guarantee_queue()")).rows[0]);
    expect(q).toEqual({ refund_base_cents: 35000, refund_total_estimate_cents: 40241, is_due: true });
    await as(ADMIN, () => db.query("select public.admin_set_contract_guarantee_status($1,'refund_due',NULL,'Échéance atteinte, 0 contrat compté')", [g]));
    await expect(as(ADMIN, () => db.query("select public.admin_set_contract_guarantee_status($1,'closed_no_refund',NULL,'Tentative de fermeture sans remboursement')", [g]))).rejects.toThrow();
    const events = (await db.query<{ n: number }>("select count(*)::int n from contractor_contract_guarantee_events")).rows[0].n;
    expect(events).toBeGreaterThanOrEqual(2);
  });
});
