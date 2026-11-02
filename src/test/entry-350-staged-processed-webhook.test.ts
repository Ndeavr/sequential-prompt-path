// @vitest-environment node
// CI-only contract test for the STAGED entry350 entitlement hardening.
// Uses synthetic in-memory PostgreSQL; never calls Stripe or production Supabase.
// Passing this test is NOT approval to apply the staged migration.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const OWNER = "00000000-0000-0000-0000-00000000000a";
const OTHER = "00000000-0000-0000-0000-00000000000b";
const COMPANY = "00000000-0000-0000-0000-0000000000c1";
const STAGED_SQL = "docs/migrations-staged/20261102_entry350_processed_webhook_entitlement.sql";

let db: PGlite;

type EventState = {
  status?: string;
  success?: boolean;
  live?: boolean;
  amount?: number;
  daysAgo?: number;
};

async function receipt(session: string, opts: EventState = {}) {
  const event = `evt_${session}`;
  const payload = {
    data: {
      object: {
        payment_status: "paid",
        amount_subtotal: opts.amount ?? 35000,
        currency: "cad",
        metadata: { offer: "entry_activation_350" },
      },
    },
  };
  await db.query(
    `INSERT INTO public.stripe_webhook_events
       (stripe_event_id, session_id, event_type, livemode, payload, processing_status, success)
     VALUES ($1, $2, 'checkout.session.completed', $3, $4, $5, $6)`,
    [event, session, opts.live ?? true, JSON.stringify(payload), opts.status ?? "processed", opts.success ?? true],
  );
  await db.query(
    `INSERT INTO public.contractor_activation_ledger
       (contractor_id, action, source, metadata, created_at)
     VALUES ($1, 'entry_activation_350_paid', 'stripe_webhook', $2, now() - $3::int * interval '1 day')`,
    [COMPANY, JSON.stringify({ stripe_session_id: session, stripe_event_id: event, livemode: opts.live ?? true }), opts.daysAgo ?? 1],
  );
}

async function plan(viewer: string, target = OWNER) {
  await db.query("SELECT set_config('test.uid', $1, false)", [viewer]);
  const result = await db.query<{ plan: string | null }>(
    "SELECT public.contractor_plan_code($1) AS plan",
    [target],
  );
  return result.rows[0].plan;
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('test.uid', true), '')::uuid
    $$;
    CREATE TABLE public.user_roles (user_id uuid, role text);
    CREATE FUNCTION public.has_role(_uid uuid, _role text) RETURNS boolean
      LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = _role)
    $$;
    CREATE FUNCTION public.canonical_plan_code(_code text) RETURNS text
      LANGUAGE sql IMMUTABLE AS $$ SELECT lower(_code) $$;
    CREATE TABLE public.contractors (id uuid PRIMARY KEY, user_id uuid);
    CREATE TABLE public.contractor_subscriptions (
      contractor_id uuid, plan_id text, status text, updated_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.contractor_activation_ledger (
      contractor_id uuid, action text, source text, metadata jsonb, created_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.stripe_webhook_events (
      stripe_event_id text UNIQUE, session_id text, event_type text,
      livemode boolean, payload jsonb, processing_status text, success boolean
    );
  `);
  await db.exec(readFileSync(STAGED_SQL, "utf8"));
  await db.query("INSERT INTO public.contractors (id, user_id) VALUES ($1, $2)", [COMPANY, OWNER]);
}, 15000);

afterEach(async () => {
  await db?.close();
});

describe("staged $350 presence resolver — webhook terminal success gate (not deployed)", () => {
  it("denies a ledger receipt while processing, failed, or processed without success", async () => {
    await receipt("cs_pending", { status: "processing", success: false });
    expect(await plan(OWNER)).toBeNull();

    await db.query("UPDATE public.stripe_webhook_events SET processing_status = 'failed' WHERE session_id = 'cs_pending'");
    expect(await plan(OWNER)).toBeNull();

    await db.query("UPDATE public.stripe_webhook_events SET processing_status = 'processed' WHERE session_id = 'cs_pending'");
    expect(await plan(OWNER)).toBeNull();

    await db.query("UPDATE public.stripe_webhook_events SET success = true WHERE session_id = 'cs_pending'");
    expect(await plan(OWNER)).toBe("presence");
  });

  it("requires both terminal fields, LIVE full-price receipt, and correct session match", async () => {
    await receipt("cs_not_terminal", { status: "processing", success: true });
    await receipt("cs_test", { live: false });
    await receipt("cs_underpaid", { amount: 100 });
    expect(await plan(OWNER)).toBeNull();

    // A ledger line with no matching signed event/session must not be sufficient.
    await db.query(`UPDATE public.contractor_activation_ledger
      SET metadata = jsonb_set(metadata, '{stripe_session_id}', '"wrong_session"'::jsonb)
      WHERE metadata->>'stripe_session_id' = 'cs_not_terminal'`);
    expect(await plan(OWNER)).toBeNull();
  });

  it("preserves owner isolation, refund/dispute revocation, and paid subscription priority", async () => {
    await receipt("cs_paid");
    expect(await plan(OTHER)).toBeNull();
    expect(await plan(OWNER)).toBe("presence");

    await db.query(
      `INSERT INTO public.contractor_activation_ledger (contractor_id, action, source, metadata)
       VALUES ($1, 'deactivated', 'stripe_webhook', $2)`,
      [COMPANY, JSON.stringify({ stripe_session_id: "cs_paid" })],
    );
    expect(await plan(OWNER)).toBeNull();

    await db.query(
      "INSERT INTO public.contractor_subscriptions (contractor_id, plan_id, status) VALUES ($1, 'pro_v2', 'active')",
      [COMPANY],
    );
    expect(await plan(OWNER)).toBe("pro_v2");
  });

  it("expires the 12-calendar-month right without extending it on repeat calls", async () => {
    await receipt("cs_old", { daysAgo: 370 });
    expect(await plan(OWNER)).toBeNull();
    await receipt("cs_new", { daysAgo: 1 });
    expect(await plan(OWNER)).toBeNull();
  });
});
