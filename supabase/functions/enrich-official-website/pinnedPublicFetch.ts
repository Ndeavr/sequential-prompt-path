import { connect } from "node:tls";
import { Buffer } from "node:buffer";
import { publicAddress, safeUrl, POLICY, PINNED_TRANSPORT } from "./caslFirstParty.ts";

declare const Deno: any;

const HEADER_LIMIT = 16_384;
const RAW_LIMIT = POLICY.maxBytes * 2 + HEADER_LIMIT;

/**
 * Parse a strictly bounded HTTP/1.1 response sent over an already validated
 * TLS connection. Never follows redirects or interprets untrusted hosts.
 */
function parseChunked(body: Buffer): Uint8Array {
  const chunks: Buffer[] = [];
  let cursor = 0, total = 0, complete = false;
  while (cursor < body.length) {
    const endLine = body.indexOf("\r\n", cursor, "utf8");
    if (endLine < 0 || endLine - cursor > 32) throw new Error("invalid_chunk_header");
    const sizeHex = body.toString("ascii", cursor, endLine);
    if (!/^[\da-fA-F]{1,8}$/.test(sizeHex)) throw new Error("invalid_chunk_size");
    const count = Number.parseInt(sizeHex, 16);
    cursor = endLine + 2;
    if (count === 0) { complete = true; break; } // ignore untrusted trailers
    if (total + count > POLICY.maxBytes || cursor + count + 2 > body.length) throw new Error("volume_limit");
    chunks.push(body.subarray(cursor, cursor + count));
    total += count;
    cursor += count;
    if (body.toString("ascii", cursor, cursor + 2) !== "\r\n") throw new Error("invalid_chunk_terminator");
    cursor += 2;
  }
  if (!complete) throw new Error("truncated_chunked_response");
  return new Uint8Array(Buffer.concat(chunks, total));
}

function parseHttpResponse(raw: Uint8Array): Response {
  const buf = Buffer.from(raw);
  const split = buf.indexOf("\r\n\r\n");
  if (split < 0 || split > HEADER_LIMIT) throw new Error("invalid_http_headers");
  const lines = buf.toString("latin1", 0, split).split("\r\n");
  const status = /^HTTP\/1\.[01] ([1-5]\d\d)(?: .*)?$/.exec(lines.shift() ?? "");
  if (!status) throw new Error("invalid_http_status");
  const statusCode = Number(status[1]);
  if (statusCode < 200) throw new Error("unsupported_informational_response");
  const headers = new Headers();
  const fields = new Map<string, string>();
  for (const line of lines) {
    if (!line || /^\s/.test(line)) throw new Error("invalid_http_header");
    const colon = line.indexOf(":");
    if (colon < 1) throw new Error("invalid_http_header");
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!/^[a-z0-9!#$%&'*+.^_\x60|~-]+$/.test(name) || /[\r\n]/.test(value)) throw new Error("invalid_http_header");
    if (fields.has(name) && ["content-length", "transfer-encoding", "content-encoding"].includes(name))
      throw new Error("ambiguous_framing");
    fields.set(name, value);
    headers.append(name, value);
  }
  if (fields.has("content-encoding") && fields.get("content-encoding")?.toLowerCase() !== "identity")
    throw new Error("compressed_content_not_supported");
  const chunked = fields.get("transfer-encoding")?.toLowerCase();
  if (chunked && chunked !== "chunked") throw new Error("unsupported_transfer_encoding");
  if (chunked && fields.has("content-length")) throw new Error("ambiguous_framing");
  const wire = buf.subarray(split + 4);
  let body: Uint8Array;
  if ([204, 304].includes(statusCode)) {
    body = new Uint8Array(0);
  } else if (chunked) {
    body = parseChunked(wire);
  } else if (fields.has("content-length")) {
    const length = fields.get("content-length") ?? "";
    if (!/^\d{1,9}$/.test(length)) throw new Error("invalid_content_length");
    const size = Number(length);
    if (size > POLICY.maxBytes) throw new Error("volume_limit");
    if (wire.length < size) throw new Error("truncated_response");
    body = new Uint8Array(wire.subarray(0, size));
  } else {
    if (wire.length > POLICY.maxBytes) throw new Error("volume_limit");
    body = new Uint8Array(wire);
  }
  if (body.length > POLICY.maxBytes) throw new Error("volume_limit");
  const responseBody = new ArrayBuffer(body.length);
  new Uint8Array(responseBody).set(body);
  return new Response([204, 304].includes(statusCode) ? null : responseBody, { status: statusCode, headers });
}

/**
 * Uses an explicit TLS socket; never delegates the connection to
 * node:https.ClientRequest or node:https.Agent. Lovable Cloud's Node
 * compatibility layer was validating an IP against the SSL certificate
 * despite a custom agent with SNI. This path removes that layer entirely.
 *
 * Socket: verified public IPv4, preflight DNS checked; TLS SNI and
 * certificate hostname: original official domain; HTTP Host: same domain.
 * No redirects, unpinned fallback, proxy or disabling TLS verification.
 */
export async function pinnedPublicFetch(raw: string | URL | Request, init?: RequestInit): Promise<Response> {
  const u = safeUrl(String(raw));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses: string[] = await Promise.race([
    Deno.resolveDns(u.hostname, "A"),
    new Promise<string[]>((_, reject) => { timer = setTimeout(() => reject(new Error("dns_timeout")), POLICY.timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
  if (!addresses.length || addresses.some(a => !publicAddress(a))) throw new Error("unsafe_dns");
  const address = addresses[0];

  return await new Promise<Response>((resolve, reject) => {
    let settled = false, total = 0;
    const chunks: Buffer[] = [];
    const socket = connect({
      host: address, port: 443, servername: u.hostname,
      rejectUnauthorized: true, ALPNProtocols: ["http/1.1"],
    });
    const abort = () => socket.destroy(new Error("aborted"));
    const cleanup = () => {
      init?.signal?.removeEventListener("abort", abort);
      clearTimeout(timeout);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      socket.destroy();
      reject(error);
    };
    const timeout = setTimeout(() => fail(new Error("timeout")), POLICY.timeoutMs);
    if (init?.signal?.aborted) { fail(new Error("aborted")); return; }
    init?.signal?.addEventListener("abort", abort, { once: true });
    socket.once("secureConnect", () => {
      if (!socket.authorized) { fail(new Error("tls_unauthorized")); return; }
      // URL always percent-encodes CR/LF; no attacker-supplied headers.
      const path = u.pathname + u.search;
      const req = [
        "GET " + path + " HTTP/1.1",
        "Host: " + u.host,
        "User-Agent: UNPRO-Enrichment/1.1 (+https://unpro.ca)",
        "Accept: text/html,text/plain",
        "Accept-Encoding: identity",
        "Cache-Control: no-cache",
        "Connection: close",
        "", "",
      ].join("\r\n");
      socket.write(req);
    });
    socket.on("data", (bytes: Buffer) => {
      if (settled) return;
      total += bytes.length;
      if (total > RAW_LIMIT) { fail(new Error("volume_limit")); return; }
      chunks.push(bytes);
    });
    socket.once("end", () => {
      if (settled) return;
      try {
        const response = parseHttpResponse(new Uint8Array(Buffer.concat(chunks, total)));
        settled = true;
        cleanup();
        resolve(response);
      } catch (error) {
        fail(error instanceof Error ? error : new Error("invalid_http_response"));
      }
    });
    socket.once("error", (error: Error) => fail(error));
    socket.once("close", () => {
      if (!settled) fail(new Error("connection_closed"));
    });
  });
}
(pinnedPublicFetch as unknown as Record<symbol, unknown>)[PINNED_TRANSPORT] = true;
