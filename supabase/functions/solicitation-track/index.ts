// solicitation-track — mark clicked/registered/payment_started/activated on queue rows by tracking_slug.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const EVENT_TO_FIELDS: Record<string, { field: string; nextStatus: string }> = {
  clicked: { field: "clicked_at", nextStatus: "clicked" },
  registered: { field: "registered_at", nextStatus: "registered" },
  payment_started: { field: "payment_started_at", nextStatus: "payment_started" },
  activated: { field: "activated_at", nextStatus: "activated" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const { slug, event } = body ?? {};
    if (!slug || !event || !EVENT_TO_FIELDS[event]) return json({ error: "invalid_params" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await sb.from("contractor_outreach_queue").select("*").eq("tracking_slug", slug).maybeSingle();
    if (!row) return json({ error: "unknown_slug" }, 404);

    const cfg = EVENT_TO_FIELDS[event];
    const patch: Record<string, unknown> = { status: cfg.nextStatus };
    // Only set timestamp if not already set (idempotent).
    if (!(row as any)[cfg.field]) patch[cfg.field] = new Date().toISOString();

    await sb.from("contractor_outreach_queue").update(patch).eq("id", row.id);

    // First-paid activation → record replication pattern
    if (event === "activated") {
      const { count: prior } = await sb.from("solicitation_first_wins").select("id", { count: "exact", head: true });
      if ((prior ?? 0) === 0) {
        const t0 = row.sent_at ? new Date(row.sent_at).getTime() : Date.now();
        const now = Date.now();
        await sb.from("solicitation_first_wins").insert({
          queue_id: row.id,
          category: row.category,
          city: row.city,
          company_name: row.company_name,
          message_variant: row.message_variant,
          time_to_click_seconds: row.clicked_at ? Math.floor((new Date(row.clicked_at).getTime() - t0) / 1000) : null,
          time_to_register_seconds: row.registered_at ? Math.floor((new Date(row.registered_at).getTime() - t0) / 1000) : null,
          time_to_pay_seconds: Math.floor((now - t0) / 1000),
          revenue_cents: 100,
        });
      }
    }

    return json({
      ok: true,
      context: {
        company_name: row.company_name,
        city: row.city,
        category: row.category,
        variant: row.message_variant,
      },
    });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
