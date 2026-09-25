/**
 * Deterministic authorization tests for the REAL guard used by every SMS sender.
 * Network is stubbed (auth user lookup + user_roles) so the 401/403/200 branches
 * run through the exact production code path without a live session.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { requireAdminCaller, validateOnlyResponse } from "./requireAdminCaller.ts";

const URL_ = "https://stub.supabase.co";
Deno.env.set("SUPABASE_URL", URL_);
Deno.env.set("SUPABASE_ANON_KEY", "anon-key-stub");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-key-stub");

const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const jwt = (role: string, sub: string) => `${b64({ alg: "HS256" })}.${b64({ role, sub })}.sig`;
const cors = { "Access-Control-Allow-Origin": "*" };

function stub(roles: Record<string, string[]>, validUsers: string[]) {
  const orig = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = String(input instanceof Request ? input.url : input);
    const h = new Headers(input instanceof Request ? input.headers : init?.headers);
    if (u.includes("/auth/v1/user")) {
      const tok = (h.get("Authorization") ?? "").replace("Bearer ", "");
      const sub = JSON.parse(atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub;
      if (!validUsers.includes(sub)) return new Response(JSON.stringify({ msg: "invalid" }), { status: 401 });
      return new Response(JSON.stringify({ id: sub, aud: "authenticated", role: "authenticated" }), { status: 200 });
    }
    if (u.includes("/rest/v1/user_roles")) {
      const m = u.match(/user_id=eq\.([^&]+)/);
      const r = (roles[m?.[1] ?? ""] ?? []).filter((x) => x === "admin").map((role) => ({ role }));
      return new Response(JSON.stringify(r), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response("[]", { status: 201 }); // audit log insert
  }) as typeof fetch;
  return () => { globalThis.fetch = orig; };
}

const req = (token?: string, body: unknown = {}) =>
  new Request("https://x/fn", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const USERS = { contractor: "11111111-1111-1111-1111-111111111111", homeowner: "22222222-2222-2222-2222-222222222222", admin: "33333333-3333-3333-3333-333333333333" };
const ROLES = { [USERS.contractor]: ["contractor"], [USERS.homeowner]: ["homeowner"], [USERS.admin]: ["admin"] };

Deno.test({ name: "401 — no token", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const restore = stub(ROLES, Object.values(USERS));
  try {
    const r = await requireAdminCaller(req(), cors);
    assertEquals(r.ok, false);
    if (!r.ok) { assertEquals(r.response.status, 401); await r.response.text(); }
  } finally { restore(); }
}});

Deno.test({ name: "401 — anon key / anon JWT / invalid user", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const restore = stub(ROLES, Object.values(USERS));
  try {
    for (const t of ["anon-key-stub", jwt("anon", "x"), jwt("authenticated", "99999999-9999-9999-9999-999999999999")]) {
      const r = await requireAdminCaller(req(t), cors);
      assertEquals(r.ok, false);
      if (!r.ok) { assertEquals(r.response.status, 401); await r.response.text(); }
    }
  } finally { restore(); }
}});

for (const kind of ["contractor", "homeowner"] as const) {
  Deno.test({ name: `403 — valid ${kind} (non-admin) JWT`, sanitizeOps: false, sanitizeResources: false, fn: async () => {
    const restore = stub(ROLES, Object.values(USERS));
    try {
      const r = await requireAdminCaller(req(jwt("authenticated", USERS[kind])), cors, "test");
      assertEquals(r.ok, false);
      if (!r.ok) {
        assertEquals(r.response.status, 403);
        assertEquals((await r.response.json()).error, "forbidden");
      }
    } finally { restore(); }
  }});
}

Deno.test({ name: "authorized — admin JWT, validate_only stops before any send", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const restore = stub(ROLES, Object.values(USERS));
  try {
    const r = await requireAdminCaller(req(jwt("authenticated", USERS.admin)), cors);
    assertEquals(r.ok, true);
    if (r.ok) {
      assertEquals(r.kind, "admin");
      const safe = await validateOnlyResponse(req(jwt("authenticated", USERS.admin), { validate_only: true }), cors, r, "fn");
      const j = await safe!.json();
      assertEquals([j.ok, j.authorized, j.dry_run, j.sent], [true, true, true, 0]);
      assertEquals(await validateOnlyResponse(req("x", { phone: "+1" }), cors, r, "fn"), null);
    }
  } finally { restore(); }
}});

Deno.test({ name: "authorized — service role key", sanitizeOps: false, sanitizeResources: false, fn: async () => {
  const restore = stub(ROLES, Object.values(USERS));
  try {
    const r = await requireAdminCaller(req("service-key-stub"), cors);
    assertEquals(r.ok, true);
    if (r.ok) assertEquals(r.kind, "service");
  } finally { restore(); }
}});
