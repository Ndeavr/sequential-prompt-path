// outreach-retry-failed — resets retryable failed queue rows to 'queued', then triggers send.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined;
    const allRetryable = body?.all_retryable === true;
    const trigger = body?.trigger_send !== false;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find candidate queue rows: status='failed' AND latest log retryable=true.
    // Pull failed queue rows.
    let q = sb.from("contractor_outreach_queue").select("id, phone, attempts").eq("status", "failed");
    if (ids?.length) q = q.in("id", ids);
    else if (!allRetryable) return json({ error: "must pass ids or all_retryable=true" }, 400);

    const { data: failedRows, error: qErr } = await q.limit(200);
    if (qErr) throw qErr;
    if (!failedRows?.length) return json({ retried: 0, note: "no failed rows" });

    const queueIds = failedRows.map((r) => r.id);

    // Latest log per queue_id.
    const { data: logs } = await sb
      .from("outreach_delivery_logs")
      .select("queue_id, retryable, created_at")
      .in("queue_id", queueIds)
      .order("created_at", { ascending: false });

    const latestByQueue = new Map<string, boolean>();
    for (const l of logs ?? []) {
      if (!latestByQueue.has(l.queue_id)) latestByQueue.set(l.queue_id, !!l.retryable);
    }

    const retryable = failedRows.filter((r) => latestByQueue.get(r.id) === true);
    if (!retryable.length) return json({ retried: 0, note: "no retryable failures" });

    const { error: uErr } = await sb
      .from("contractor_outreach_queue")
      .update({
        status: "queued",
        last_error: null,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", retryable.map((r) => r.id));
    if (uErr) throw uErr;

    let sendResult: unknown = null;
    if (trigger) {
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/solicitation-send-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ batch: Math.min(retryable.length, 25) }),
      });
      sendResult = await r.json().catch(() => ({ ok: r.ok }));
    }

    return json({ retried: retryable.length, queue_ids: retryable.map((r) => r.id), send: sendResult });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
