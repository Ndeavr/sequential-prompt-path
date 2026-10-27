// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { describe, it, expect, vi } from "vitest";
function patched() {
  let source = readFileSync("supabase/functions/enrich-official-website/index.ts", "utf8");
  const patch = readFileSync("docs/audits/casl-evidence-agent/index.patch", "utf8");
  for (const hunk of patch.split(/(?=^@@ )/m).slice(1)) {
    const lines = hunk.split("\n").slice(1).filter(l => /^[ +\-]/.test(l));
    const before = lines.filter(l => !l.startsWith("+")).map(l => l.slice(1)).join("\n");
    const after = lines.filter(l => !l.startsWith("-")).map(l => l.slice(1)).join("\n");
    if (!source.includes(before)) throw Error("stale_patch");
    source = source.replace(before, after);
  }
  return source;
}
function harness() {
  let handler: any;
  const batch = vi.fn(async (_sb, _io, input) => ({ dry_run: input.dry_run, sent: 0 }));
  const env = { get: (key: string) => key === "SUPABASE_SERVICE_ROLE_KEY" ? "synthetic-service" : key === "SUPABASE_ANON_KEY" ? "synthetic-anon" : "https://synthetic.test" };
  const guard: any = { exports: {}, Response, atob, Deno: { env }, createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: "synthetic", user_metadata: { role: "admin" } } }, error: null }) }, from: () => { const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: null, error: null }) }; return q; } }) };
  runInNewContext(ts.transpileModule(readFileSync("supabase/functions/_shared/requireAdminCaller.ts","utf8").replace(/^import.*;\n/gm,""),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,guard);
  runInNewContext(ts.transpileModule(patched().replace(/^import[\s\S]*?;\n/gm,""),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,{Deno:{env,serve:(h:any)=>{handler=h;}},crypto,Response,Request,console,z,corsHeaders:{},createClient:()=>({}),requireAdminCaller:guard.exports.requireAdminCaller,runPhoneCaptureBatch:batch,pinnedPublicFetch:vi.fn()});
  return { batch, run: (token?:string,body:any={action:"capture_phone_casl_batch"}) => handler(new Request("https://synthetic.test",{method:"POST",headers:token?{Authorization:`Bearer ${token}`}:{},body:JSON.stringify(body)})) };
}
describe("proposed endpoint uses real canonical service auth",()=>{
  it.each([undefined,"synthetic-anon"])("refuses anonymous key %s",async token=>{const h=harness(); expect((await h.run(token)).status).toBe(401); expect(h.batch).not.toHaveBeenCalled();});
  it("user_metadata admin never grants batch access",async()=>{const h=harness(); expect((await h.run("synthetic-user")).status).toBe(403); expect(h.batch).not.toHaveBeenCalled();});
  it("exact configured service credential defaults to no writes",async()=>{const h=harness(); expect((await h.run("synthetic-service")).status).toBe(200); expect(h.batch.mock.calls[0][2].dry_run).toBe(true);});
  it.each([{action:"capture_phone_casl_batch",limit:3},{action:"capture_phone_casl_batch",contractor_prospect_id:"malformed"},{action:"capture_phone_casl_batch",reviewer_id:"fake"}])("rejects malformed or oversized input %j",async body=>{const h=harness(); expect((await h.run("synthetic-service",body)).status).toBe(400); expect(h.batch).not.toHaveBeenCalled();});
});