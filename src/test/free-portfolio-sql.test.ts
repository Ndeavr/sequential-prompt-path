// @vitest-environment node
/**
 * « Montrez vos réalisations » — règles serveur (données synthétiques, PGlite).
 * Applique la vraie migration 0052 sur un schéma minimal reconstruit.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const OWNER = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";
const UNVERIFIED = "00000000-0000-4000-8000-0000000000c3";
const ADMIN = "00000000-0000-4000-8000-0000000000d4";

async function setup() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid primary key, email_confirmed_at timestamptz, phone_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.objects(bucket_id text, name text, metadata jsonb);
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    CREATE TYPE public.app_role AS ENUM ('admin', 'contractor');
    CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
    CREATE FUNCTION public.has_role(_u uuid, _r public.app_role) RETURNS boolean LANGUAGE sql STABLE AS
      $$ select exists(select 1 from public.user_roles where user_id = _u and role = _r) $$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ select public.has_role(auth.uid(), 'admin') $$;
    CREATE TABLE public.contractors(id uuid primary key default gen_random_uuid(), user_id uuid, business_name text not null,
      email text, phone text, city text, created_at timestamptz not null default now(), public_status text default 'unpublished');
    CREATE FUNCTION public.owns_contractor(_c uuid) RETURNS boolean LANGUAGE sql STABLE AS
      $$ select exists(select 1 from public.contractors c where c.id = _c and c.user_id = auth.uid()) $$;
    CREATE TABLE public.contractor_funnel_events(id uuid primary key default gen_random_uuid(), event_type text, event_source text,
      user_id uuid, contractor_id uuid, step text, metadata jsonb, dedupe_key text);
    CREATE TABLE public.admin_notifications(id uuid primary key default gen_random_uuid(), type text, severity text,
      contractor_id uuid, title text, body text, payload_json jsonb);
    CREATE TABLE public.contractor_portfolio_projects(id uuid primary key default gen_random_uuid(), contractor_id uuid not null references public.contractors(id),
      title text not null, description text, city text, service_name text, before_image_url text, after_image_url text,
      gallery_urls jsonb default '[]'::jsonb, featured_flag boolean default false, created_at timestamptz not null default now());
    ALTER TABLE public.contractor_portfolio_projects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY public_read_portfolio ON public.contractor_portfolio_projects FOR SELECT TO anon USING (true);
    CREATE POLICY owner_select_contractor_portfolio_projects ON public.contractor_portfolio_projects FOR SELECT TO authenticated USING (public.owns_contractor(contractor_id));
    CREATE POLICY admin_all_contractor_portfolio_projects ON public.contractor_portfolio_projects FOR ALL TO authenticated USING (public.is_admin());
    INSERT INTO auth.users VALUES ('${OWNER}', now(), null), ('${OTHER}', null, now()), ('${UNVERIFIED}', null, null), ('${ADMIN}', now(), null);
    INSERT INTO public.user_roles VALUES ('${ADMIN}', 'admin');
  `);
  await db.exec(readFileSync("drizzle/migrations/0052_free_portfolio_projects_v1.sql", "utf8").replace(/--> statement-breakpoint/g, ""));
  return db;
}

const as = (db: PGlite, uid: string | null) => db.exec(`SELECT set_config('test.uid', '${uid ?? ""}', false)`);
const photo = (db: PGlite, uid: string, key: string, n = 1) =>
  db.exec(Array.from({ length: n }, (_, i) =>
    `INSERT INTO storage.objects VALUES ('portfolio-submissions', '${uid}/${key}/${i + 1}.jpg', '{"mimetype":"image/jpeg","size":120000}');`).join(""));
let seq = 0;
async function submit(db: PGlite, uid: string, opts: { business?: string; key?: string; photos?: number } = {}) {
  const key = opts.key ?? `00000000-0000-4000-9000-${String(++seq).padStart(12, "0")}`;
  await photo(db, uid, key, opts.photos ?? 1);
  const paths = Array.from({ length: opts.photos ?? 1 }, (_, i) => `${uid}/${key}/${i + 1}.jpg`);
  await as(db, uid);
  return db.query<{ r: { result: string; id: string; status: string } }>(
    `SELECT public.submit_portfolio_project($1::uuid, $2, 'pro@example.test', '', 'Toiture refaite', 'Toiture', 'Laval', null, $3::text[], null, null, true, true) AS r`,
    [key, opts.business ?? "Entreprise Synthétique", paths],
  ).then((x) => x.rows[0].r, (e: Error) => ({ result: "error", id: "", status: e.message }));
}
const feed = (db: PGlite) => as(db, null).then(() => db.query<{ id: string }>(`SELECT id FROM public.public_portfolio_feed()`)).then((r) => r.rows.map((x) => x.id));
const moderate = async (db: PGlite, uid: string, id: string, decision: string, reason = "") => {
  await as(db, uid);
  return db.query(`SELECT public.moderate_portfolio_project($1, $2, $3)`, [id, decision, reason]).then(() => "ok", (e: Error) => e.message);
};

describe("free portfolio server rules", { timeout: 60_000 }, () => {
  it("guest and unverified accounts cannot save; verified account → pending, not public until approved", async () => {
    const db = await setup();
    await as(db, null);
    const guest = await db.query(`SELECT public.submit_portfolio_project(gen_random_uuid(), 'X', 'a@b.c', '', 'Titre', 'Toiture', 'Laval', null, ARRAY['x/1.jpg'], null, null, true, true)`).then(() => "ok", (e: Error) => e.message);
    expect(guest).toContain("auth_required");
    expect((await submit(db, UNVERIFIED)).status).toContain("account_not_verified");

    const created = await submit(db, OWNER);
    expect(created).toMatchObject({ result: "created", status: "pending" });
    expect(await feed(db)).toEqual([]);
    const ev = await db.query<{ n: number }>(`SELECT count(*)::int n FROM public.contractor_funnel_events WHERE event_type='project_submitted'`);
    expect(ev.rows[0].n).toBe(1);

    expect(await moderate(db, ADMIN, created.id, "approve")).toBe("ok");
    expect(await feed(db)).toEqual([created.id]);
  });

  it("same request replayed is idempotent; photo of another account is refused", async () => {
    const db = await setup();
    const key = "00000000-0000-4000-9000-aaaaaaaaaaaa";
    const first = await submit(db, OWNER, { key });
    await as(db, OWNER);
    const replay = await db.query<{ r: { result: string; id: string } }>(
      `SELECT public.submit_portfolio_project($1::uuid, '', '', '', 'Toiture refaite', 'Toiture', 'Laval', null, ARRAY[$2], null, null, true, true) AS r`,
      [key, `${OWNER}/${key}/1.jpg`]);
    expect(replay.rows[0].r).toMatchObject({ result: "already_submitted", id: first.id });
    await photo(db, OTHER, "foreign");
    const stolen = await db.query(`SELECT public.submit_portfolio_project(gen_random_uuid(), '', '', '', 'Titre ok', 'Toiture', 'Laval', null, ARRAY[$1], null, null, true, true)`, [`${OTHER}/foreign/1.jpg`]).then(() => "ok", (e: Error) => e.message);
    expect(stolen).toContain("photo_not_owned");
  });

  it("11th free project is refused by the server; a withdrawn one frees a slot", async () => {
    const db = await setup();
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      // contourne la limite horaire (5/h) en vieillissant les envois précédents
      await db.exec(`UPDATE public.contractor_portfolio_projects SET created_at = now() - interval '2 hours'`);
      const r = await submit(db, OWNER);
      expect(r.result).toBe("created");
      ids.push(r.id);
    }
    await db.exec(`UPDATE public.contractor_portfolio_projects SET created_at = now() - interval '2 hours'`);
    expect((await submit(db, OWNER)).status).toContain("free_limit_reached");
    await as(db, OWNER);
    await db.query(`SELECT public.withdraw_portfolio_project($1)`, [ids[0]]);
    expect((await submit(db, OWNER)).result).toBe("created");
  });

  it("rate limit: 6th submission within an hour is refused", async () => {
    const db = await setup();
    for (let i = 0; i < 5; i++) expect((await submit(db, OWNER)).result).toBe("created");
    expect((await submit(db, OWNER)).status).toContain("rate_limited");
  });

  it("non-owner cannot withdraw, non-admin cannot approve; rejected and withdrawn stay invisible", async () => {
    const db = await setup();
    const a = await submit(db, OWNER);
    const b = await submit(db, OWNER);
    expect(await moderate(db, OWNER, a.id, "approve")).toContain("admin_required");
    await as(db, OTHER);
    expect(await db.query(`SELECT public.withdraw_portfolio_project($1)`, [a.id]).then(() => "ok", (e: Error) => e.message)).toContain("not_owner");

    expect(await moderate(db, ADMIN, a.id, "approve")).toBe("ok");
    expect(await moderate(db, ADMIN, b.id, "reject")).toContain("reason_required");
    expect(await moderate(db, ADMIN, b.id, "reject", "Adresse visible")).toBe("ok");
    expect(await feed(db)).toEqual([a.id]);

    const path = await db.query<{ p: string }>(`SELECT gallery_urls->>0 p FROM public.contractor_portfolio_projects WHERE id=$1`, [a.id]);
    expect((await db.query<{ v: boolean }>(`SELECT public.portfolio_object_is_public($1) v`, [path.rows[0].p])).rows[0].v).toBe(true);
    await as(db, OWNER);
    await db.query(`SELECT public.withdraw_portfolio_project($1)`, [a.id]);
    expect(await feed(db)).toEqual([]);
    expect((await db.query<{ v: boolean }>(`SELECT public.portfolio_object_is_public($1) v`, [path.rows[0].p])).rows[0].v).toBe(false);
  });

  it("feed returns exactly the 10 most recent approved projects; anon has no direct table access", async () => {
    const db = await setup();
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) {
      await db.exec(`UPDATE public.contractor_portfolio_projects SET created_at = now() - interval '2 hours'`);
      const r = await submit(db, i < 6 ? OWNER : OTHER, { business: i < 6 ? "Alpha" : "Beta" });
      if (r.result !== "created") continue;
      expect(await moderate(db, ADMIN, r.id, "approve")).toBe("ok");
      await db.exec(`UPDATE public.contractor_portfolio_projects SET published_at = now() - interval '${12 - i} minutes' WHERE id='${r.id}'`);
      ids.push(r.id);
    }
    expect(ids.length).toBe(12);
    const f = await feed(db);
    expect(f).toHaveLength(10);
    expect(f).toEqual(ids.slice(2).reverse());

    await db.exec("SET ROLE anon");
    const direct = await db.query(`SELECT id FROM public.contractor_portfolio_projects`).then(() => "ok", (e: Error) => e.message);
    await db.exec("RESET ROLE");
    expect(direct).toMatch(/permission denied/);
    const policies = await db.query<{ n: number }>(`SELECT count(*)::int n FROM pg_policies WHERE tablename='contractor_portfolio_projects' AND policyname='public_read_portfolio'`);
    expect(policies.rows[0].n).toBe(0);
  });
});
