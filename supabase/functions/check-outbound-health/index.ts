// check-outbound-health — real outbound infrastructure detection with granular DKIM diagnostics
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMON_DKIM_SELECTORS = [
  "lovable", "resend", "google", "selector1", "selector2", "default",
  "k1", "k2", "mxvault", "mail", "smtp", "dkim", "s1", "s2", "unpro",
];

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

async function resolveDnsSafe(name: string, type: any): Promise<{ records: string[]; error?: string }> {
  try {
    const res = await Promise.race([
      Deno.resolveDns(name, type),
      new Promise((_, rej) => setTimeout(() => rej(new Error("dns_timeout")), 5000)),
    ]) as any;
    if (Array.isArray(res)) {
      return { records: res.map((r: any) => {
        if (typeof r === "string") return r;
        if (Array.isArray(r)) return r.join("");
        return r?.exchange ?? JSON.stringify(r);
      }) };
    }
    return { records: [] };
  } catch (e: any) {
    return { records: [], error: e?.message ?? String(e) };
  }
}

interface DkimResult {
  valid: boolean;
  selector: string | null;
  selectorsTried: { selector: string; found: boolean; error?: string }[];
  reason: string; // selector_missing | invalid_public_key | propagation_pending | dns_timeout | malformed_txt | proxied_record | ok | not_checked
  reasonLabel: string;
  record: string | null;
  publicKeyLength: number;
}

async function checkDkim(domain: string, knownSelector?: string | null): Promise<DkimResult> {
  const tried: { selector: string; found: boolean; error?: string }[] = [];
  const selectors = Array.from(new Set([knownSelector, ...COMMON_DKIM_SELECTORS].filter(Boolean) as string[]));
  let timeoutCount = 0;

  for (const sel of selectors) {
    const { records, error } = await resolveDnsSafe(`${sel}._domainkey.${domain}`, "TXT");
    const joined = records.join("").trim();
    if (error === "dns_timeout") timeoutCount++;
    tried.push({ selector: sel, found: joined.length > 20, error });

    if (joined.length === 0) continue;

    // Validate DKIM TXT structure: must contain v=DKIM1 and p=
    const hasV = /v=DKIM1/i.test(joined);
    const pMatch = joined.match(/p=([A-Za-z0-9+\/=]*)/);
    if (!hasV && !pMatch) {
      return {
        valid: false, selector: sel, selectorsTried: tried,
        reason: "malformed_txt",
        reasonLabel: "Enregistrement DKIM mal formé (v=DKIM1 ou p= manquant)",
        record: joined, publicKeyLength: 0,
      };
    }
    const pubKey = pMatch?.[1] ?? "";
    if (!pubKey) {
      return {
        valid: false, selector: sel, selectorsTried: tried,
        reason: "invalid_public_key",
        reasonLabel: "Clé DKIM invalide (p= vide — clé révoquée)",
        record: joined, publicKeyLength: 0,
      };
    }
    if (pubKey.length < 100) {
      return {
        valid: false, selector: sel, selectorsTried: tried,
        reason: "invalid_public_key",
        reasonLabel: `Clé DKIM trop courte (${pubKey.length} chars)`,
        record: joined, publicKeyLength: pubKey.length,
      };
    }
    return {
      valid: true, selector: sel, selectorsTried: tried,
      reason: "ok", reasonLabel: "DKIM valide",
      record: joined, publicKeyLength: pubKey.length,
    };
  }

  if (timeoutCount === selectors.length) {
    return { valid: false, selector: null, selectorsTried: tried, reason: "dns_timeout", reasonLabel: "Timeout DNS sur tous les sélecteurs", record: null, publicKeyLength: 0 };
  }
  return {
    valid: false, selector: null, selectorsTried: tried,
    reason: "selector_missing",
    reasonLabel: "Sélecteur DKIM introuvable (record non publié ou propagation en cours)",
    record: null, publicKeyLength: 0,
  };
}

async function checkDomain(domain: string, knownDkimSelector?: string | null) {
  // SPF
  const spfRes = await resolveDnsSafe(domain, "TXT");
  const flatTxt = spfRes.records.join(" ");
  const spfRecord = spfRes.records.find((r) => /v=spf1/i.test(r)) ?? null;
  const spfValid = !!spfRecord;
  const spfReason = spfValid ? "ok" : (spfRes.error === "dns_timeout" ? "dns_timeout" : flatTxt ? "spf_missing" : "no_txt_records");

  // DMARC
  const dmarcRes = await resolveDnsSafe(`_dmarc.${domain}`, "TXT");
  const dmarcRecord = dmarcRes.records.find((r) => /v=DMARC1/i.test(r)) ?? null;
  const dmarcValid = !!dmarcRecord;
  const dmarcReason = dmarcValid ? "ok" : (dmarcRes.error === "dns_timeout" ? "dns_timeout" : "dmarc_missing");

  // DKIM (granular)
  const dkim = await checkDkim(domain, knownDkimSelector);

  // MX
  const mxRes = await resolveDnsSafe(domain, "MX");
  const mxValid = mxRes.records.length > 0;

  // Alignment: From domain == DKIM domain (basic; SMTP host alignment requires send headers)
  const alignment = {
    from_dkim_aligned: dkim.valid,
    spf_aligned: spfValid,
    return_path_domain: domain,
    smtp_hostname: domain,
  };

  // Suggested DKIM record if missing
  const suggestedDkim = dkim.valid ? null
    : `${(knownDkimSelector || "lovable")}._domainkey.${domain} TXT "v=DKIM1; k=rsa; p=<PUBLIC_KEY>"`;

  return {
    spfValid, spfRecord, spfReason,
    dmarcValid, dmarcRecord, dmarcReason,
    dkim,
    mxValid, mxRecords: mxRes.records,
    alignment, suggestedDkim,
  };
}

async function checkMailbox(mailbox: any): Promise<{ ok: boolean; latency: number; error?: string; payload?: any }> {
  const start = Date.now();
  try {
    const ct = mailbox.connection_type || mailbox.provider || "smtp";
    if (ct === "api_lovable" || mailbox.provider === "lovable_email") {
      return { ok: true, latency: Date.now() - start, payload: { check: "lovable_email" } };
    }
    if (ct === "api_resend") {
      const key = Deno.env.get("RESEND_API_KEY");
      if (!key) return { ok: false, latency: Date.now() - start, error: "RESEND_API_KEY missing" };
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
      return { ok: r.ok, latency: Date.now() - start, payload: { status: r.status }, error: r.ok ? undefined : `Resend ${r.status}` };
    }
    if (ct === "smtp") {
      const { records } = await resolveDnsSafe(mailbox.domain || mailbox.sender_email.split("@")[1], "MX");
      if (records.length === 0) return { ok: false, latency: Date.now() - start, error: "Aucun MX résolu" };
      return { ok: true, latency: Date.now() - start, payload: { check: "smtp_dns_only", mx: records } };
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
      .select("id, sender_email, sender_name, provider, connection_type, mailbox_status, auth_status, daily_limit, sent_today, domain, last_test_send_at, last_test_latency_ms, verified_at, dkim_selector")
      .order("created_at", { ascending: true });

    const list = mailboxes ?? [];
    const domainSelectorMap = new Map<string, string | null>();
    for (const m of list) {
      const d = m.domain || m.sender_email.split("@")[1];
      if (!domainSelectorMap.has(d)) domainSelectorMap.set(d, (m as any).dkim_selector ?? null);
    }
    const domains = Array.from(domainSelectorMap.keys());

    const domainResults: Record<string, any> = {};
    for (const d of domains) {
      const dr = await checkDomain(d, domainSelectorMap.get(d));
      domainResults[d] = dr;
      const score = [dr.spfValid, dr.dkim.valid, dr.mxValid, dr.dmarcValid].filter(Boolean).length * 25;

      // Get prior row to preserve dkim_last_success_at
      const { data: prior } = await supabase.from("email_domain_health")
        .select("dkim_last_success_at, dkim_propagation_started_at, dkim_status")
        .eq("domain", d).maybeSingle();

      const dkimSuccessAt = dr.dkim.valid ? new Date().toISOString() : prior?.dkim_last_success_at ?? null;
      const propagationStartedAt = (!dr.dkim.valid && dr.dkim.reason === "selector_missing")
        ? (prior?.dkim_propagation_started_at ?? new Date().toISOString())
        : (dr.dkim.valid ? null : prior?.dkim_propagation_started_at ?? null);

      await supabase.from("email_domain_health").upsert({
        domain: d,
        spf_status: dr.spfValid ? "passed" : "failed",
        spf_record: dr.spfRecord,
        spf_reason: dr.spfReason,
        dkim_status: dr.dkim.valid ? "passed" : "failed",
        dkim_selector: dr.dkim.selector,
        dkim_selectors_tried: dr.dkim.selectorsTried,
        dkim_reason: dr.dkim.reason,
        dkim_record: dr.dkim.record,
        dkim_last_success_at: dkimSuccessAt,
        dkim_propagation_started_at: propagationStartedAt,
        dmarc_status: dr.dmarcValid ? "passed" : "failed",
        dmarc_record: dr.dmarcRecord,
        dmarc_reason: dr.dmarcReason,
        mx_status: dr.mxValid ? "passed" : "failed",
        mx_records: dr.mxRecords,
        alignment_status: dr.alignment,
        suggested_dkim_record: dr.suggestedDkim,
        overall_score: score,
        status: score >= 75 ? "active" : score > 0 ? "warning" : "pending",
        last_checked: new Date().toISOString(),
        last_health_check_at: new Date().toISOString(),
      }, { onConflict: "domain" });
    }

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
        id: m.id, email: m.sender_email, provider, status: newStatus, authStatus,
        lastTestAt: m.last_test_send_at, lastTestLatencyMs: m.last_test_latency_ms,
        verifiedAt: m.verified_at, latencyMs: result.latency,
        dailyLimit: m.daily_limit, sentToday: m.sent_today,
      });
    }

    const aggDomain = domains.reduce(
      (acc, d) => {
        const r = domainResults[d];
        return {
          spfValid: acc.spfValid || r.spfValid,
          dkimValid: acc.dkimValid || r.dkim.valid,
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

    // Build per-domain diagnostics summary (DKIM detail per domain)
    const domainDiagnostics = domains.map((d) => ({
      domain: d,
      spf: { valid: domainResults[d].spfValid, record: domainResults[d].spfRecord, reason: domainResults[d].spfReason },
      dmarc: { valid: domainResults[d].dmarcValid, record: domainResults[d].dmarcRecord, reason: domainResults[d].dmarcReason },
      dkim: domainResults[d].dkim,
      mx: { valid: domainResults[d].mxValid, records: domainResults[d].mxRecords },
      alignment: domainResults[d].alignment,
      suggestedDkim: domainResults[d].suggestedDkim,
    }));

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
      domains: domainDiagnostics,
      preflightBlockers: [
        !aggDomain.spfValid && "SPF invalide",
        !aggDomain.dkimValid && "DKIM invalide",
        !aggDomain.dmarcValid && "DMARC manquant",
      ].filter(Boolean),
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
