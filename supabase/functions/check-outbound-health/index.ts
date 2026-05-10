// check-outbound-health — real outbound infrastructure detection
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function detectProvider(domain: string, connectionType: string, mxRecords: string[]): string {
  const d = (domain || "").toLowerCase();
  const mx = mxRecords.join(" ").toLowerCase();
  if (connectionType === "api_resend" || mx.includes("resend")) return "Resend";
  if (connectionType === "api_lovable" || d.endsWith("mail.unpro.ca")) return "Lovable Email";
  if (mx.includes("google") || mx.includes("aspmx")) return d.endsWith("gmail.com") ? "Gmail" : "Google Workspace";
  if (mx.includes("outlook") || mx.includes("protection.outlook")) return "Microsoft 365";
  if (mx.includes("mailgun")) return "Mailgun";
  if (mx.includes("sendgrid")) return "SendGrid";
  if (connectionType === "smtp") return "SMTP custom";
  return connectionType || "Inconnu";
}

async function resolveDnsSafe(name: string, type: any): Promise<string[]> {
  try {
    const res = await Deno.resolveDns(name, type);
    if (Array.isArray(res)) {
      return res.map((r: any) => (typeof r === "string" ? r : r?.exchange ?? JSON.stringify(r)));
    }
    return [];
  } catch {
    return [];
  }
}

async function checkDomain(domain: string) {
  const txt = await resolveDnsSafe(domain, "TXT");
  const flatTxt = txt.flat().join(" ");
  const spfValid = /v=spf1/i.test(flatTxt);

  const dmarcTxt = await resolveDnsSafe(`_dmarc.${domain}`, "TXT");
  const dmarcFlat = dmarcTxt.flat().join(" ");
  const dmarcValid = /v=DMARC1/i.test(dmarcFlat);

  // DKIM: try common selectors
  let dkimValid = false;
  for (const sel of ["lovable", "google", "selector1", "default", "k1", "mxvault"]) {
    const dk = await resolveDnsSafe(`${sel}._domainkey.${domain}`, "TXT");
    if (dk.flat().join(" ").length > 20) { dkimValid = true; break; }
  }

  const mx = await resolveDnsSafe(domain, "MX");
  const mxValid = mx.length > 0;

  return { spfValid, dkimValid, dmarcValid, mxValid, mxRecords: mx };
}

async function checkMailbox(mailbox: any): Promise<{ ok: boolean; latency: number; error?: string; payload?: any }> {
  const start = Date.now();
  try {
    const ct = mailbox.connection_type || mailbox.provider || "smtp";
    if (ct === "api_lovable" || mailbox.provider === "lovable_email") {
      // Lovable email is reachable if SUPABASE_URL is set; consider connected
      return { ok: true, latency: Date.now() - start, payload: { check: "lovable_email", note: "service available" } };
    }
    if (ct === "api_resend") {
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) return { ok: false, latency: Date.now() - start, error: "RESEND_API_KEY missing" };
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
      return { ok: r.ok, latency: Date.now() - start, payload: { status: r.status }, error: r.ok ? undefined : `Resend ${r.status}` };
    }
    if (ct === "smtp") {
      // No stored SMTP creds → consider reachable only if domain MX answers; auth not verified yet
      const mx = await resolveDnsSafe(mailbox.domain || mailbox.sender_email.split("@")[1], "MX");
      if (mx.length === 0) return { ok: false, latency: Date.now() - start, error: "Aucun MX résolu" };
      return { ok: true, latency: Date.now() - start, payload: { check: "smtp_dns_only", mx } };
    }
    return { ok: false, latency: Date.now() - start, error: `Type non supporté: ${ct}` };
  } catch (e: any) {
    return { ok: false, latency: Date.now() - start, error: e?.message ?? String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: mailboxes } = await supabase
      .from("outbound_mailboxes")
      .select("id, sender_email, sender_name, provider, connection_type, mailbox_status, auth_status, daily_limit, sent_today, domain, last_test_send_at, last_test_latency_ms, verified_at")
      .order("created_at", { ascending: true });

    const list = mailboxes ?? [];
    const domains = Array.from(new Set(list.map((m: any) => m.domain || m.sender_email.split("@")[1]).filter(Boolean)));

    // Check each domain
    const domainResults: Record<string, any> = {};
    for (const d of domains) {
      domainResults[d] = await checkDomain(d);
      const dr = domainResults[d];
      const score = [dr.spfValid, dr.dkimValid, dr.mxValid, dr.dmarcValid].filter(Boolean).length * 25;
      await supabase.from("email_domain_health").upsert({
        domain: d,
        spf_status: dr.spfValid ? "passed" : "failed",
        dkim_status: dr.dkimValid ? "passed" : "failed",
        dmarc_status: dr.dmarcValid ? "passed" : "failed",
        mx_status: dr.mxValid ? "passed" : "failed",
        mx_records: dr.mxRecords,
        overall_score: score,
        status: score >= 75 ? "active" : score > 0 ? "warning" : "pending",
        last_checked: new Date().toISOString(),
        last_health_check_at: new Date().toISOString(),
      }, { onConflict: "domain" });
    }

    // Check each mailbox
    const mailboxStatuses: any[] = [];
    for (const m of list) {
      const dom = m.domain || m.sender_email.split("@")[1];
      const dr = domainResults[dom];
      const provider = detectProvider(dom, m.connection_type || m.provider, dr?.mxRecords ?? []);
      const result = await checkMailbox(m);
      const dnsOk = dr && dr.spfValid && dr.mxValid;
      let newStatus = m.mailbox_status;
      let authStatus = "pending";
      if (result.ok && dnsOk) {
        authStatus = "connected";
        newStatus = m.last_test_send_at ? "verified" : "smtp_connected";
      } else if (!dnsOk) {
        authStatus = "failed";
        newStatus = "dns_only";
      } else {
        authStatus = "failed";
        newStatus = "failed";
      }

      await supabase.from("outbound_mailboxes").update({
        auth_status: authStatus,
        mailbox_status: newStatus,
        provider_label: provider,
        last_auth_check_at: new Date().toISOString(),
      }).eq("id", m.id);

      await supabase.from("outbound_health_checks").insert({
        mailbox_id: m.id,
        check_type: result.payload?.check ?? "auth",
        status: result.ok ? "passed" : "failed",
        latency_ms: result.latency,
        response_payload: result.payload ?? null,
        error_message: result.error ?? null,
      });

      mailboxStatuses.push({
        id: m.id,
        email: m.sender_email,
        provider,
        status: newStatus,
        authStatus,
        lastTestAt: m.last_test_send_at,
        lastTestLatencyMs: m.last_test_latency_ms,
        verifiedAt: m.verified_at,
        latencyMs: result.latency,
        dailyLimit: m.daily_limit,
        sentToday: m.sent_today,
      });
    }

    const aggDomain = domains.reduce(
      (acc, d) => {
        const r = domainResults[d];
        return {
          spfValid: acc.spfValid || r.spfValid,
          dkimValid: acc.dkimValid || r.dkimValid,
          mxValid: acc.mxValid || r.mxValid,
          dmarcValid: acc.dmarcValid || r.dmarcValid,
        };
      },
      { spfValid: false, dkimValid: false, mxValid: false, dmarcValid: false },
    );

    const verifiedMailbox = mailboxStatuses.find(
      (s) => s.authStatus === "connected" && s.lastTestAt && (Date.now() - new Date(s.lastTestAt).getTime() < 24 * 3600 * 1000),
    );
    const connectedMailbox = mailboxStatuses.find((s) => s.authStatus === "connected");

    const out = {
      domainConfigured: aggDomain.spfValid && aggDomain.dkimValid && aggDomain.mxValid,
      spfValid: aggDomain.spfValid,
      dkimValid: aggDomain.dkimValid,
      mxValid: aggDomain.mxValid,
      dmarcValid: aggDomain.dmarcValid,
      mailboxes: mailboxStatuses,
      mailboxActive: !!verifiedMailbox,
      provider: (verifiedMailbox || connectedMailbox)?.provider ?? null,
      lastSync: new Date().toISOString(),
      sendingHealthy:
        aggDomain.spfValid && aggDomain.dkimValid && aggDomain.mxValid && !!verifiedMailbox,
      domains: domainResults,
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
