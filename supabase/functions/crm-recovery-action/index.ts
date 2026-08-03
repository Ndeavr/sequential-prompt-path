/**
 * crm-recovery-action — single entry point for every CRM recovery action.
 *
 * Dispatches to the EXISTING production functions (no new sender, no duplicated
 * pipeline). Guarantees: opt-out respected, one action per (prospect, action, day)
 * via idempotency key, and every attempt written to crm_action_log (audit).
 *
 * Body: { action, prospect_ids: string[], reason?, dry_run?, source? }
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE = "https://unpro.ca";

type ActionResult = { prospect_id: string; action: string; status: string; result: string };

const ACTIONS = new Set([
  "validate_phone",
  "retry_sms",
  "second_sms",
  "send_email",
  "onboarding_email",
  "payment_email",
  "payment_sms",
  "resume_checkout",
  "new_checkout",
  "schedule_followup",
  "pause",
  "archive",
  "tag",
  "note",
]);

function randToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

async function invokeFn(name: string, body: unknown) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${name} [${r.status}]: ${text.slice(0, 300)}`);
  return text.slice(0, 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const prospectIds: string[] = Array.isArray(body?.prospect_ids)
      ? body.prospect_ids.map(String).slice(0, 100)
      : [];
    const reason = body?.reason ? String(body.reason) : null;
    const source = body?.source === "automation" ? "automation" : "manual";
    const dryRun = body?.dry_run === true;
    const payloadExtra = (body?.payload ?? {}) as Record<string, unknown>;

    if (!ACTIONS.has(action)) return json({ error: "unknown_action", action }, 400);
    if (prospectIds.length === 0) return json({ error: "missing_prospect_ids" }, 400);

    // Actor (audit) — best effort from the caller's JWT.
    let actorId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await sb.auth.getUser(authHeader.slice(7));
      actorId = data?.user?.id ?? null;
    }

    const day = new Date().toISOString().slice(0, 10);
    const results: ActionResult[] = [];

    for (const pid of prospectIds) {
      const idem = `${pid}:${action}:${day}`;
      let status = "success";
      let result = "";

      try {
        const { data: p } = await sb
          .from("verified_contractor_prospects")
          .select("id, business_name, city, category, email, phone_e164, outreach_status")
          .eq("id", pid)
          .maybeSingle();
        if (!p) throw new Error("prospect_not_found");

        // Opt-out / STOP guard for every outbound action.
        const outbound = ["retry_sms", "second_sms", "send_email", "onboarding_email", "payment_email", "payment_sms"];
        if (outbound.includes(action)) {
          if (p.phone_e164) {
            const { data: stop } = await sb
              .from("sms_opt_outs")
              .select("id")
              .eq("normalized_phone", p.phone_e164)
              .maybeSingle();
            if (stop) throw new Error("opted_out");
          }
          // Idempotency: same action, same prospect, same day → skip.
          const { data: prior } = await sb
            .from("crm_action_log")
            .select("id")
            .eq("idempotency_key", idem)
            .maybeSingle();
          if (prior) {
            results.push({ prospect_id: pid, action, status: "skipped", result: "duplicate_same_day" });
            continue;
          }
        }

        if (dryRun) {
          results.push({ prospect_id: pid, action, status: "dry_run", result: "would_execute" });
          continue;
        }

        // Resolve or create an activation token/link when needed.
        const needsLink = ["payment_email", "payment_sms", "second_sms", "resume_checkout", "new_checkout", "onboarding_email", "send_email"];
        let link = "";
        if (needsLink.includes(action)) {
          const { data: tok } = await sb
            .from("verified_prospect_tokens")
            .select("token")
            .eq("prospect_id", pid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          let token = tok?.token as string | undefined;
          if (!token || action === "new_checkout") {
            token = randToken();
            const { error } = await sb.from("verified_prospect_tokens").insert({ token, prospect_id: pid });
            if (error) throw new Error(`token_create_failed: ${error.message}`);
          }
          link = `${BASE}/unpro/activate/${token}`;
        }

        switch (action) {
          case "validate_phone":
            result = await invokeFn("contact-verification-enqueue", {
              business_name: p.business_name,
              phone: p.phone_e164,
              email: p.email,
              category: p.category,
              city: p.city,
              source_lead_id: pid,
              source_table: "verified_contractor_prospects",
            });
            break;

          case "retry_sms":
            result = await invokeFn("send-verified-batch", { prospect_ids: [pid], dry_run: false, limit: 1 });
            break;

          case "second_sms":
          case "payment_sms":
            result = await invokeFn("second-touch-outreach", { prospect_ids: [pid], dry_run: false, limit: 1 });
            break;

          case "send_email":
          case "onboarding_email": {
            if (!p.email) throw new Error("no_email");
            result = await invokeFn("send-transactional-email", {
              templateName: "prospect-outreach",
              recipientEmail: p.email,
              idempotencyKey: `crm-${idem}`,
              templateData: {
                companyName: p.business_name,
                city: p.city,
                category: p.category,
                activationUrl: link,
              },
            });
            break;
          }

          case "payment_email": {
            if (!p.email) throw new Error("no_email");
            result = await invokeFn("send-transactional-email", {
              templateName: "incomplete-checkout-followup",
              recipientEmail: p.email,
              idempotencyKey: `crm-${idem}`,
              templateData: {
                firstName: p.business_name,
                planName: "Activation 1 $",
                checkoutUrl: link,
              },
            });
            break;
          }

          case "resume_checkout":
          case "new_checkout":
            result = link;
            break;

          case "schedule_followup":
            await sb.from("acquisition_followup_queue").insert({
              prospect_id: pid,
              scheduled_for: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
              reason: reason ?? "crm_manual",
            });
            result = "scheduled_24h";
            break;

          case "pause":
            await sb.from("verified_contractor_prospects")
              .update({ outreach_status: "paused", last_action_at: new Date().toISOString() })
              .eq("id", pid);
            result = "paused";
            break;

          case "archive":
            await sb.from("verified_contractor_prospects")
              .update({ outreach_status: "archived", last_action_at: new Date().toISOString() })
              .eq("id", pid);
            result = "archived";
            break;

          case "tag": {
            const tag = String(payloadExtra.tag ?? "").trim();
            if (!tag) throw new Error("missing_tag");
            await sb.from("crm_prospect_tags").upsert(
              { prospect_id: pid, tag, author_id: actorId },
              { onConflict: "prospect_id,tag" },
            );
            result = `tag:${tag}`;
            break;
          }

          case "note": {
            const note = String(payloadExtra.note ?? "").trim();
            if (!note) throw new Error("missing_note");
            await sb.from("crm_prospect_notes").insert({ prospect_id: pid, note, author_id: actorId });
            result = "note_added";
            break;
          }
        }
      } catch (e) {
        status = "failed";
        result = e instanceof Error ? e.message : String(e);
      }

      results.push({ prospect_id: pid, action, status, result: result.slice(0, 400) });

      await sb.from("crm_action_log").insert({
        prospect_id: pid,
        action,
        source,
        reason,
        status,
        result: result.slice(0, 1000),
        payload: { dry_run: dryRun, ...payloadExtra },
        actor_id: actorId,
        idempotency_key: status === "success" && !dryRun ? idem : `${idem}:${crypto.randomUUID().slice(0, 8)}`,
      });
    }

    return json({
      ok: true,
      action,
      dry_run: dryRun,
      total: results.length,
      succeeded: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
