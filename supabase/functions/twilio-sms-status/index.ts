// twilio-sms-status — receives Twilio delivery status webhooks
// Closes the delivery attribution gap: clicked=1 > delivered=0 was impossible because this endpoint didn't exist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Twilio posts application/x-www-form-urlencoded
    const contentType = req.headers.get("content-type") ?? "";
    let params: Record<string, string> = {};
    if (contentType.includes("application/json")) {
      params = await req.json();
    } else {
      const text = await req.text();
      params = Object.fromEntries(new URLSearchParams(text));
    }

    const messageSid = params.MessageSid ?? params.SmsSid;
    const messageStatus = params.MessageStatus ?? params.SmsStatus; // sent | delivered | failed | undelivered
    const errorCode = params.ErrorCode ?? null;
    const errorMessage = params.ErrorMessage ?? null;

    if (!messageSid || !messageStatus) {
      return new Response(JSON.stringify({ error: "missing_message_sid_or_status" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Match on provider_response.sid in existing logs
    const { data: logs } = await supabase
      .from("contractor_outreach_logs")
      .select("id, provider_response, status")
      .eq("channel", "sms")
      .order("sent_at", { ascending: false })
      .limit(500);

    const match = ((logs as Array<{ id: string; provider_response: Record<string, unknown> | null; status: string }> | null) ?? [])
      .find(l => {
        const pr = l.provider_response ?? {};
        return (pr as { sid?: string; MessageSid?: string }).sid === messageSid
            || (pr as { sid?: string; MessageSid?: string }).MessageSid === messageSid;
      });

    if (!match) {
      console.warn("[twilio-sms-status] no log matched sid=", messageSid);
      return new Response(JSON.stringify({ ok: true, matched: false, sid: messageSid, status: messageStatus }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextStatus =
      messageStatus === "delivered" ? "delivered"
      : messageStatus === "failed" || messageStatus === "undelivered" ? "failed"
      : match.status;

    await supabase
      .from("contractor_outreach_logs")
      .update({
        status: nextStatus,
        error_code: errorCode,
        error_message: errorMessage,
        provider_response: {
          ...(match.provider_response ?? {}),
          MessageStatus: messageStatus,
          delivered_at: messageStatus === "delivered" ? new Date().toISOString() : undefined,
        },
      })
      .eq("id", match.id);

    return new Response(JSON.stringify({ ok: true, matched: true, new_status: nextStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[twilio-sms-status]", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
