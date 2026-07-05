// Live email health verification — no cached success is trusted.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SENDER_DOMAIN = "mail.unpro.ca";
const SENDER_EMAIL = "alex@mail.unpro.ca";
const SENDER_NAME = "Alex d'UNPRO";
const REPLY_TO = "support@unpro.ca";

function fingerprint(key: string) {
  if (!key) return null;
  const head = key.slice(0, 6);
  const tail = key.slice(-4);
  return `${head}…${tail}`;
}

function classifyResendError(status: number, body: any): string {
  if (status === 401 || status === 403) return "INVALID_API_KEY";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "RESEND_OUTAGE";
  const name = body?.name || body?.error;
  if (typeof name === "string") {
    if (name.includes("domain")) return "DOMAIN_NOT_VERIFIED";
    if (name.includes("from") || name.includes("sender")) return "INVALID_SENDER";
    if (name.includes("validation")) return "TEMPLATE_ERROR";
  }
  return "UNKNOWN";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const config = {
    resend_key_loaded: !!RESEND_API_KEY,
    fingerprint: fingerprint(RESEND_API_KEY),
    sender_email: SENDER_EMAIL,
    sender_name: SENDER_NAME,
    from_header: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    reply_to: REPLY_TO,
    environment: Deno.env.get("SUPABASE_ENV") ?? "production",
  };

  let resendAuthOk = false;
  let domainOk = false;
  let senderOk = false;
  let liveSendOk = false;
  let errorCategory: string | null = null;
  let reason = "";
  let impact = "";
  let rawResend: any = null;
  const domainDetails: any = { domain: SENDER_DOMAIN, spf: null, dkim: null, dmarc: null, verified: false };

  if (!RESEND_API_KEY) {
    errorCategory = "INVALID_API_KEY";
    reason = "RESEND_API_KEY absent — impossible d'authentifier auprès de Resend.";
    impact = "FAILED — aucun email transactionnel ne peut partir.";
  } else {
    // 1. Auth + domain lookup
    try {
      const r = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      const body = await r.json().catch(() => ({}));
      rawResend = { status: r.status, body };
      if (r.ok) {
        resendAuthOk = true;
        const domains = body?.data ?? [];
        const found = domains.find((d: any) => d.name === SENDER_DOMAIN);
        if (found) {
          domainDetails.verified = found.status === "verified";
          domainDetails.status = found.status;
          domainDetails.records = found.records ?? null;
          domainOk = domainDetails.verified;
          senderOk = domainOk; // sender belongs to verified domain
          if (Array.isArray(found.records)) {
            const rec = (t: string) => found.records.find((x: any) => (x.type || "").toUpperCase() === t || (x.record || "").toUpperCase().includes(t));
            const spf = rec("SPF") || rec("TXT");
            const dkim = rec("DKIM");
            const dmarc = rec("DMARC");
            domainDetails.spf = spf ? { status: spf.status, record: spf.value ?? spf.data ?? null } : null;
            domainDetails.dkim = dkim ? { status: dkim.status, record: dkim.value ?? dkim.data ?? null } : null;
            domainDetails.dmarc = dmarc ? { status: dmarc.status, record: dmarc.value ?? dmarc.data ?? null } : null;
          }
          if (!domainOk) {
            errorCategory = "DOMAIN_NOT_VERIFIED";
            reason = `Domaine ${SENDER_DOMAIN} non vérifié chez Resend (status=${found.status}).`;
          }
        } else {
          errorCategory = "DOMAIN_NOT_VERIFIED";
          reason = `Domaine ${SENDER_DOMAIN} introuvable dans le compte Resend.`;
        }
      } else {
        errorCategory = classifyResendError(r.status, body);
        reason = `Resend a répondu ${r.status}: ${body?.message ?? body?.name ?? "erreur inconnue"}`;
      }
    } catch (e) {
      errorCategory = "EDGE_FUNCTION_ERROR";
      reason = `Impossible de joindre Resend: ${(e as Error).message}`;
    }
  }

  // 2. Recent live-send success (< 30 min) from health checks
  let lastLiveSend: string | null = null;
  const { data: lastRow } = await admin
    .from("email_health_checks")
    .select("ts, live_send_ok")
    .eq("live_send_ok", true)
    .order("ts", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastRow?.ts) {
    lastLiveSend = lastRow.ts as string;
    const ageMin = (Date.now() - new Date(lastRow.ts as string).getTime()) / 60000;
    liveSendOk = ageMin < 30;
  }

  // 3. Compose overall status (no historical-only success)
  let overall: "healthy" | "degraded" | "failed";
  if (!resendAuthOk || !domainOk) {
    overall = "failed";
    if (!reason) reason = "Vérification live échouée.";
    impact = "FAILED — onboarding, activation entrepreneur et confirmations bloqués.";
  } else if (!liveSendOk) {
    overall = "degraded";
    reason = reason || "Aucun envoi live réussi dans les 30 dernières minutes.";
    impact = "DEGRADED — configuration OK mais aucune preuve récente de livraison.";
  } else {
    overall = "healthy";
    reason = "Auth Resend valide, domaine vérifié, envoi live confirmé.";
    impact = "HEALTHY — les emails transactionnels partent normalement.";
    errorCategory = "NONE";
  }

  // 4. Root cause counts (last 24h)
  const { data: cats } = await admin
    .from("email_failure_analysis")
    .select("*");

  // 5. Revenue impact estimate
  const { count: pendingOnboarding } = await admin
    .from("contractor_activation_checklists")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: failedOnboardingEmails } = await admin
    .from("email_delivery_events")
    .select("id", { count: "exact", head: true })
    .in("event_type", ["failed", "bounced"])
    .gte("event_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  const planAvg = 349;
  const activationRate = 0.15;
  const lostRevenue = Math.round(((failedOnboardingEmails ?? 0)) * activationRate * planAvg * 100) / 100;

  const latency = Date.now() - started;

  return new Response(
    JSON.stringify({
      status: overall,
      reason,
      impact,
      error_category: errorCategory,
      config,
      domain: domainDetails,
      sender: { email: SENDER_EMAIL, name: SENDER_NAME, valid: senderOk },
      lastLiveSend,
      liveSendOkWithin30min: liveSendOk,
      raw_resend: rawResend,
      root_causes: cats ?? [],
      revenue_impact: {
        pending_onboarding: pendingOnboarding ?? 0,
        failed_onboarding_emails_24h: failedOnboardingEmails ?? 0,
        plan_avg_cad: planAvg,
        activation_rate: activationRate,
        estimated_lost_revenue_cad: lostRevenue,
      },
      latency_ms: latency,
      checked_at: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
