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
  const credentialsPresent = !!(
    (Deno.env.get("TWILIO_ACCOUNT_SID") && Deno.env.get("TWILIO_AUTH_TOKEN")) ||
    (Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("TWILIO_API_KEY"))
  );
  if (!credentialsPresent) {
    return {
      ok: false,
      reason: "Identifiants SMS absents.",
      health: { status: "ERROR", last_callback_at: null, last_test_success_at: null, delivery_rate_24h: null },
    };
  }
  const health = await getSmsHealth();
  // Idle system: no recent send / stale callback is a WARNING, never a hard
  // block — otherwise an idle system could never become healthy again.
  // Hard block only on a real provider/credential failure (ERROR).
  if (health.status === "HEALTHY" || health.status === "WARNING") return { ok: true };
  return {
    ok: false,
    reason: "Échec réel du fournisseur SMS. Envoi bloqué.",
    health,
  };
}
