// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { normalizeNoMatchService, canRetainNoMatch, demandLandingRequest } from "../lib/demand/noMatchPolicy";

const root = "docs/security-staged/no-match-20261031/";
function handler(name: string, options: { user?: boolean; admin?: boolean; rows?: Record<string, unknown>; failure?: boolean } = {}) {
  let serve: ((req: Request) => Promise<Response>) | undefined;
  const writes: string[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.user ? { id: "owner" } : null }, error: null }) },
    from: (table: string) => {
      const q: any = { select: () => q, eq: () => q, limit: () => q,
        maybeSingle: async () => ({ data: options.rows?.[table] ?? null, error: options.failure ? new Error("private database detail") : null }),
        single: async () => ({ data: { id: "saved" }, error: options.failure ? new Error("private database detail") : null }),
        insert: () => { writes.push(table); return q; },
      };
      return q;
    },
  };
  const source = readFileSync(`${root}${name}.ts`, "utf8").replace(/^import[^\n]+;\s*$/gm, "");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: {}, createClient: () => client, corsHeaders: {}, console: { error() {} }, Response, URL,
    requireAdminCaller: async () => options.admin ? { ok: true } : { ok: false, response: new Response("denied", { status: 403 }) },
    Deno: { serve: (f: typeof serve) => { serve = f; }, env: { get: () => "synthetic-only" } },
  });
  return { writes, run: (body: object = {}, path = "") => {
    if (!serve) throw new Error("missing handler");
    return serve(new Request(`https://fixture.invalid/${path}`, { method: "POST", headers: { Authorization: "Bearer synthetic-only" }, body: JSON.stringify(body) }));
  } };
}

const projectId = "12345678-1234-4123-8123-123456789012";
describe("precise declared scope and explicit consent", () => {
  for (const term of ["capage", "ferblanterie architecturale", "pliage aluminium", "recouvrement de colonnes", "habillage de colonnes", "recouvrir mes colonnes devant la maison"]) {
    it(`normalizes ${term} to exterior column cladding`, () => expect(normalizeNoMatchService(term)).toBe("capage_colonnes_exterieures"));
  }
  it("does not turn ventilation into column cladding", () => expect(normalizeNoMatchService("ventilation")).toBe("ventilation"));
  it("rejects no consent", () => expect(canRetainNoMatch({ projectId, contact: "test@example.invalid" })).toBe(false));
  it("rejects no real project anchor", () => expect(canRetainNoMatch({ consent: true, contact: "test@example.invalid" })).toBe(false));
  it("requires contact", () => expect(canRetainNoMatch({ consent: true, projectId })).toBe(false));
  it("accepts a consented anchored request", () => expect(canRetainNoMatch({ consent: true, projectId, contact: "test@example.invalid" })).toBe(true));
  it("passes resolver city/category exactly once", () => {
    const url = new URL(demandLandingRequest("Pointe-aux-Trembles", "habillage de colonnes"), "https://fixture.invalid");
    expect(url.searchParams.get("city")).toBe("Pointe-aux-Trembles");
    expect(url.searchParams.get("category")).toBe("capage_colonnes_exterieures");
  });
  it("rejects an unbounded segment", () => expect(() => demandLandingRequest("a".repeat(121), "capage")).toThrow());
});
describe("reconstructed existing server corrections — synthetic IO only", () => {
  it("anonymous no-match cannot insert", async () => {
    const h = handler("alex-no-match-handle");
    expect((await h.run({ action: "waitlist-create" })).status).toBe(401);
    expect(h.writes).toEqual([]);
  });
  it("nonadmin retry is denied", async () => {
    const h = handler("alex-no-match-handle", { user: true });
    expect((await h.run({ action: "retry" })).status).toBe(403);
    expect(h.writes).toEqual([]);
  });
  it("admin retry never matches a generic active contractor or notifies", async () => {
    const h = handler("alex-no-match-handle", { admin: true, rows: { contractors: [{ id: "generic-active" }] } });
    const r = await h.run({ action: "retry" });
    expect(r.status).toBe(409);
    expect((await r.json()).matched).toBe(0);
    expect(h.writes).toEqual([]);
  });
  it("wrong owner or unconfirmed project is refused", async () => {
    const h = handler("alex-no-match-handle", { user: true });
    expect((await h.run({ action: "waitlist-create", project_id: projectId, alex_session_id: "session" })).status).toBe(403);
    expect(h.writes).toEqual([]);
  });
  const rows = { projects: { id: projectId, user_id: "owner", status: "active", matching_status: "empty" }, demand_signals: { id: "demand", category: "capage_colonnes_exterieures", city: "Pointe-aux-Trembles", status: "waiting", metadata: { follow_up_consent: true } } };
  const input = { action: "waitlist-create", project_id: projectId, alex_session_id: "session", follow_up_consent: true, email: "test@example.invalid", user_id: "impostor" };
  it("no consent does not persist", async () => {
    const h = handler("alex-no-match-handle", { user: true, rows });
    expect((await h.run({ ...input, follow_up_consent: false })).status).toBe(400);
    expect(h.writes).toEqual([]);
  });
  it("consented existing demand creates only waitlist, not notification or retry job", async () => {
    const h = handler("alex-no-match-handle", { user: true, rows });
    const r = await h.run(input);
    expect(r.status).toBe(200);
    expect((await r.json()).waitlist_id).toBe("saved");
    expect(h.writes).toEqual(["alex_waitlist_requests"]);
  });
  it("repeated request reuses existing waitlist", async () => {
    const h = handler("alex-no-match-handle", { user: true, rows: { ...rows, alex_waitlist_requests: { id: "existing" } } });
    expect((await (await h.run(input)).json()).waitlist_id).toBe("existing");
    expect(h.writes).toEqual([]);
  });
  it("database failure never becomes saved success", async () => {
    const h = handler("alex-no-match-handle", { user: true, rows, failure: true });
    expect((await h.run(input)).status).toBe(403);
    expect(h.writes).toEqual([]);
  });
  it("anonymous demand injection is rejected", async () => {
    const h = handler("demand-signal-create");
    expect((await h.run({ homeowner_id: "impostor" })).status).toBe(401);
    expect(h.writes).toEqual([]);
  });
  it("unsafe SQL matching blocks demand creation even when signed in", async () => {
    const h = handler("demand-signal-create", { user: true });
    expect((await h.run({ project_id: projectId })).status).toBe(409);
    expect(h.writes).toEqual([]);
  });
  it("no anonymous recruitment mutation", async () => {
    const h = handler("outreach-demand-injector");
    expect((await h.run({ action: "queue_outreach", city: "Pointe-aux-Trembles", category: "capage" })).status).toBe(403);
    expect(h.writes).toEqual([]);
  });
  it("admin receives review-required instead of fake outreach success", async () => {
    const h = handler("outreach-demand-injector", { admin: true });
    const r = await h.run({ action: "queue_outreach", city: "Pointe-aux-Trembles", category: "capage" });
    expect(r.status).toBe(409);
    expect((await r.json()).queued).toBe(0);
    expect(h.writes).toEqual([]);
  });
  it("public resolver does not disclose personal data or fabricate demand", async () => {
    const h = handler("recruitment-landing-resolver");
    const r = await h.run({}, "?city=Pointe-aux-Trembles&category=capage_colonnes_exterieures");
    const data = await r.json();
    expect(data.market).toBeNull();
    expect(data.demand_verified).toBe(false);
    expect(h.writes).toEqual([]);
  });
});