// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import { runInNewContext } from "node:vm";
import { Buffer } from "node:buffer";
import ts from "typescript";

const target = "supabase/functions/enrich-official-website/pinnedPublicFetch.ts";
const published = "https://cleanvents.ca/robots.txt";
function harness(opts: {
  addresses?: string[]; status?: number; tlsAuthorized?: boolean;
  response?: string; noEnd?: boolean;
} = {}) {
  const connections: any[] = [];
  const requests: string[] = [];
  const connect = vi.fn((options: any) => {
    connections.push(options);
    const socket = new EventEmitter() as any;
    socket.authorized = opts.tlsAuthorized ?? true;
    socket.destroy = vi.fn();
    socket.write = (content: string) => {
      requests.push(content);
      if (opts.noEnd) return;
      queueMicrotask(() => {
        const raw = opts.response ?? "HTTP/1.1 " + (opts.status ?? 200) +
          " OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK";
        socket.emit("data", Buffer.from(raw));
        socket.emit("end");
        socket.emit("close");
      });
    };
    queueMicrotask(() => socket.emit("secureConnect"));
    return socket;
  });
  const resolveDns = vi.fn(async () => opts.addresses ?? ["93.184.216.34"]);
  const s = readFileSync(target, "utf8").replace(/^import .*;\r?\n/gm, "");
  const compiled = ts.transpileModule(s, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const vm: Record<string, any> = {
    exports: {}, connect, Buffer, URL, Response, Headers, TextEncoder, Uint8Array,
    setTimeout, clearTimeout, console, Deno: { resolveDns },
    POLICY: { timeoutMs: 2000, maxBytes: 250_000 },
    PINNED_TRANSPORT: Symbol.for("unpro.pinned-public-transport"),
    publicAddress: (ip: string) => ip === "93.184.216.34",
    safeUrl: (raw: string) => {
      const u = new URL(raw);
      if (u.protocol !== "https:" || u.username || u.password) throw new Error("unsafe_source");
      return u;
    },
  };
  runInNewContext(compiled, vm);
  return { get: vm.exports.pinnedPublicFetch as (url: string) => Promise<Response>, connect, connections, requests, resolveDns };
}
describe("first-party verified TLS transport (no node:https Agent)", () => {
  it("pins TCP to public IPv4, verifies real domain TLS, sends only Host/domain GET", async () => {
    const h = harness();
    expect((await h.get(published)).status).toBe(200);
    expect(h.connections).toHaveLength(1);
    expect(h.connections[0].host).toBe("93.184.216.34");
    expect(h.connections[0].servername).toBe("cleanvents.ca");
    expect(h.connections[0].rejectUnauthorized).toBe(true);
    expect(h.connections[0].ALPNProtocols).toEqual(["http/1.1"]);
    expect(h.requests[0]).toContain("GET /robots.txt HTTP/1.1\r\n");
    expect(h.requests[0]).toContain("\r\nHost: cleanvents.ca\r\n");
    expect(h.requests[0]).toContain("\r\nAccept-Encoding: identity\r\n");
    expect(h.requests[0]).toContain("\r\nConnection: close\r\n");
    expect(h.resolveDns).toHaveBeenCalledWith("cleanvents.ca", "A");
    expect(h.resolveDns).toHaveBeenCalledTimes(1);
  });
  it("refuses private, mixed or missing DNS results without any network socket", async () => {
    for (const addresses of [["127.0.0.1"], ["93.184.216.34", "10.0.0.1"], []]) {
      const h = harness({ addresses });
      await expect(h.get(published)).rejects.toThrow("unsafe_dns");
      expect(h.connect).not.toHaveBeenCalled();
    }
  });
  it("fails closed on TLS rejection and never writes an HTTP request", async () => {
    const h = harness({ tlsAuthorized: false });
    await expect(h.get(published)).rejects.toThrow("tls_unauthorized");
    expect(h.requests).toHaveLength(0);
  });
  it("returns redirect response without following it", async () => {
    const h = harness({ status: 302 });
    const response = await h.get("https://cleanvents.ca/redirect");
    expect(response.status).toBe(302);
    expect(h.connect).toHaveBeenCalledTimes(1);
  });
  it("parses bounded chunked HTTP/1.1 messages", async () => {
    const h = harness({ response: "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Type: text/html\r\n\r\n2\r\nHi\r\n0\r\n\r\n" });
    const response = await h.get(published);
    expect(await response.text()).toBe("Hi");
  });
  it("rejects malformed HTTP framing rather than inventing verified content", async () => {
    const h = harness({ response: "HTTP/1.1 200 OK\r\nTransfer-Encoding: gzip\r\n\r\nbad" });
    await expect(h.get(published)).rejects.toThrow("unsupported_transfer_encoding");
  });
});
