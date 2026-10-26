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