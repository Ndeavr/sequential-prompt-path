// UNPRO — Acquisition health check
// Returns provider credentials presence + last webhook event timestamps + actionable status.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Status = "ok" | "stale" | "missing" | "unconfigured";

interface ProviderHealth {
  provider: string;
  credentials_present: boolean;
  webhook_last_event_at: string | null;
  recent_send_count: number;
  recent_webhook_count: number;
  status: Status;
  message: string;
  setup_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const projectRef = (Deno.env.get("SUPABASE_URL") || "").match(/https?:\/\/([^.]+)/)?.[1] || "";
  const fnBase = `https://${projectRef}.functions.supabase.co`;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  async function providerHealth(opts: {
    provider: "twilio" | "resend" | "stripe";
    credEnvVars: string[];
    sendChannel: "sms" | "email" | "stripe";
    webhookEvents: string[];
    setupHint: string;
    setupUrl: string;
  }): Promise<ProviderHealth> {
    const creds = opts.credEnvVars.every((v) => !!Deno.env.get(v));

    const { count: sendCount } = await supa
      .from("acquisition_events")
      .select("id", { count: "exact", head: true })
      .eq("provider", opts.provider)
      .eq("event_type", "sent")
      .gte("occurred_at", since);

    const { data: lastWebhook } = await supa
      .from("acquisition_events")
      .select("occurred_at")
      .eq("provider", opts.provider)
      .in("event_type", opts.webhookEvents)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: webhookCount } = await supa
      .from("acquisition_events")
      .select("id", { count: "exact", head: true })
      .eq("provider", opts.provider)
      .in("event_type", opts.webhookEvents)
      .gte("occurred_at", since);

    let status: Status = "ok";
    let message = "Receiving webhook events.";
    if (!creds) {
      status = "unconfigured";
      message = `Missing credentials: ${opts.credEnvVars.join(", ")}.`;
    } else if ((sendCount ?? 0) > 0 && (webhookCount ?? 0) === 0) {
      status = "missing";
      message = `${sendCount} send events but zero webhook events. ${opts.setupHint}`;
    } else if ((sendCount ?? 0) > 0 && lastWebhook?.occurred_at) {
      const ageH = (Date.now() - new Date(lastWebhook.occurred_at).getTime()) / 3_600_000;
      if (ageH > 48) {
        status = "stale";
        message = `Last webhook ${Math.round(ageH)}h ago while sends continue.`;
      }
    } else if ((sendCount ?? 0) === 0) {
      message = "No recent sends.";
    }

    return {
      provider: opts.provider,
      credentials_present: creds,
      webhook_last_event_at: lastWebhook?.occurred_at ?? null,
      recent_send_count: sendCount ?? 0,
      recent_webhook_count: webhookCount ?? 0,
      status,
      message,
      setup_url: opts.setupUrl,
    };
  }

  const [twilio, resend, stripe] = await Promise.all([
    providerHealth({
      provider: "twilio",
      credEnvVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
      sendChannel: "sms",
      webhookEvents: ["delivered", "failed"],
      setupHint: `Configure SMS status callback URL = ${fnBase}/twilio-status-events`,
      setupUrl: `${fnBase}/twilio-status-events`,
    }),
    providerHealth({
      provider: "resend",
      credEnvVars: ["RESEND_API_KEY"],
      sendChannel: "email",
      webhookEvents: ["delivered", "opened", "clicked", "bounced", "failed"],
      setupHint: `Add Resend webhook → ${fnBase}/resend-events`,
      setupUrl: `${fnBase}/resend-events`,
    }),
    providerHealth({
      provider: "stripe",
      credEnvVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      sendChannel: "stripe",
      webhookEvents: ["paid"],
      setupHint: `Verify Stripe webhook secret + endpoint reachable.`,
      setupUrl: `${fnBase}/launch-stripe-webhook`,
    }),
  ]);

  // Redirect tracker
  const { data: lastClick } = await supa
    .from("acquisition_events")
    .select("occurred_at")
    .eq("event_type", "clicked")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { count: linksCount } = await supa
    .from("acquisition_tracking_links")
    .select("id", { count: "exact", head: true });

  const redirect_tracker = {
    provider: "redirect",
    links_created: linksCount ?? 0,
    last_click_at: lastClick?.occurred_at ?? null,
    status: ((lastClick?.occurred_at ? "ok" : (linksCount ?? 0) > 0 ? "stale" : "unconfigured") as Status),
    message: lastClick?.occurred_at
      ? `Last click ${lastClick.occurred_at}.`
      : (linksCount ?? 0) > 0
        ? "Tracking links created but no clicks recorded yet."
        : `No tracking links yet. All outreach must use ${fnBase}/r-redirect/{id}.`,
    setup_url: `${fnBase}/r-redirect`,
  };

  return new Response(
    JSON.stringify({ twilio, resend, stripe, redirect_tracker, generated_at: new Date().toISOString() }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});
