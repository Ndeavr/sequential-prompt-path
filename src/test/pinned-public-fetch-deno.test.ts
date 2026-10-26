// @vitest-environment node
/**
 * The hosted Edge runtime implements node:https but not ClientRequest.options.lookup.
 * Pin the original, independently validated public IPv4 via the actual hostname
 * socket option, while preserving TLS hostname validation, SNI and HTTP Host.
 * These tests are synthetic: they never contact a real website or approve CASL.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const path = "supabase/functions/enrich-official-website/pinnedPublicFetch.ts";
type RequestOptionsLike = {
  hostname: string; servername: string; port: number; path: string;
  method: string; rejectUnauthorized: boolean; agent: false;
  lookup?: unknown; createConnection?: unknown;
  headers: Record<string, string>;
};
function harness(ipList = ["93.184.216.34"], statusCode = 200) {
  const seen: RequestOptionsLike[] = [];
  const request = vi.fn((options: RequestOptionsLike, callback: (res: EventEmitter & { statusCode: number; headers: Record<string, string> }) => void) => {
    seen.push(options);
    const req = new EventEmitter() as EventEmitter & { end(): void; destroy(error?: Error): void };
    req.destroy = (error?: Error) => { if (error) req.emit("error", error); req.emit("close"); };
    req.end = () => {
      queueMicrotask(() => {
        const res = Object.assign(new EventEmitter(), { statusCode, headers: { "content-type": "text/html" } });
        callback(res);
        res.emit("data", new TextEncoder().encode("<p>public page</p>"));
        res.emit("end");
        req.emit("close");
      });
    };
    return req;
  });
  const dns = vi.fn(async () => ipList);
  const target = readFileSync(path, "utf8");
  const code = ts.transpileModule(
    target.replace(/^import .*;\r?\n/gm, ""),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const context: Record<string, any> = {
    exports: {}, request, Response, Headers, URL, TextEncoder, Uint8Array,
    setTimeout, clearTimeout, AbortController,
    Deno: { resolveDns: dns },
    POLICY: { timeoutMs: 2000, maxBytes: 250_000 },
    PINNED_TRANSPORT: Symbol.for("unpro.pinned-public-transport"),
    publicAddress: (ip: string) => /^93\.184\.216\.34$/.test(ip),
    safeUrl: (raw: string) => {
      const u = new URL(raw);
      if (u.protocol !== "https:" || u.username || u.password || u.port) throw new Error("unsafe_source");
      return u;
    },
  };
  runInNewContext(code, context);
  return { fetcher: context.exports.pinnedPublicFetch as (raw: string) => Promise<Response>, seen, request, dns };
}
describe("Deno-compatible pinned first-party HTTPS", () => {
  it("connects ONLY to validated public IPv4 while preserving original SNI/TLS identity and Host", async () => {
    const h = harness();
    const response = await h.fetcher("https://cleanvents.ca/contact?type=public");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("public page");
    expect(h.dns).toHaveBeenCalledWith("cleanvents.ca", "A");
    expect(h.seen).toHaveLength(1);
    const options = h.seen[0];
    expect(options.hostname).toBe("93.184.216.34");
    expect(options.servername).toBe("cleanvents.ca");
    expect(options.headers.Host).toBe("cleanvents.ca");
    expect(options.path).toBe("/contact?type=public");
    expect(options.port).toBe(443);
    expect(options.rejectUnauthorized).toBe(true);
    expect(options.agent).toBe(false);
    expect(options.lookup).toBeUndefined(); // unsupported by Deno
    expect(options.createConnection).toBeUndefined();
    expect(options.headers["Accept-Encoding"]).toBe("identity");
    expect(options.headers.Connection).toBe("close");
  });
  it("fails closed on a private or mixed DNS answer BEFORE any HTTPS connection", async () => {
    for (const addresses of [["127.0.0.1"], ["93.184.216.34", "10.0.0.1"], []]) {
      const h = harness(addresses);
      await expect(h.fetcher("https://cleanvents.ca/")).rejects.toThrow("unsafe_dns");
      expect(h.request).not.toHaveBeenCalled();
    }
  });
  it("does not follow remote redirects or re-resolve using the domain", async () => {
    const h = harness(["93.184.216.34"], 302);
    const response = await h.fetcher("https://cleanvents.ca/old-path");
    expect(response.status).toBe(302);
    expect(h.request).toHaveBeenCalledTimes(1);
    expect(h.seen[0].hostname).toBe("93.184.216.34");
  });
  it("rejects untrusted schemes before any DNS resolution", async () => {
    const h = harness();
    await expect(h.fetcher("http://cleanvents.ca/")).rejects.toThrow("unsafe_source");
    await expect(h.fetcher("https://user:pass@cleanvents.ca/")).rejects.toThrow("unsafe_source");
    expect(h.dns).not.toHaveBeenCalled();
  });
});
