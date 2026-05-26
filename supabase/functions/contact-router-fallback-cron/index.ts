// Cron-friendly endpoint — scans communication_fallback_queue for due rows and triggers fallback sends.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(SUPA_URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

  const now = new Date().toISOString();
  const { data: due, error } = await supa.from("communication_fallback_queue")
    .select("*").eq("processed", false).eq("cancelled", false).lte("scheduled_for", now).limit(50);
  if (error) return json({ error: error.message }, 500);

  const results: any[] = [];
  for (const row of due || []) {
    // Cancel if parent already delivered
    const { data: parent } = await supa.from("communication_logs")
      .select("delivery_status").eq("id", row.parent_log_id).maybeSingle();
    if (parent && ["delivered"].includes(parent.delivery_status)) {
      await supa.from("communication_fallback_queue").update({
        processed: true, processed_at: now, cancelled: true, cancelled_reason: "primary_delivered",
      }).eq("id", row.id);
      results.push({ id: row.id, cancelled: true });
      continue;
    }

    const { data: contact } = await supa.from("contacts").select("*").eq("id", row.contact_id).maybeSingle();
    if (!contact) {
      await supa.from("communication_fallback_queue").update({ processed: true, processed_at: now, cancelled: true, cancelled_reason: "no_contact" }).eq("id", row.id);
      continue;
    }

    // Trigger via router with channel_override
    const r = await fetch(`${SUPA_URL}/functions/v1/contact-router`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` },
      body: JSON.stringify({
        contact_id: contact.id,
        template_key: row.template_key,
        channel_override: row.fallback_channel,
        ...(row.payload || {}),
        idempotency_key: `fallback-${row.id}`,
      }),
    });
    const out = await r.json();
    await supa.from("communication_fallback_queue").update({
      processed: true, processed_at: now,
    }).eq("id", row.id);
    await supa.from("communication_logs").update({ fallback_triggered: true }).eq("id", row.parent_log_id);
    results.push({ id: row.id, fallback: out });
  }

  return json({ processed: results.length, results });
});
