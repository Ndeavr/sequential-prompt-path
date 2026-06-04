/**
 * outreach-quota-status
 * Returns the canonical quota snapshot used by the cockpit + send engine.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nextMidnightUtc(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toISOString().slice(0, 10);

  const { data: settings } = await sb.from("outreach_settings").select("*").eq("id", true).maybeSingle();
  const limits = {
    sms: settings?.sms_daily_limit ?? 50,
    email: settings?.email_daily_limit ?? 25,
    activation: settings?.activation_daily_limit ?? 5,
  };
  const founder = !!settings?.founder_override;

  const { data: rows } = await sb.from("activation_quotas")
    .select("channel, used_count, limit_count, last_used_at")
    .eq("scope", "global").eq("scope_key", "*").eq("period_date", today);

  const used = { sms: 0, email: 0, activation: 0 };
  let lastReset: string | null = null;
  for (const r of rows ?? []) {
    if (r.channel in used) (used as any)[r.channel] = r.used_count ?? 0;
    if (r.last_used_at && (!lastReset || r.last_used_at > lastReset)) lastReset = r.last_used_at;
  }

  const out = {
    sms_limit: limits.sms,
    sms_used: used.sms,
    sms_remaining: Math.max(0, limits.sms - used.sms),
    emails_limit: limits.email,
    emails_used: used.email,
    emails_remaining: Math.max(0, limits.email - used.email),
    activation_limit: limits.activation,
    activation_used: used.activation,
    activation_remaining: Math.max(0, limits.activation - used.activation),
    last_reset_at: lastReset ?? `${today}T00:00:00.000Z`,
    next_reset_at: nextMidnightUtc(),
    founder_override: founder,
  };

  return new Response(JSON.stringify(out), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
