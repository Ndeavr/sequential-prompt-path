// @vitest-environment node
// Runs the REAL migrated contractor_plan_code() SQL in an in-memory Postgres
// (PGlite) with production-shaped tables. No remote database is touched.
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { entryPackBlockReason } from "../../supabase/functions/_shared/checkoutGuards";
import { revokeEntry350 } from "../../supabase/functions/_shared/entry350Revocation";

const OWNER = "00000000-0000-0000-0000-00000000000a";
const OTHER = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-0000000000c1";
let db: PGlite;

const fn = readFileSync("drizzle/migrations/0023_entry_350_presence_entitlement.sql", "utf8");

async function asUser(uid: string | null, target = OWNER): Promise<string | null> {
  await db.query(`select set_config('test.uid', $1, false)`, [uid ?? ""]);
  const r = await db.query<{ p: string | null }>(`select public.contractor_plan_code($1) p`, [target]);
  return r.rows[0].p;
}

async function paid(opts: { sid: string; live?: boolean; ledgerLive?: boolean; amount?: number; currency?: string; offer?: string; ageDays?: number; source?: string; eventLive?: boolean; noEvent?: boolean }) {
  const evt = `evt_${opts.sid}`;
  if (!opts.noEvent) {
    await db.query(
      `insert into stripe_webhook_events(stripe_event_id, session_id, event_type, livemode, payload) values ($1,$2,'checkout.session.completed',$3,$4)`,
      [evt, opts.sid, opts.eventLive ?? opts.live ?? true, JSON.stringify({ data: { object: {
        payment_status: "paid", amount_subtotal: opts.amount ?? 35000, currency: opts.currency ?? "cad",
        metadata: { offer: opts.offer ?? "entry_activation_350" } } } })],
    );
  }
  await db.query(
    `insert into contractor_activation_ledger(contractor_id, action, source, metadata, created_at)
     values ($1,'entry_activation_350_paid',$2,$3, now() - make_interval(days => $4))`,
    [C, opts.source ?? "stripe_webhook", JSON.stringify({ stripe_session_id: opts.sid, stripe_event_id: evt, stripe_payment_intent: `pi_${opts.sid}`, livemode: opts.ledgerLive ?? opts.live ?? true }), opts.ageDays ?? 1],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create table public.user_roles(user_id uuid, role text);
    create function public.has_role(_u uuid, _r text) returns boolean language sql stable as $$ select exists(select 1 from public.user_roles where user_id=_u and role=_r) $$;
    create function public.canonical_plan_code(_code text) returns text language sql immutable as $$ select lower(coalesce(_code,'')) $$;
    create table public.contractors(id uuid primary key, user_id uuid);
    create table public.contractor_subscriptions(contractor_id uuid, plan_id text, status text, updated_at timestamptz default now());
    create table public.contractor_activation_ledger(id serial, contractor_id uuid, action text, source text, metadata jsonb, created_at timestamptz default now());
    create table public.stripe_webhook_events(stripe_event_id text unique, session_id text, event_type text, livemode boolean, payload jsonb);
  `);
  await db.exec(fn);
});

beforeEach(async () => {
  await db.exec(`truncate contractors, contractor_subscriptions, contractor_activation_ledger, stripe_webhook_events, user_roles;`);
  await db.query(`insert into contractors values ($1,$2)`, [C, OWNER]);
});

describe("Présence IA 12 mois — résolveur canonique contractor_plan_code", () => {
  it("aucun paiement = aucun plan", async () => {
    expect(await asUser(OWNER)).toBeNull();
  });
  it("paiement LIVE vérifié 350 $ CAD = presence pour le propriétaire", async () => {
    await paid({ sid: "cs_live_1" });
    expect(await asUser(OWNER)).toBe("presence");
  });
  it("le circuit invité entry_pack_350 est aussi reconnu", async () => {
    await paid({ sid: "cs_live_pack", offer: "entry_pack_350" });
    expect(await asUser(OWNER)).toBe("presence");
  });
  it("un paiement TEST n'accorde jamais de droit", async () => {
    await paid({ sid: "cs_test_1", live: false });
    expect(await asUser(OWNER)).toBeNull();
  });
  it("registre falsifié livemode=true sans événement Stripe LIVE signé = refusé", async () => {
    await paid({ sid: "cs_forged", ledgerLive: true, eventLive: false });
    await paid({ sid: "cs_noevent", noEvent: true });
    await paid({ sid: "cs_manual", source: "admin_manual" });
    expect(await asUser(OWNER)).toBeNull();
  });
  it("montant ou devise autres que 35 000 ¢ CAD = refusé", async () => {
    await paid({ sid: "cs_100", amount: 100 });
    await paid({ sid: "cs_usd", currency: "usd" });
    await paid({ sid: "cs_other", offer: "founder_premium_7d" });
    expect(await asUser(OWNER)).toBeNull();
  });
  it("expire 12 mois après le paiement d'origine; un 2e paiement ne prolonge pas", async () => {
    await paid({ sid: "cs_old", ageDays: 370 });
    expect(await asUser(OWNER)).toBeNull();
    await paid({ sid: "cs_new", ageDays: 1 });
    expect(await asUser(OWNER)).toBeNull();
    await db.exec(`truncate contractor_activation_ledger, stripe_webhook_events`);
    await paid({ sid: "cs_recent", ageDays: 360 });
    expect(await asUser(OWNER)).toBe("presence");
  });
  it("remboursement ou litige retire le droit (idempotent)", async () => {
    await paid({ sid: "cs_ref" });
    const adapter = pgAdapter();
    expect(await revokeEntry350(adapter, { paymentIntentId: "pi_cs_ref", eventId: "evt_r", livemode: true, reason: "refunded" })).toBe("revoked");
    expect(await revokeEntry350(adapter, { paymentIntentId: "pi_cs_ref", eventId: "evt_r2", livemode: true, reason: "disputed" })).toBe("already_revoked");
    expect(await asUser(OWNER)).toBeNull();
  });
  it("un autre utilisateur connecté ne peut pas lire le plan; anonyme serveur et admin oui", async () => {
    await paid({ sid: "cs_auth" });
    expect(await asUser(OTHER)).toBeNull();
    await db.query(`insert into user_roles values ($1,'admin')`, [OTHER]);
    expect(await asUser(OTHER)).toBe("presence");
    expect(await asUser(null)).toBe("presence");
  });
  it("un abonnement payé actif garde la priorité", async () => {
    await paid({ sid: "cs_sub" });
    await db.query(`insert into contractor_subscriptions values ($1,'pro_v2','active')`, [C]);
    expect(await asUser(OWNER)).toBe("pro_v2");
  });
});

describe("pack invité — garde webhook", () => {
  it("bloque TEST et montant inattendu, accepte LIVE exact", () => {
    expect(entryPackBlockReason({ livemode: false, amountSubtotal: 35000, currency: "cad" })).toBe("ignored_test");
    expect(entryPackBlockReason({ livemode: null, amountSubtotal: 35000, currency: "cad" })).toBe("ignored_test");
    expect(entryPackBlockReason({ livemode: true, amountSubtotal: 100, currency: "cad" })).toBe("ignored_amount_mismatch");
    expect(entryPackBlockReason({ livemode: true, amountSubtotal: 35000, currency: "usd" })).toBe("ignored_amount_mismatch");
    expect(entryPackBlockReason({ livemode: true, amountSubtotal: 35000, currency: "CAD" })).toBeNull();
  });
  it("câblage : reçu au registre en LIVE seulement, échec rejoué, révocation branchée", () => {
    const wh = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    const i = wh.indexOf('session.metadata?.offer === "entry_pack_350" && event.livemode === true');
    expect(i).toBeGreaterThan(0);
    expect(wh.slice(i, i + 900)).toContain('action: "entry_activation_350_paid"');
    expect(wh).toContain("if (entryPackFatal) throw entryPackFatal;");
    expect(wh).toMatch(/charge\.dispute\.created[\s\S]{0,400}revokeEntry350/);
  });
});

// Minimal supabase-js-like adapter over PGlite for the revocation helper.
function pgAdapter() {
  return {
    from(table: string) {
      const where: string[] = []; const args: unknown[] = []; let ins: Record<string, unknown> | null = null;
      const add = (col: string, op: string, v: unknown) => {
        const c = col.includes("->>") ? `${col.split("->>")[0]}->>'${col.split("->>")[1]}'` : col;
        args.push(v); where.push(`${c} ${op} $${args.length}`);
      };
      const q: any = {
        select() { return q; }, eq(c: string, v: unknown) { add(c, "=", v); return q; }, limit() { return q; },
        insert(v: Record<string, unknown>) { ins = v; return q; },
        then(res: (r: unknown) => unknown, rej: (e: unknown) => unknown) {
          const run = async () => {
            if (table === "admin_notifications") return { error: null };
            if (ins) {
              const keys = Object.keys(ins);
              await db.query(`insert into ${table}(${keys.join(",")}) values (${keys.map((_, k) => `$${k + 1}`).join(",")})`,
                keys.map((k) => (typeof ins![k] === "object" ? JSON.stringify(ins![k]) : ins![k])));
              return { error: null };
            }
            const r = await db.query(`select * from ${table} where ${where.join(" and ")} limit 1`, args);
            return { data: r.rows, error: null };
          };
          return run().then(res, rej);
        },
      };
      return q;
    },
  };
}
