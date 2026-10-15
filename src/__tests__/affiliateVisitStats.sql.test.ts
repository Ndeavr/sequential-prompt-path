// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, test } from "vitest";

const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const affiliate = "00000000-0000-4000-8000-000000000003";
const second = "00000000-0000-4000-8000-000000000004";
const admin = "00000000-0000-4000-8000-000000000005";
beforeAll(async () => {
  await db.exec(`create schema auth; create role anon; create role authenticated;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('qa.uid',true),'')::uuid$$;
    create table affiliates(id uuid, referral_code text, slug text, user_id uuid);
    create table user_roles(user_id uuid, role text);
    create table funnel_internal_actors(user_id uuid, is_active boolean);
    create function has_role(uuid,text) returns boolean language sql stable as $$select exists(select 1 from user_roles where user_id=$1 and role=$2)$$;
    create table contractor_funnel_events(session_id text,is_test boolean,internal_reason text,user_id uuid,affiliate_code text,event_type text);`);
  await db.exec(readFileSync(new URL("../../supabase/migrations/20261015141000_affiliate_visit_stats.sql", import.meta.url), "utf8"));
  await db.query("insert into affiliates values ($1,'TEST','owner',$2),($3,'OTHER','second',$4)", [affiliate, owner, second, other]);
  await db.query("insert into user_roles values ($1,'admin')", [admin]);
  await db.query("insert into funnel_internal_actors values ($1,true)", [other]);
  const events = [
    ["a", "landing_view", false, null, "test", null],
    ["a", "ai_audit_viewed", false, null, "TEST", null],
    ["a", "landing_view", false, null, "TEST", null],
    ["historic", "landing_viewed", false, null, " owner ", null],
    ["test", "landing_view", true, null, "TEST", null],
    ["own", "landing_view", false, owner, "TEST", null],
    ["late", "landing_view", false, null, "TEST", null],
    ["late", "profile_started", false, admin, null, null],
    ["internal", "landing_view", false, other, "TEST", null],
    ["reason", "landing_view", false, null, "TEST", "qa"],
    ["empty-reason", "landing_view", false, null, "TEST", " "],
    [null, "landing_view", false, null, "TEST", null],
    ["", "landing_view", false, null, "TEST", null],
    ["unrelated", "profile_started", false, null, "TEST", null],
    ["other", "landing_view", false, null, "OTHER", null],
    ["ambiguous", "landing_view", false, null, "TEST", null],
    ["ambiguous", "landing_view", false, null, "OTHER", null],
  ];
  for (const e of events) await db.query("insert into contractor_funnel_events values($1,$3,$6,$4,$5,$2)", e);
}, 30_000);
afterAll(async () => { await db.close(); });
async function read(user: string, id: string | null = affiliate) {
  await db.query("select set_config('qa.uid',$1,false)", [user]);
  return (await db.query<{affiliate_id: string; total_sessions: number; internal_sessions: number; attributed_sessions: number}>("select * from get_affiliate_visit_stats($1)", [id])).rows;
}
test("historic + companion events deduplicate; whole-session internal classification; no conversion inference", async () => {
  expect(await read(owner)).toEqual([{ affiliate_id: affiliate, total_sessions: 8, internal_sessions: 5, attributed_sessions: 3 }]);
  expect(await read(owner)).toEqual(await read(owner));
});
test("owner cannot inspect another affiliate or anonymous aggregate", async () => {
  expect(await read(owner, second)).toEqual([]);
  expect(await read("", null)).toEqual([]);
  expect((await read(owner, null)).length).toBe(1);
});
test("admin sees both affiliates, ambiguous sessions counted for neither", async () => {
  const rows = await read(admin, null);
  expect(rows).toHaveLength(2);
  expect(rows.find(r => r.affiliate_id === second)?.attributed_sessions).toBe(1);
});
test("ambiguous slug/code collisions fail closed, public/anonymous have no execute grant", async () => {
  await db.query("insert into affiliates values ($1,'THIRD','test',null)", ["00000000-0000-4000-8000-000000000006"]);
  expect(await read(owner)).toEqual([{ affiliate_id: affiliate, total_sessions: 1, internal_sessions: 0, attributed_sessions: 1 }]);
  const { rows } = await db.query("select has_function_privilege('anon', 'get_affiliate_visit_stats(uuid)', 'execute') as anon, has_function_privilege('authenticated', 'get_affiliate_visit_stats(uuid)', 'execute') as authenticated");
  expect(rows[0]).toEqual({ anon: false, authenticated: true });
});
