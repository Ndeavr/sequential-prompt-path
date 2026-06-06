/**
 * launch-readiness — returns boolean presence (NEVER values) of every secret
 * the Launch War Room depends on so the operator knows what's wired before
 * pressing Start. Anon-callable (admin route already gates UI access).
 */
import { corsHeaders } from "../_shared/launch.ts";

const KEYS = [
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_SERVICE_SID",
  "GOOGLE_PLACES_API_KEY",
  "STRIPE_SECRET_KEY",
  "LOVABLE_API_KEY",
] as const;

const CRITICAL = ["GEMINI_API_KEY", "RESEND_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "GOOGLE_PLACES_API_KEY", "STRIPE_SECRET_KEY"];

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const status: Record<string, boolean> = {};
  for (const k of KEYS) status[k] = !!Deno.env.get(k);
  const missingCritical = CRITICAL.filter(k => !status[k]);
  return new Response(
    JSON.stringify({ status, missingCritical, ready: missingCritical.length === 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
