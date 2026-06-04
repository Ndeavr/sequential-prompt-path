/**
 * reset-outreach-quotas — daily cron (00:00 UTC).
 * Inserts today's empty quota rows so the cockpit shows fresh limits even before
 * the first send attempt, and zeroes any stale rows.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toISOString().slice(0, 10);

  const { data: settings } = await sb.from("outreach_settings").select("*").eq("id", true).maybeSingle();
  const channels = [
    { channel: "sms", limit_count: settings?.sms_daily_limit ?? 50 },
    { channel: "email", limit_count: settings?.email_daily_limit ?? 25 },
    { channel: "activation", limit_count: settings?.activation_daily_limit ?? 5 },
  ];

  for (const c of channels) {
    const { data: existing } = await sb.from("activation_quotas")
      .select("id").eq("scope", "global").eq("scope_key", "*").eq("channel", c.channel).eq("period_date", today).maybeSingle();
    if (existing) {
      await sb.from("activation_quotas").update({ used_count: 0, limit_count: c.limit_count, last_used_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await sb.from("activation_quotas").insert({
        scope: "global", scope_key: "*", channel: c.channel, period_date: today,
        limit_count: c.limit_count, used_count: 0, last_used_at: new Date().toISOString(),
      });
    }
  }
  return new Response(JSON.stringify({ ok: true, reset_at: new Date().toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
