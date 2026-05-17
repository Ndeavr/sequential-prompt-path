// Admin-gated SMS approval + send for a live acquisition run.
// Modes:
//   dry_run=true  -> sends SMS to the admin's own phone
//   dry_run=false -> sends to prospect phone (requires confirm_phone match)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isE164(p: string | null | undefined) {
  return !!p && /^\+\d{10,15}$/.test(p.replace(/\s/g, ""));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { run_id, dry_run = true, admin_phone, confirm_phone } = await req.json();
    if (!run_id) throw new Error("run_id required");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await sb.auth.getUser(token);
    if (!userData?.user) throw new Error("unauthorized");
    const { data: isAdmin } = await sb.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("forbidden_not_admin");

    // Load run
    const { data: run } = await sb
      .from("live_acquisition_runs")
      .select("*")
      .eq("id", run_id)
      .maybeSingle();
    if (!run) throw new Error("run_not_found");

    const md = (run.metadata || {}) as any;
    const smsBody: string = md.sms_body;
    const prospectPhone: string = md.sms_to;

    if (!smsBody) throw new Error("sms_body_missing — run orchestrator first");

    let targetPhone: string;
    if (dry_run) {
      if (!isE164(admin_phone)) throw new Error("admin_phone must be E.164 (+1XXXXXXXXXX)");
      targetPhone = admin_phone;
    } else {
      if (!isE164(prospectPhone)) throw new Error("prospect_phone_invalid");
      if (confirm_phone !== prospectPhone)
        throw new Error("confirm_phone_must_match_prospect_phone");
      targetPhone = prospectPhone;
    }

    // Send via Twilio (LOVABLE_API_KEY gateway). NEVER silently simulate.
    const twilioApiKey = Deno.env.get("TWILIO_API_KEY");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_FROM");
    const messagingSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!twilioApiKey || !lovableKey) throw new Error("twilio_not_configured: TWILIO_API_KEY or LOVABLE_API_KEY missing");
    if (!messagingSid && !twilioFrom) throw new Error("twilio_not_configured: set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER");

    const params: Record<string, string> = { To: targetPhone, Body: smsBody };
    if (messagingSid) params.MessagingServiceSid = messagingSid;
    else if (twilioFrom) params.From = twilioFrom;

    const resp = await fetch(`https://connector-gateway.lovable.dev/twilio/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioApiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });
    const sendResult: any = await resp.json();
    if (!resp.ok) throw new Error(`twilio_send_failed:${JSON.stringify(sendResult)}`);

    // Update step rows
    if (!dry_run) {
      await sb.from("acquisition_run_steps").upsert(
        [
          {
            run_id,
            step_key: "sms_approved",
            step_order: 5,
            status: "succeeded",
            logs: [{ at: new Date().toISOString(), by: userData.user.id }],
            completed_at: new Date().toISOString(),
          },
          {
            run_id,
            step_key: "sms_sent",
            step_order: 6,
            status: "succeeded",
            logs: [
              {
                at: new Date().toISOString(),
                to: targetPhone,
                sid: sendResult?.sid,
              },
            ],
            completed_at: new Date().toISOString(),
          },
        ],
        { onConflict: "run_id,step_key" }
      );
    } else {
      await sb.from("acquisition_run_steps").upsert(
        {
          run_id,
          step_key: "sms_drafted",
          step_order: 4,
          status: "succeeded",
          logs: [
            {
              at: new Date().toISOString(),
              dry_run_to: targetPhone,
              by: userData.user.id,
            },
          ],
          completed_at: new Date().toISOString(),
        },
        { onConflict: "run_id,step_key" }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dry_run,
        sent_to: targetPhone,
        sid: sendResult?.sid ?? null,
        simulated: !!sendResult?.simulated,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[approve-isr-sms]", e);
    return new Response(
      JSON.stringify({ error: String((e as any)?.message ?? e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
