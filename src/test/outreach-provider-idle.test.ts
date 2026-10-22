import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { classifySmsChannel } from "../../supabase/functions/_shared/providerHealthSemantics";

async function probe(row: unknown, error: unknown = null) {
  const tables: string[] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "not", "order", "limit"]) chain[method] = () => chain;
  chain.maybeSingle = async () => ({ data: row, error });
  const context: Record<string, unknown> = {
    createClient: () => ({ from: (table: string) => { tables.push(table); return chain; } }),
    classifySmsChannel, Response, Date, btoa,
    fetch: async () => new Response("{}", { status: 200 }),
    Deno: { env: { get: () => "fixture-only" }, serve() {} },
  };
  const source = readFileSync("supabase/functions/outreach-health-agent/index.ts", "utf8")
    .replace(/^import .*;\n/gm, "");
  runInNewContext(ts.transpileModule(source + "\nglobalThis.probe = probeTwilio;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText, context);
  const result = await (context.probe as () => Promise<Record<string, unknown>>)();
  return { result, tables };
}

describe("canonical SMS health without provider emissions", () => {
  it("idle callback history stays yellow and never requests webhook recreation", async () => {
    const { result, tables } = await probe({ delivered_at: "2026-01-01T00:00:00Z", webhook_received_at: "2026-01-01T00:00:00Z" });
    expect(tables).toEqual(["sms_events_v2"]);
    expect(result).toMatchObject({ status: "yellow", failure_reason: "NO_RECENT_SEND", repair_action: "manual_required" });
  });
  it("account reachability with no delivery evidence cannot become green", async () => {
    const { result } = await probe(null);
    expect(result.status).toBe("yellow");
    const { result: failedRead } = await probe(null, { message: "fixture read failure" });
    expect(failedRead).toMatchObject({ status: "yellow", failure_reason: "DELIVERY_EVIDENCE_UNAVAILABLE" });
  });
  it("only recent canonical delivered evidence with callback becomes green", async () => {
    const now = new Date(Date.now() - 60000).toISOString();
    const { result } = await probe({ delivered_at: now, webhook_received_at: now });
    expect(result.status).toBe("green");
    const { result: missingCallback } = await probe({ delivered_at: now, webhook_received_at: null });
    expect(missingCallback).toMatchObject({ status: "yellow", failure_reason: "CALLBACK_UNVERIFIED" });
  });
});