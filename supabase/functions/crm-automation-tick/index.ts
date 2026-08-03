/**
 * crm-automation-tick — funnel-stage recovery rules.
 *
 * Rules (all routed through crm-recovery-action so dedupe, opt-out and audit
 * are shared with manual actions):
 *   delivered + 48h no click        -> second SMS
 *   second SMS + 48h no click       -> email
 *   clicked + 24h no registration   -> reminder email
 *   registered + 24h no payment     -> payment reminder
 *   failed SMS + valid email        -> onboarding email
 *
 * Defaults to dry_run: true. Body: { dry_run?: boolean, limit_per_rule?: number }
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Row = Record<string, any>;

const H = (n: number) => n * 3600 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const perRule = Math.min(Math.max(Number(body?.limit_per_rule ?? 10), 1), 50);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data, error } = await sb
      .from("v_crm_prospects")
      .select("*")
      .eq("opted_out", false)
      .is("paid_at", null)
      .order("priority_score", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Row[];
    const now = Date.now();
    const age = (ts: string | null) => (ts ? now - new Date(ts).getTime() : Infinity);

    const rules: Array<{ name: string; action: string; match: (r: Row) => boolean }> = [
      {
        name: "delivered_48h_no_click",
        action: "second_sms",
        match: (r) => r.sms_delivered > 0 && !r.clicked_at && age(r.sent_at) > H(48),
      },
      {
        name: "second_sms_48h_no_click",
        action: "onboarding_email",
        match: (r) => r.sms_sent > 1 && !r.clicked_at && r.has_email && age(r.last_activity_at) > H(48),
      },
      {
        name: "clicked_24h_no_registration",
        action: "send_email",
        match: (r) => !!r.clicked_at && !r.registered_at && r.has_email && age(r.clicked_at) > H(24),
      },
      {
        name: "registered_24h_no_payment",
        action: "payment_email",
        match: (r) => !!r.registered_at && !r.paid_at && r.has_email && age(r.registered_at) > H(24),
      },
      {
        name: "failed_sms_with_email",
        action: "onboarding_email",
        match: (r) => (r.sms_failed > 0 || r.sms_undelivered > 0) && r.has_email,
      },
    ];

    const claimed = new Set<string>();
    const summary: Array<Record<string, unknown>> = [];

    for (const rule of rules) {
      const targets = rows
        .filter((r) => !claimed.has(r.prospect_id) && rule.match(r))
        .slice(0, perRule);
      targets.forEach((r) => claimed.add(r.prospect_id));

      let outcome: unknown = { skipped: "no_targets" };
      if (targets.length > 0) {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/crm-recovery-action`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            apikey: SERVICE_KEY,
          },
          body: JSON.stringify({
            action: rule.action,
            prospect_ids: targets.map((t) => t.prospect_id),
            reason: `automation:${rule.name}`,
            source: "automation",
            dry_run: dryRun,
          }),
        });
        outcome = await r.json().catch(() => ({ error: "invalid_response" }));
      }

      summary.push({ rule: rule.name, action: rule.action, matched: targets.length, outcome });
    }

    return json({ ok: true, dry_run: dryRun, scanned: rows.length, rules: summary });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
