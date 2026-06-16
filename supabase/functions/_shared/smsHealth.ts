// PROTECTED — Shared SMS infrastructure health helpers for autonomous agents.
// Every agent that sends SMS MUST call assertSmsHealthy() before dispatching.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type SmsHealth = {
  status: "HEALTHY" | "WARNING" | "ERROR";
  last_callback_at: string | null;
  last_test_success_at: string | null;
  delivery_rate_24h: number | null;
};

export async function getSmsHealth(): Promise<SmsHealth> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase
    .from("v_sms_infrastructure_status")
    .select("*")
    .maybeSingle();
  if (error || !data) {
    return { status: "ERROR", last_callback_at: null, last_test_success_at: null, delivery_rate_24h: null };
  }
  return data as SmsHealth;
}

export async function assertSmsHealthy(): Promise<{ ok: true } | { ok: false; reason: string; health: SmsHealth }> {
  const health = await getSmsHealth();
  if (health.status === "HEALTHY") return { ok: true };
  return {
    ok: false,
    reason: "Outbound bloqué. Aucun test SMS valide dans les dernières 24 heures.",
    health,
  };
}
