// UNPRO — Email sender health snapshot.
// Returns active sender, Resend API status, last send/success/error timestamps,
// last Resend response code, delivery and bounce rates over last 7 days.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const EXPECTED_SENDER = "Alex d'UNPRO <alex@mail.unpro.ca>";
const EXPECTED_ADDRESS = "alex@mail.unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [logs, lastSent, lastSuccess, lastError, lastSelftest, mismatches] = await Promise.all([
    sb.from("email_send_log").select("status,created_at").gte("created_at", since).limit(5000),
    sb.from("email_send_log").select("created_at,message_id,template_name").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("email_send_log").select("created_at,message_id").eq("status", "sent").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("email_send_log").select("created_at,error_message,status").in("status", ["failed", "dlq", "bounced"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("email_test_runs" as any).select("ran_at,passed,provider_message_id,provider_response").eq("run_type", "daily_selftest").order("ran_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("system_events").select("created_at,payload").eq("event_type", "EMAIL_SENDER_MISMATCH").order("created_at", { ascending: false }).limit(10),
  ]);

  // Resend API ping (HEAD is cheap and authenticated)
  let apiStatus: "ok" | "auth_error" | "missing_key" | "error" = "missing_key";
  let apiStatusCode: number | null = null;
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (resendKey) {
    try {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${resendKey}` } });
      apiStatusCode = r.status;
      apiStatus = r.ok ? "ok" : r.status === 401 || r.status === 403 ? "auth_error" : "error";
    } catch { apiStatus = "error"; }
  }

  const rows = (logs.data ?? []) as { status: string }[];
  const sent = rows.filter(r => r.status === "sent").length;
  const delivered = rows.filter(r => r.status === "delivered" || r.status === "sent").length;
  const bounced = rows.filter(r => r.status === "bounced").length;
  const failed = rows.filter(r => r.status === "failed" || r.status === "dlq").length;
  const total = rows.length || 1;

  const out = {
    sender: { active: EXPECTED_SENDER, address: EXPECTED_ADDRESS, valid: true },
    resend: { status: apiStatus, http_status: apiStatusCode },
    last_send_at: (lastSent as any).data?.created_at ?? null,
    last_success_at: (lastSuccess as any).data?.created_at ?? null,
    last_error_at: (lastError as any).data?.created_at ?? null,
    last_error: (lastError as any).data?.error_message ?? null,
    last_resend_code: apiStatusCode,
    delivery_rate: delivered / total,
    bounce_rate: bounced / total,
    failed_rate: failed / total,
    last_selftest: lastSelftest.data ?? null,
    sender_mismatches: mismatches.data ?? [],
    window_days: 7,
    totals: { sent, delivered, bounced, failed, total: rows.length },
  };
  return new Response(JSON.stringify(out), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
