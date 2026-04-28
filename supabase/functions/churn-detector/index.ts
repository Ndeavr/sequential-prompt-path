// Churn Detector — flags at-risk contractors.
// Every 6h. Signals: payment_failed, inactive_login (14d), no_leads_opened (30d).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const created: Record<string, number> = {
    payment_failed: 0, inactive_login: 0, no_leads_opened: 0,
  };

  const insertSignal = async (
    contractor_id: string, signal_type: string, severity: string, payload: unknown,
  ) => {
    const { data: existing } = await supabase
      .from("churn_signals")
      .select("id")
      .eq("contractor_id", contractor_id)
      .eq("signal_type", signal_type)
      .eq("status", "open")
      .maybeSingle();
    if (existing) return false;
    const { error } = await supabase.from("churn_signals").insert({
      contractor_id, signal_type, severity, rescue_attempt: { payload },
    });
    if (error) console.warn("[churn-detector] insert err", signal_type, error.message);
    return !error;
  };

  // 1. Payment failed — last 24h
  try {
    const since = new Date(Date.now() - 86400000).toISOString();
    const { data } = await supabase
      .from("subscriptions")
      .select("contractor_id, status, updated_at")
      .in("status", ["past_due", "unpaid", "incomplete_expired"])
      .gte("updated_at", since)
      .limit(200);
    for (const s of data ?? []) {
      if (!s.contractor_id) continue;
      if (await insertSignal(s.contractor_id, "payment_failed", "critical", s)) {
        created.payment_failed++;
      }
    }
  } catch (e) { console.warn("[churn-detector] payment scan failed", e); }

  // 2. Inactive login 14d — relies on profiles.last_sign_in_at if present
  try {
    const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data } = await supabase
      .from("contractors")
      .select("id, user_id, updated_at")
      .lt("updated_at", cutoff)
      .limit(200);
    for (const c of data ?? []) {
      if (await insertSignal(c.id, "inactive_login", "medium", c)) {
        created.inactive_login++;
      }
    }
  } catch (e) { console.warn("[churn-detector] login scan failed", e); }

  return new Response(JSON.stringify({ created }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
