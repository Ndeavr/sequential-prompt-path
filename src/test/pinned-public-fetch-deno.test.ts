// @vitest-environment node
/**
 * Pinned first-party transport. The socket (not an HTTP lookup callback)
 * connects only to the validated public IP while SNI and certificate validation
 * use the independent business hostname. No provider actions or consent grants.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const path = "supabase/functions/enrich-official-website/pinnedPublicFetch.ts";
type TLSSocketOptions = { host: string; port: number; servername: string; rejectUnauthorized: boolean; ALPNProtocols?: string[] };
type HttpOptions = { hostname: string; port: number; path: string; servername: string; rejectUnauthorized: boolean; agent: any; headers: Record<string, string>; lookup?: unknown };
function harness(ipList = ["93.184.216.34"], statusCode = 200) {
  const seen: HttpOptions[] = [], tlsSeen: TLSSocketOptions[] = [], agents: any[] = [];
  const connect = vi.fn((options: TLSSocketOptions) => {
    tlsSeen.push(options);
    const socket = new EventEmitter() as EventEmitter & { authorized: boolean; end(): void };
    socket.authorized = true;
    socket.end = () => {};
    queueMicrotask(() => socket.emit("secureConnect"));
    return socket;
  });
  class Agent {
    keepAlive: boolean;
    createConnection?: (opts: any, callback: (err: Error|null, socket?: any) => void) => any;
    destroy = vi.fn();
    constructor(opts: { keepAlive: boolean }) { this.keepAlive = opts.keepAlive; agents.push(this); }
  }
  const request = vi.fn((options: HttpOptions, callback: (res: EventEmitter & { statusCode: number; headers: Record<string, string> }) => void) => {
    seen.push(options);
    const req = new EventEmitter() as EventEmitter & { end(): void; destroy(error?: Error): void };
    req.destroy = (error?: Error) => { if (error) req.emit("error", error); req.emit("close"); };
    req.end = () => {
      if (!options.agent?.createConnection) throw new Error("pinned_agent_required");
      options.agent.createConnection({}, (err: Error|null) => {
        if (err) { req.emit("error", err); return; }
        queueMicrotask(() => {
          const res = Object.assign(new EventEmitter(), { statusCode, headers: { "content-type": "text/html" } });
          callback(res);
          res.emit("data", new TextEncoder().encode("<p>public page</p>"));
          res.emit("end");
          req.emit("close");
        });
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
    exports: {}, request, Agent, connect, Response, Headers, URL, TextEncoder, Uint8Array,
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
  return { fetcher: context.exports.pinnedPublicFetch as (raw: string) => Promise<Response>, seen, request, dns, tlsSeen, connect, agents };
}
describe("Deno-compatible pinned first-party HTTPS", () => {
  it("pins TCP to public IPv4 and verifies TLS against the original site hostname", async () => {
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
    expect(options.lookup).toBeUndefined();
    expect(options.agent).toBe(h.agents[0]);
    expect(options.agent.keepAlive).toBe(false);
    expect(h.tlsSeen).toHaveLength(1);
    expect(h.tlsSeen[0]).toEqual({
      host: "93.184.216.34", port: 443,
      servername: "cleanvents.ca", rejectUnauthorized: true, ALPNProtocols: ["http/1.1"],
    });
    expect(h.agents[0].destroy).toHaveBeenCalled();
    expect(options.headers["Accept-Encoding"]).toBe("identity");
    expect(options.headers.Connection).toBe("close");
  });
  it("rejects private or mixed DNS results before opening any TLS socket", async () => {
    for (const addresses of [["127.0.0.1"], ["93.184.216.34", "10.0.0.1"], []]) {
      const h = harness(addresses);
      await expect(h.fetcher("https://cleanvents.ca/")).rejects.toThrow("unsafe_dns");
      expect(h.request).not.toHaveBeenCalled();
      expect(h.connect).not.toHaveBeenCalled();
    }
  });
  it("does not follow redirects or resolve the hostname again", async () => {
    const h = harness(["93.184.216.34"], 302);
    expect((await h.fetcher("https://cleanvents.ca/old-path")).status).toBe(302);
    expect(h.request).toHaveBeenCalledTimes(1);
    expect(h.dns).toHaveBeenCalledTimes(1);
    expect(h.tlsSeen[0].host).toBe("93.184.216.34");
  });
  it("rejects unsafe URL schemes before DNS", async () => {
    const h = harness();
    await expect(h.fetcher("http://cleanvents.ca/")).rejects.toThrow("unsafe_source");
    await expect(h.fetcher("https://user:pass@cleanvents.ca/")).rejects.toThrow("unsafe_source");
    expect(h.dns).not.toHaveBeenCalled();
  });
});
