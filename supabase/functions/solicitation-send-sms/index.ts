// solicitation-send-sms — pick queued rows, assign variant, send via Twilio,
// insert a full outreach_delivery_logs row for EVERY attempt (success or failure),
// update queue status, and flip first-dollar milestone on first successful send.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { classifyTwilio, classifyNetworkError } from "../_shared/outreachRetryPolicy.ts";
import { normalizePhone } from "../_shared/normalizePhone.ts";
import { isOutreachEnabled } from "../_shared/killSwitch.ts";
import { guardPhone } from "../_shared/phoneGuard.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const BASE_URL = "https://unpro.ca/activation";
const GATEWAY = "https://connector-gateway.lovable.dev/twilio";

function render(tpl: string, ctx: Record<string, string>) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => ctx[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const batch = Math.min(Math.max(parseInt(body?.batch ?? "25"), 1), 50);
    const dryRun = body?.dry_run === true;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Kill switch — refuse to send while OUTREACH_ENABLED = false.
    if (!dryRun && !(await isOutreachEnabled(sb))) {
      return json({
        sent: 0,
        blocked: "outreach_disabled",
        note: "Kill switch OUTREACH_ENABLED is OFF. Flip it in /admin/provider-health once Twilio auth passes.",
      });
    }

    // Daily cap check
    const today = new Date().toISOString().slice(0, 10);
    const { count: sentToday } = await sb
      .from("contractor_outreach_queue")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", `${today}T00:00:00Z`);
    const DAILY_MAX = 50;
    const remaining = Math.max(0, DAILY_MAX - (sentToday ?? 0));
    const toSend = Math.min(batch, remaining);
    if (toSend === 0) return json({ sent: 0, note: "daily cap reached" });

    const { data: variants } = await sb
      .from("solicitation_message_variants")
      .select("*")
      .eq("active", true);
    if (!variants || variants.length === 0)
      return json({ error: "no active variants" }, 500);

    const { data: queued } = await sb
      .from("contractor_outreach_queue")
      .select("*")
      .eq("status", "queued")
      .order("score", { ascending: false })
      .limit(toSend);

    if (!queued || queued.length === 0) return json({ sent: 0, note: "queue empty" });

    async function insertLog(row: any, patch: Record<string, unknown>) {
      await sb.from("outreach_delivery_logs").insert({
        queue_id: row.id,
        channel: "sms",
        provider: "twilio",
        recipient_raw: row.phone,
        recipient_normalized: normalizePhone(row.phone).normalized,
        is_test: !!row.is_test,
        attempt: (row.attempts ?? 0) + 1,
        ...patch,
      });
    }

    async function flipMilestone(event: string, row: any, extra: Record<string, unknown> = {}) {
      await sb.from("first_dollar_milestones").insert({
        event,
        queue_id: row.id,
        contractor_id: row.contractor_id ?? null,
        metadata: extra,
      }).select().maybeSingle().then(() => {}).catch(() => {}); // unique constraint = ignore dupes
    }

    let sent = 0, failed = 0;
    const results: any[] = [];

    for (let i = 0; i < queued.length; i++) {
      const row = queued[i];
      const variant = variants[i % variants.length];
      const link = `${BASE_URL}?t=${row.tracking_slug}`;
      const message = render(variant.template, {
        company: row.company_name || "",
        city: row.city || "votre secteur",
        category: row.category || "en rénovation",
        link,
      });

      if (dryRun) {
        results.push({ phone: row.phone, variant: variant.code, message });
        continue;
      }

      if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM) {
        await insertLog(row, {
          status: "failed",
          error_code: "missing_secret",
          error_message: "Twilio secrets not configured",
          retryable: false,
          message_body: message,
          raw_response: {
            missing: {
              LOVABLE_API_KEY: !LOVABLE_API_KEY,
              TWILIO_API_KEY: !TWILIO_API_KEY,
              TWILIO_FROM_NUMBER: !TWILIO_FROM,
            },
          },
        });
        return json({ error: "twilio_not_configured" }, 500);
      }

      try {
        const r = await fetch(`${GATEWAY}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: row.phone, From: TWILIO_FROM, Body: message }),
        });
        const txt = await r.text();
        let parsed: unknown = txt;
        try { parsed = JSON.parse(txt); } catch { /* keep raw */ }

        if (!r.ok) {
          const cls = classifyTwilio(r.status, parsed);
          await insertLog(row, {
            status: "failed",
            error_code: cls.error_code,
            error_message: cls.error_message,
            retryable: cls.retryable,
            message_body: message,
            raw_response: parsed,
          });
          await sb.from("contractor_outreach_queue").update({
            status: "failed",
            last_error: `${cls.error_code}: ${cls.error_message}`.slice(0, 240),
            attempts: (row.attempts ?? 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq("id", row.id);
          failed++;
          results.push({ phone: row.phone, error_code: cls.error_code, retryable: cls.retryable });
          continue;
        }

        const providerMsgId = (parsed as any)?.sid ?? null;
        await insertLog(row, {
          status: "sent",
          provider_message_id: providerMsgId,
          message_body: message,
          raw_response: parsed,
          sent_at: new Date().toISOString(),
        });
        await sb.from("contractor_outreach_queue").update({
          status: "sms_sent",
          message_variant: variant.code,
          sent_at: new Date().toISOString(),
          attempts: (row.attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
        if (!row.is_test) {
          await flipMilestone("first_delivery", row, { variant: variant.code, sid: providerMsgId });
        }
        await sb.rpc("increment_variant_sent" as any, {}).catch(() => {});
        sent++;
        results.push({ phone: row.phone, variant: variant.code, ok: true, sid: providerMsgId });
      } catch (e) {
        const cls = classifyNetworkError(e);
        await insertLog(row, {
          status: "failed",
          error_code: cls.error_code,
          error_message: cls.error_message,
          retryable: cls.retryable,
          message_body: message,
          raw_response: { error: String(e) },
        });
        await sb.from("contractor_outreach_queue").update({
          status: "failed",
          last_error: `${cls.error_code}: ${cls.error_message}`.slice(0, 240),
          attempts: (row.attempts ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
        failed++;
      }
    }

    return json({ sent, failed, dry_run: dryRun, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
