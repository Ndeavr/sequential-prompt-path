// Phase 3 — Queue creation repair.
// Audits why contactable leads are not ready_for_contact and (if execute=true)
// transitions them: has phone_e164/phone OR email AND NOT do_not_contact/unsubscribed => ready_for_contact.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const execute = body?.execute === true;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: contactable } = await sb
      .from("contractor_leads")
      .select("id, lead_status, phone, phone_type, email, do_not_contact, unsubscribed_at, sms_disabled, email_fallback_enabled")
      .or("phone.not.is.null,email.not.is.null");

    const total_contactable = contactable?.length ?? 0;
    const before_ready = contactable?.filter((l) => l.lead_status === "ready_for_contact").length ?? 0;

    const eligible: string[] = [];
    const blocked: Array<{ id: string; reason: string }> = [];
    for (const l of contactable ?? []) {
      if (l.do_not_contact) { blocked.push({ id: l.id, reason: "do_not_contact" }); continue; }
      if (l.unsubscribed_at) { blocked.push({ id: l.id, reason: "unsubscribed" }); continue; }
      if (!l.phone && !l.email) { blocked.push({ id: l.id, reason: "no_channel" }); continue; }
      if (l.lead_status === "ready_for_contact") continue;
      if (l.lead_status && !["new", "enriched", null].includes(l.lead_status)) {
        // don't override contacted/qualified etc
        blocked.push({ id: l.id, reason: `status_${l.lead_status}` });
        continue;
      }
      eligible.push(l.id);
    }

    let promoted = 0;
    if (execute && eligible.length) {
      // batch update in chunks of 200
      for (let i = 0; i < eligible.length; i += 200) {
        const slice = eligible.slice(i, i + 200);
        const { error, count } = await sb
          .from("contractor_leads")
          .update({ lead_status: "ready_for_contact", updated_at: new Date().toISOString() }, { count: "exact" })
          .in("id", slice)
          .in("lead_status", ["new", "enriched"]);
        if (!error) promoted += count ?? slice.length;
      }
    }

    const { count: after_ready } = await sb
      .from("contractor_leads")
      .select("id", { count: "exact", head: true })
      .eq("lead_status", "ready_for_contact");

    return new Response(JSON.stringify({
      ok: true,
      execute,
      total_contactable,
      before_ready,
      eligible: eligible.length,
      promoted,
      after_ready: after_ready ?? null,
      blocked_by_reason: blocked.reduce((acc, b) => {
        acc[b.reason] = (acc[b.reason] ?? 0) + 1; return acc;
      }, {} as Record<string, number>),
      blocked_samples: blocked.slice(0, 30),
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
