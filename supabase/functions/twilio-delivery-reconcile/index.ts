/**
 * twilio-delivery-reconcile — Step 1 of the "first dollar" run.
 *
 * Reads every verified_contractor_prospects row that has an outreach_twilio_sid
 * and asks Twilio for the REAL status of that message. Writes the truth back to
 * the prospect row and mirrors it into acq_sms_logs so the admin cockpit stops
 * guessing.
 *
 * NEVER sends anything. Read-only against Twilio.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DELIVERED = new Set(["delivered", "read"]);
const FAILED = new Set(["failed", "undelivered", "canceled"]);

interface TwilioMessage {
  sid: string;
  status: string;
  error_code: number | null;
  error_message: string | null;
  date_sent: string | null;
  to: string;
  body: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!sid || !token) return json({ error: "twilio_not_configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let limit = 500;
    try {
      const body = await req.json();
      if (typeof body?.limit === "number") limit = Math.min(body.limit, 1000);
    } catch { /* no body */ }

    const { data: prospects, error: readErr } = await supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, phone_e164, outreach_twilio_sid, outreach_sent_at")
      .not("outreach_twilio_sid", "is", null)
      .order("outreach_sent_at", { ascending: false })
      .limit(limit);

    if (readErr) return json({ error: "read_failed", details: readErr.message }, 500);

    const auth = "Basic " + btoa(`${sid}:${token}`);
    const tally: Record<string, number> = {};
    const errorCodes: Record<string, number> = {};
    const results: Array<Record<string, unknown>> = [];

    for (const p of prospects ?? []) {
      const msgSid = p.outreach_twilio_sid as string;
      let msg: TwilioMessage | null = null;
      let fetchError: string | null = null;

      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${msgSid}.json`,
          { headers: { Authorization: auth } },
        );
        if (res.ok) {
          msg = (await res.json()) as TwilioMessage;
        } else {
          fetchError = `twilio_${res.status}: ${(await res.text()).slice(0, 200)}`;
        }
      } catch (e) {
        fetchError = e instanceof Error ? e.message : String(e);
      }

      if (!msg) {
        tally["lookup_failed"] = (tally["lookup_failed"] ?? 0) + 1;
        results.push({ business_name: p.business_name, sid: msgSid, error: fetchError });
        continue;
      }

      const status = msg.status ?? "unknown";
      tally[status] = (tally[status] ?? 0) + 1;
      if (msg.error_code) {
        const k = String(msg.error_code);
        errorCodes[k] = (errorCodes[k] ?? 0) + 1;
      }

      const delivered = DELIVERED.has(status);
      const failed = FAILED.has(status);

      await supabase
        .from("verified_contractor_prospects")
        .update({
          outreach_delivered_at: delivered
            ? (msg.date_sent ?? p.outreach_sent_at ?? new Date().toISOString())
            : null,
          outreach_failure_reason: failed
            ? `${status}${msg.error_code ? ` (${msg.error_code}: ${msg.error_message ?? ""})` : ""}`
            : null,
          outreach_status: delivered ? "delivered" : failed ? "failed" : "sent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);

      // Mirror into acq_sms_logs (idempotent on provider_message_id).
      const { data: existing } = await supabase
        .from("acq_sms_logs")
        .select("id")
        .eq("provider_message_id", msgSid)
        .maybeSingle();

      const logRow = {
        prospect_id: p.id,
        recipient_phone: p.phone_e164 ?? msg.to,
        body: (msg.body ?? "").slice(0, 1000),
        status,
        provider_message_id: msgSid,
        error: msg.error_code ? `${msg.error_code}: ${msg.error_message ?? ""}` : null,
        sent_at: msg.date_sent ?? p.outreach_sent_at,
        message_purpose: "commercial_outreach" as const,
      };

      if (existing?.id) {
        await supabase.from("acq_sms_logs").update(logRow).eq("id", existing.id);
      } else {
        await supabase.from("acq_sms_logs").insert(logRow);
      }

      results.push({
        business_name: p.business_name,
        sid: msgSid,
        status,
        error_code: msg.error_code,
        error_message: msg.error_message,
      });
    }

    // Second pass — reconcile any non-final acq_sms_logs row (second touch,
    // relances) that has a Twilio SID but no confirmed outcome yet.
    const { data: pendingLogs } = await supabase
      .from("acq_sms_logs")
      .select("id, provider_message_id, status, relance_kind")
      .not("provider_message_id", "is", null)
      .in("status", ["queued", "accepted", "sending", "sent"])
      .limit(500);

    const relanceTally: Record<string, number> = {};

    for (const log of pendingLogs ?? []) {
      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${log.provider_message_id}.json`,
          { headers: { Authorization: auth } },
        );
        if (!res.ok) continue;
        const msg = (await res.json()) as TwilioMessage;
        const st = msg.status ?? "unknown";
        relanceTally[st] = (relanceTally[st] ?? 0) + 1;
        await supabase
          .from("acq_sms_logs")
          .update({
            status: st,
            error: msg.error_message ?? (msg.error_code ? String(msg.error_code) : null),
          })
          .eq("id", log.id);
      } catch { /* skip */ }
    }

    const checked = results.length;

    const deliveredCount = Object.entries(tally)
      .filter(([k]) => DELIVERED.has(k))
      .reduce((a, [, v]) => a + v, 0);

    return json({
      ok: true,
      checked,
      delivered: deliveredCount,
      delivery_rate: checked ? Math.round((deliveredCount / checked) * 100) : 0,
      status_breakdown: tally,
      relance_status_breakdown: relanceTally,
      error_codes: errorCodes,
      sample: results.slice(0, 25),
    });

  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
