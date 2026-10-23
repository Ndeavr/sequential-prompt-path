import { request } from "node:https";
import { publicAddress, safeUrl, POLICY } from "./caslFirstParty.ts";

/** TLS retains the official hostname; socket connects only to the validated public IPv4.
 * No redirects, cookies, auth, paid proxy or environment-selected proxy.
 */
export async function pinnedPublicFetch(raw: string | URL | Request, init?: RequestInit): Promise<Response> {
  const u = safeUrl(String(raw));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    Deno.resolveDns(u.hostname, "A"),
    new Promise<string[]>((_, reject) => { timer = setTimeout(() => reject(new Error("dns_timeout")), POLICY.timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some(a => !publicAddress(a))) throw new Error("unsafe_dns");
  const address = addresses[0];
  return await new Promise<Response>((resolve, reject) => {
    const req = request(u, {
      method: "GET", servername: u.hostname,
      headers: { "User-Agent": "UNPRO-Enrichment/1.1 (+https://unpro.ca)", "Cache-Control": "no-cache", "Accept": "text/html,text/plain" },
      lookup: (_host, _options, callback) => callback(null, address, 4),
    }, (res) => {
      const chunks: Uint8Array[] = []; let bytes = 0;
      res.on("data", (chunk: Uint8Array) => { bytes += chunk.length; if (bytes > POLICY.maxBytes) { req.destroy(new Error("volume_limit")); return; } chunks.push(chunk); });
      res.on("error", reject);
      res.on("end", () => {
        const body = new Uint8Array(bytes); let offset = 0;
        for (const c of chunks) { body.set(c, offset); offset += c.length; }
        const headers = new Headers(); for (const [key, value] of Object.entries(res.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        resolve(new Response([204,304].includes(res.statusCode ?? 0) ? null : body, { status: res.statusCode ?? 502, headers }));
      });
    });
    const t = setTimeout(() => req.destroy(new Error("timeout")), POLICY.timeoutMs);
    const abort = () => req.destroy(new Error("timeout"));
    init?.signal?.addEventListener("abort", abort, { once: true });
    req.on("error", reject);
    req.on("close", () => { clearTimeout(t); init?.signal?.removeEventListener("abort", abort); });
    req.end();
  });
}