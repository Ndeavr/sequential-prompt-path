// UNPRO Stripe reconciliation — replays missed events since 2026-07-08 03:44:57Z.
// POST { dry_run: boolean, since?: string }
// Requires admin JWT.

import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { UNPRO_SUPPORTED_EVENTS, checkUnproMetadata } from "../_shared/unproStripe.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_SINCE_ISO = "2026-07-08T03:44:57Z";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeKey = Deno.env.get("UNPRO_STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey) return json({ error: "missing_stripe_secret" }, 500);

  // Auth: require admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims } = await (authClient.auth as any).getClaims(token);
  if (!claims?.claims?.sub) return json({ error: "unauthorized" }, 401);

  const sb = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  const { dry_run = true, since = DEFAULT_SINCE_ISO } = await req.json().catch(() => ({}));
  const sinceUnix = Math.floor(new Date(since).getTime() / 1000);

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const report = {
    dry_run: !!dry_run,
    since,
    scanned: 0,
    already_processed: 0,
    would_process: 0,
    replayed: 0,
    quarantined: 0,
    failed: 0,
    missing_locally: [] as string[],
    errors: [] as { event_id: string; error: string }[],
  };

  let hasMore = true;
  let startingAfter: string | undefined;
  const supported = Array.from(UNPRO_SUPPORTED_EVENTS);

  while (hasMore) {
    const page = await stripe.events.list({
      created: { gte: sinceUnix },
      limit: 100,
      starting_after: startingAfter,
    } as any);

    for (const evt of page.data) {
      if (!supported.includes(evt.type)) continue;
      if (!evt.livemode) continue;
      report.scanned += 1;

      // Check local status
      const { data: existing } = await sb
        .from("unpro_stripe_webhook_events")
        .select("processing_status")
        .eq("stripe_event_id", evt.id)
        .maybeSingle();

      if (existing?.processing_status === "processed") {
        report.already_processed += 1;
        continue;
      }

      // Metadata guard for checkout/subscription — quarantine ISR.
      const obj: any = (evt as any).data?.object;
      const md: Record<string, string> = obj?.metadata || {};
      const mdCheck = checkUnproMetadata(md);
      if (!mdCheck.ok && (evt.type.startsWith("checkout") || evt.type.startsWith("customer.subscription"))) {
        report.quarantined += 1;
        if (!dry_run) {
          await sb.from("unpro_stripe_webhook_events").upsert({
            stripe_event_id: evt.id,
            stripe_account_id: (evt as any).account ?? null,
            livemode: true,
            event_type: evt.type,
            object_id: obj?.id ?? null,
            processing_status: "ignored",
            attempt_count: 1,
            processed_at: new Date().toISOString(),
            payload: evt as any,
            error_code: mdCheck.reason,
          }, { onConflict: "stripe_event_id" });
        }
        report.missing_locally.push(evt.id);
        continue;
      }

      report.would_process += 1;

      if (dry_run) {
        report.missing_locally.push(evt.id);
        continue;
      }

      // Replay by inserting a "received" row — the Stripe dashboard resend is the
      // supported path for replay because signature is required for the runtime
      // webhook. Here we mark it as reconciled with a synthetic record.
      try {
        await sb.from("unpro_stripe_webhook_events").upsert({
          stripe_event_id: evt.id,
          stripe_account_id: (evt as any).account ?? null,
          livemode: true,
          event_type: evt.type,
          object_id: obj?.id ?? null,
          processing_status: "retry_pending",
          attempt_count: 1,
          received_at: new Date().toISOString(),
          payload: evt as any,
          error_code: "manual_reconciliation_pending",
          error_message: "Resend event from Stripe dashboard to complete reconciliation.",
        }, { onConflict: "stripe_event_id" });
        report.replayed += 1;
      } catch (e: any) {
        report.failed += 1;
        report.errors.push({ event_id: evt.id, error: e?.message || String(e) });
      }
    }

    hasMore = page.has_more;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return json({ ok: true, report });
});
