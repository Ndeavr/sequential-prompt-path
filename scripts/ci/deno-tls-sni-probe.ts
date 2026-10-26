// Diagnostic-only probe; no UNPRO API credentials, database or SMS.
import { connect } from "node:tls";

const domain = "cleanvents.ca";
const ips = await Deno.resolveDns(domain, "A");
if (!ips.length || ips.some(x => !/^\d+\.\d+\.\d+\.\d+$/.test(x))) throw new Error("unsafe_dns");
const ip = ips[0];
const status = await new Promise<string>((resolve, reject) => {
  const conn = connect({ host: ip, port: 443, servername: domain, rejectUnauthorized: true, ALPNProtocols: ["http/1.1"] }, () => {
    if (!conn.authorized) { reject(new Error("tls_unauthorized")); conn.destroy(); return; }
    resolve("authorized_sni_certificate");
    conn.end();
  });
  conn.setTimeout(10000, () => conn.destroy(new Error("tls_timeout")));
  conn.on("error", reject);
});
console.log(JSON.stringify({ result: status, target_hostname: domain, pinned_socket: true, sni_domain: true, tls_verification: true }));

// Verify the HTTPS parser can use an explicit pre-pinned SNI socket.
import { request, Agent } from "node:https";
const secureAgent = new Agent({ keepAlive: false });
(secureAgent as any).createConnection = (options: any, callback: (e: Error|null, socket?: any) => void) => {
  const socket = connect({ host: ip, port: 443, servername: domain, rejectUnauthorized: true, ALPNProtocols: ["http/1.1"] });
  socket.once("secureConnect", () => {
    if (!socket.authorized) callback(new Error("tls_unauthorized"));
    else callback(null, socket);
  });
  socket.once("error", callback);
  return socket;
};
const httpStatus = await new Promise<number>((resolve, reject) => {
  const requestOptions = { hostname: ip, port: 443, path: "/robots.txt", method: "GET", servername: domain, agent: secureAgent, headers: { Host: domain, Connection: "close", "Accept-Encoding": "identity" } };
  const rq = request(requestOptions, response => {
    response.resume();
    response.on("end", () => resolve(response.statusCode ?? 0));
  });
  rq.setTimeout(10000, () => rq.destroy(new Error("timeout")));
  rq.on("error", reject);
  rq.end();
});
if (httpStatus < 200 || httpStatus >= 500) throw new Error("https_agent_unusable_http_" + httpStatus);
console.log(JSON.stringify({ result: "https_agent_sni_success", httpStatus, pinned_socket: true }));
