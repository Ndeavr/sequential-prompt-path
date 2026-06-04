/**
 * check-outreach-secrets — reports which outreach provider secrets are present.
 * Public read-only (no secret values returned).
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const has = (k: string) => !!Deno.env.get(k);
  const out = {
    twilio_account_sid: has("TWILIO_ACCOUNT_SID"),
    twilio_auth_token: has("TWILIO_AUTH_TOKEN"),
    twilio_messaging_service_sid: has("TWILIO_MESSAGING_SERVICE_SID"),
    twilio_phone_number: has("TWILIO_PHONE_NUMBER"),
    resend_api_key: has("RESEND_API_KEY"),
    lovable_api_key: has("LOVABLE_API_KEY"),
    sms_ready: has("TWILIO_ACCOUNT_SID") && has("TWILIO_AUTH_TOKEN") && (has("TWILIO_MESSAGING_SERVICE_SID") || has("TWILIO_PHONE_NUMBER")),
    email_ready: has("LOVABLE_API_KEY") && has("RESEND_API_KEY"),
  };
  return new Response(JSON.stringify(out), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
  });
});
