// /admin/funnel-debug — E2E test: insert lead + real SMS + poll delivery status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendSms } from "../_shared/twilioSend.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizePhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return p.startsWith("+") ? p : "+" + d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u?.user?.id) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(String(body.phone ?? "+15142499522"));
    const name = String(body.name ?? "Test Funnel Debug");
    const category = String(body.category ?? "Plombier");
    const city = String(body.city ?? "Montréal");

    const trace: Array<{ step: string; at: string; ok: boolean; detail?: any }> = [];
    const push = (step: string, ok: boolean, detail?: any) =>
      trace.push({ step, ok, at: new Date().toISOString(), detail });

    // 1. Upsert lead
    const { data: lead, error: leadErr } = await admin
      .from("launch_leads")
      .insert({
        phone,
        company_name: name,
        trade: category,
        city,
        source_agent: "funnel_debug_test",
        lead_status: "scraped",
        payload: { test: true, started_by: u.user.id },
      })
      .select("id")
      .single();
    if (leadErr) {
      push("lead_insert", false, { error: leadErr.message });
      return json({ ok: false, trace, first_break: { step: "lead_insert", reason: leadErr.message } }, 200);
    }
    push("lead_insert", true, { lead_id: lead!.id });

    // 2. Create run row
    const { data: run } = await admin
      .from("funnel_debug_runs")
      .insert({
        started_by: u.user.id,
        lead_phone: phone,
        lead_name: name,
        lead_category: category,
        lead_city: city,
        trace,
        status: "running",
      })
      .select("id")
      .single();

    // 3. Send real SMS
    const smsUrl = `${Deno.env.get("APP_ORIGIN") ?? "https://unpro.ca"}/entrepreneur/activer?src=funnel_debug&lead=${lead!.id}`;
    const smsBody = `UNPRO — Test funnel. Un rendez-vous vous attend: ${smsUrl}`;

    let messageSid: string | null = null;
    try {
      const res = await sendSms({
        to: phone,
        body: smsBody,
        message_type: "test",
        template_key: "funnel_debug_test",
        lead_id: lead!.id,
        strict_admin_override: true,
        bypass_guard: true,
        metadata: { funnel_debug: true, run_id: run?.id },
      });
      messageSid = res?.twilio_sid ?? null;
      push("sms_sent", !!messageSid, { messageSid, status: res?.status, error: res?.error_message });
    } catch (e) {
      push("sms_sent", false, { error: (e as Error).message });
    }

    // 4. Poll delivery status (up to 45s)
    let delivered = false;
    let deliveryError: string | null = null;
    if (messageSid) {
      const deadline = Date.now() + 45_000;
      while (Date.now() < deadline) {
        const { data: rows } = await admin
          .from("sms_events_v2")
          .select("status,delivered_at,failed_at,error_code,error_message")
          .eq("twilio_sid", messageSid)
          .order("created_at", { ascending: false })
          .limit(1);
        const row = rows?.[0];
        if (row?.delivered_at || row?.status === "delivered") {
          delivered = true;
          push("sms_delivered", true, { at: row.delivered_at });
          break;
        }
        if (row?.failed_at || row?.status === "failed" || row?.status === "undelivered") {
          deliveryError = row?.error_message || row?.error_code || "failed";
          push("sms_delivered", false, { error: deliveryError });
          break;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (!delivered && !deliveryError) push("sms_delivered", false, { error: "Timeout — pas de webhook Twilio après 45s" });
    }

    const firstBreak = trace.find((t) => !t.ok) ?? null;
    const status = firstBreak ? "broken" : "sms_delivered_awaiting_click";

    await admin
      .from("funnel_debug_runs")
      .update({
        message_sid: messageSid,
        trace,
        status,
        first_break_step: firstBreak?.step ?? null,
        first_break_reason: firstBreak?.detail?.error ?? null,
        finished_at: firstBreak ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", run!.id);

    return json({
      ok: !firstBreak,
      run_id: run?.id,
      lead_id: lead!.id,
      message_sid: messageSid,
      sms_url: smsUrl,
      trace,
      first_break: firstBreak,
      note: "Les étapes clic → activation seront visibles dans la ligne du lead sur /admin/funnel-debug.",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
