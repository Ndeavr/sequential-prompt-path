// revenue-path-audit — computes full-funnel counts + conversion + top blocker per stage
// over a rolling 30-day window (or the requested `days`).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Stage = {
  key: string;
  label: string;
  count: number;
  conv_pct: number | null;
  blocker: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const url = new URL(req.url);
    const daysParam = Number(url.searchParams.get("days") ?? "30");
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cnt = async (
      table: string,
      column: string,
      filter?: (q: any) => any,
    ): Promise<number> => {
      try {
        let q = sb.from(table).select("id", { count: "exact", head: true }).gte(column, sinceIso);
        if (filter) q = filter(q);
        const { count, error } = await q;
        if (error) {
          console.warn(`[audit] ${table} count error:`, error.message);
          return 0;
        }
        return count ?? 0;
      } catch (e) {
        console.warn(`[audit] ${table} threw:`, e);
        return 0;
      }
    };

    // Top-error helper: returns most common error_message-like value for a table.
    const topBlocker = async (
      table: string,
      col: string,
      timeCol: string,
      filter?: (q: any) => any,
    ): Promise<string | null> => {
      try {
        let q = sb.from(table).select(col).gte(timeCol, sinceIso).not(col, "is", null).limit(500);
        if (filter) q = filter(q);
        const { data } = await q;
        if (!data || data.length === 0) return null;
        const tally = new Map<string, number>();
        for (const row of data as any[]) {
          const v = String(row[col] ?? "").slice(0, 80);
          if (!v) continue;
          tally.set(v, (tally.get(v) ?? 0) + 1);
        }
        let best: [string, number] | null = null;
        for (const e of tally.entries()) if (!best || e[1] > best[1]) best = e;
        return best ? `${best[0]} (×${best[1]})` : null;
      } catch {
        return null;
      }
    };

    // Stage counts — every query is defensive: missing table = 0, never throws.
    const prospects = await cnt("contractor_prospects", "created_at");
    const smsDispatched = await cnt("outreach_sms_events", "created_at");
    const smsDelivered = await cnt("outreach_sms_events", "created_at", (q) =>
      q.in("status", ["delivered", "sent"]),
    );
    const emailDispatched = await cnt("outreach_email_events", "created_at");
    const emailDelivered = await cnt("outreach_email_events", "created_at", (q) =>
      q.in("status", ["delivered", "sent"]),
    );
    const clicks = await cnt("acquisition_events", "created_at", (q) =>
      q.eq("event_type", "click"),
    );
    const checkoutsCreated = await cnt("checkout_sessions", "created_at");
    const webhookEvents = await cnt("stripe_webhook_events", "received_at");
    const webhookProcessed = await cnt("stripe_webhook_events", "received_at", (q) =>
      q.eq("success", true),
    );
    const paidCheckouts = await cnt("stripe_webhook_events", "received_at", (q) =>
      q.eq("event_type", "checkout.session.completed").eq("success", true),
    );
    const activated = await cnt("contractors", "published_at", (q) =>
      q.eq("is_published", true).eq("is_discoverable", true),
    );

    // Blockers
    const smsBlocker = await topBlocker("outreach_sms_events", "error_reason", "created_at");
    const emailBlocker = await topBlocker("outreach_email_events", "error_reason", "created_at");
    const webhookBlocker = await topBlocker(
      "stripe_webhook_events",
      "error_message",
      "received_at",
      (q) => q.eq("success", false),
    );

    const stages: Stage[] = [
      { key: "prospects", label: "Prospects imported", count: prospects, conv_pct: null, blocker: null },
      {
        key: "sms_dispatched",
        label: "SMS dispatched",
        count: smsDispatched,
        conv_pct: prospects ? +(100 * smsDispatched / prospects).toFixed(1) : null,
        blocker: null,
      },
      {
        key: "sms_delivered",
        label: "SMS delivered (Twilio)",
        count: smsDelivered,
        conv_pct: smsDispatched ? +(100 * smsDelivered / smsDispatched).toFixed(1) : null,
        blocker: smsBlocker,
      },
      {
        key: "email_dispatched",
        label: "Email dispatched",
        count: emailDispatched,
        conv_pct: prospects ? +(100 * emailDispatched / prospects).toFixed(1) : null,
        blocker: null,
      },
      {
        key: "email_delivered",
        label: "Email delivered (Resend)",
        count: emailDelivered,
        conv_pct: emailDispatched ? +(100 * emailDelivered / emailDispatched).toFixed(1) : null,
        blocker: emailBlocker,
      },
      {
        key: "clicks",
        label: "Clicks (/r/{id})",
        count: clicks,
        conv_pct: (smsDelivered + emailDelivered) ? +(100 * clicks / (smsDelivered + emailDelivered)).toFixed(1) : null,
        blocker: null,
      },
      {
        key: "checkouts_created",
        label: "Stripe checkout created",
        count: checkoutsCreated,
        conv_pct: clicks ? +(100 * checkoutsCreated / clicks).toFixed(1) : null,
        blocker: null,
      },
      {
        key: "webhook_events",
        label: "Webhook events received",
        count: webhookEvents,
        conv_pct: checkoutsCreated ? +(100 * webhookEvents / checkoutsCreated).toFixed(1) : null,
        blocker: null,
      },
      {
        key: "webhook_processed",
        label: "Webhook processed",
        count: webhookProcessed,
        conv_pct: webhookEvents ? +(100 * webhookProcessed / webhookEvents).toFixed(1) : null,
        blocker: webhookBlocker,
      },
      {
        key: "payments_succeeded",
        label: "Payments succeeded",
        count: paidCheckouts,
        conv_pct: checkoutsCreated ? +(100 * paidCheckouts / checkoutsCreated).toFixed(1) : null,
        blocker: null,
      },
      {
        key: "activated",
        label: "Contractors visible (published + discoverable)",
        count: activated,
        conv_pct: paidCheckouts ? +(100 * activated / paidCheckouts).toFixed(1) : null,
        blocker: null,
      },
    ];

    // Bottleneck = first stage with conv < 30% (ignore null)
    const bottleneck = stages.find(
      (s) => s.conv_pct !== null && s.conv_pct < 30,
    );

    return new Response(
      JSON.stringify({
        window_days: days,
        since: sinceIso,
        stages,
        bottleneck: bottleneck ? bottleneck.key : null,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
