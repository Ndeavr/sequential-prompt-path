/**
 * second-touch-outreach — Step 4 of the "first dollar" run.
 *
 * Targets prospects whose FIRST SMS was actually DELIVERED (Twilio-confirmed)
 * but who never clicked. Sends one short second-touch SMS with the proven
 * /unpro/activate/:token link.
 *
 * Safety: dry_run defaults to true, hard cap, opt-out check, one second touch
 * per prospect (tracked via acq_sms_logs.relance_kind = 'second_touch').
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildOutreachUrl, smsWithLink } from "../_shared/outreachLink.ts";
import { secondTouchSms, clickRecoverySms } from "../_shared/offerCopy.ts";
import { sendSms } from "../_shared/twilioSend.ts";

const RELANCE_KIND = "second_touch";
const CLICK_RECOVERY_KIND = "click_recovery";
const ALLOWED_KINDS = new Set([RELANCE_KIND, CLICK_RECOVERY_KIND]);

function buildMessage(businessName: string, token: string, kind: string): string {
  const name = (businessName || "").trim().slice(0, 40);
  const url = buildOutreachUrl(`/unpro/activate/${token}`, {
    campaign: kind === CLICK_RECOVERY_KIND ? "click_recovery" : "second_touch",
  });
  return smsWithLink(
    kind === CLICK_RECOVERY_KIND ? clickRecoverySms(name) : secondTouchSms(name),
    url,
  );
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    let dryRun = true;
    let limit = 10;
    let targetIds: string[] | null = null;
    let relanceKind = RELANCE_KIND;
    try {
      const body = await req.json();
      if (body?.dry_run === false) dryRun = false;
      if (typeof body?.relance_kind === "string" && ALLOWED_KINDS.has(body.relance_kind)) {
        relanceKind = body.relance_kind;
      }
      if (typeof body?.limit === "number") limit = Math.min(Math.max(body.limit, 1), 25);
      if (Array.isArray(body?.prospect_ids) && body.prospect_ids.length > 0) {
        targetIds = body.prospect_ids.map(String).slice(0, 25);
      }
    } catch { /* defaults */ }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Global kill-switch.
    const { data: controls } = await supabase
      .from("recruitment_controls")
      .select("global_enabled, sms_enabled")
      .limit(1)
      .maybeSingle();

    if (!dryRun && (!controls?.global_enabled || !controls?.sms_enabled)) {
      return json({ error: "controls_disabled", controls }, 423);
    }

    // Candidates: Twilio-confirmed delivered, never clicked, not yet second-touched.
    // When prospect_ids is provided (CRM recovery action), target those exactly.
    let candQuery = supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, city, phone_e164, outreach_status")
      .not("phone_e164", "is", null)
      .limit(200);
    candQuery = targetIds
      ? candQuery.in("id", targetIds)
      : candQuery.eq("outreach_status", "delivered");
    const { data: candidates, error: candErr } = await candQuery;

    if (candErr) return json({ error: "read_failed", details: candErr.message }, 500);

    const ids = (candidates ?? []).map((c) => c.id);
    if (ids.length === 0) return json({ ok: true, eligible: 0, attempts: [] });

    // Cross-automation duplicate guard window: any contact logged in
    // acq_sms_logs by ANY automation inside this window blocks a new send.
    const DUP_GUARD_HOURS = Number(Deno.env.get("OUTREACH_DUP_GUARD_HOURS") ?? 24);
    const dupSince = new Date(Date.now() - DUP_GUARD_HOURS * 3600_000).toISOString();

    const [{ data: tokens }, { data: already }, { data: optOuts }, { data: recentLogs }] = await Promise.all([
      supabase.from("verified_prospect_tokens").select("token, prospect_id, clicked_at").in("prospect_id", ids),
      supabase.from("acq_sms_logs").select("prospect_id").eq("relance_kind", relanceKind).in("prospect_id", ids),
      supabase.from("sms_opt_outs").select("normalized_phone"),
      supabase.from("acq_sms_logs").select("prospect_id, recipient_phone").gte("created_at", dupSince).in("prospect_id", ids),
    ]);

    const tokenBy = new Map<string, { token: string; clicked_at: string | null }>();
    for (const t of tokens ?? []) {
      tokenBy.set(t.prospect_id as string, { token: t.token as string, clicked_at: t.clicked_at as string | null });
    }
    const done = new Set((already ?? []).map((r) => r.prospect_id as string));
    const optedOut = new Set((optOuts ?? []).map((r) => String(r.normalized_phone)));
    const recentIds = new Set((recentLogs ?? []).map((r) => String(r.prospect_id)));
    const recentPhones = new Set((recentLogs ?? []).map((r) => String(r.recipient_phone)));

    // Targeted mode (explicit prospect_ids): recovering prospects who ALREADY
    // clicked is the whole point, so the clicked_at filter is skipped there.
    const skipClickedFilter = Boolean(targetIds);
    let duplicateSkipped = 0;
    const eligible = (candidates ?? []).filter((c) => {
      const tk = tokenBy.get(c.id as string);
      if (!tk) return false;
      if (!skipClickedFilter && tk.clicked_at) return false;
      if (done.has(c.id as string) || optedOut.has(String(c.phone_e164))) return false;
      if (recentIds.has(String(c.id)) || recentPhones.has(String(c.phone_e164))) {
        duplicateSkipped += 1;
        return false;
      }
      return true;
    });

    const batch = eligible.slice(0, limit);


    const attempts: Array<Record<string, unknown>> = [];

    for (const p of batch) {
      const tk = tokenBy.get(p.id as string)!;
      const message = buildMessage(p.business_name as string, tk.token, relanceKind);

      if (dryRun) {
        attempts.push({
          prospect_id: p.id,
          business_name: p.business_name,
          city: p.city,
          to: p.phone_e164,
          message,
          dry_run: true,
        });
        continue;
      }

      const sendResult = await sendSms({
        to: String(p.phone_e164),
        body: message,
        message_type: "reengagement",
        template_key: relanceKind,
        prospect_id: String(p.id),
        metadata: { source: "second-touch-outreach", relance_kind: relanceKind },
      });
      const providerId = sendResult.twilio_sid;
      const status = sendResult.status;
      const error = sendResult.error_message ?? null;


      await supabase.from("acq_sms_logs").insert({
        prospect_id: p.id,
        recipient_phone: String(p.phone_e164),
        body: message,
        status,
        provider_message_id: providerId,
        error,
        sent_at: new Date().toISOString(),
        relance_kind: relanceKind,
        message_purpose: "commercial_outreach",
      });

      attempts.push({
        prospect_id: p.id,
        business_name: p.business_name,
        to: p.phone_e164,
        status,
        provider_message_id: providerId,
        error,
      });
    }

    return json({
      ok: true,
      dry_run: dryRun,
      relance_kind: relanceKind,
      eligible: eligible.length,
      duplicate_skipped: duplicateSkipped,

      attempted: attempts.length,
      sent: attempts.filter((a) => a.provider_message_id).length,
      attempts,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
