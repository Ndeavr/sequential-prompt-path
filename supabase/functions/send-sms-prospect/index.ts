/**
 * UNPRO — Send SMS to Prospect via Twilio Messaging Service
 * Quebec French tone · 7-day cooldown · opt-out STOP · logging
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const MESSAGING_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ACCOUNT_SID || !AUTH_TOKEN || !MESSAGING_SID) {
      return json({ error: "Twilio credentials not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { prospect_id, phone, first_name, company_name, template } = await req.json();

    if (!phone || !/^\+1\d{10}$/.test(phone)) {
      return json({ error: "Phone invalide (format E.164 +1XXXXXXXXXX)" }, 400);
    }

    // ── Check opt-out ──
    if (prospect_id) {
      const { data: prospect } = await supabase
        .from("contractors_prospects")
        .select("sms_opted_out, sms_sent_at, sms_attempt_count")
        .eq("id", prospect_id)
        .maybeSingle();

      if (prospect?.sms_opted_out) {
        return json({ error: "Prospect opted out (STOP)", skipped: true }, 200);
      }

      // ── 7-day cooldown ──
      if (prospect?.sms_sent_at) {
        const lastSent = new Date(prospect.sms_sent_at).getTime();
        if (Date.now() - lastSent < SEVEN_DAYS_MS) {
          const daysLeft = Math.ceil((SEVEN_DAYS_MS - (Date.now() - lastSent)) / (24 * 60 * 60 * 1000));
          return json({ error: `Cooldown actif. Prochain envoi dans ${daysLeft} jour(s).`, skipped: true }, 200);
        }
      }
    }

    // ── Build message ──
    const name = first_name || company_name || "entrepreneur";
    const biz = company_name || "";

    const messages: Record<string, string> = {
      intro: `Bonjour ${name} 👋\n\nC'est Alex d'UNPRO. On aide les entreprises comme ${biz} à recevoir des rendez-vous qualifiés avec des propriétaires dans votre secteur.\n\nOn a quelques clients qui cherchent vos services en ce moment.\n\nÇa vous intéresse d'en savoir plus?\n\nAlex d'UNPRO\nunpro.ca`,
      followup: `Bonjour ${name},\n\nJuste un petit suivi — on a toujours des propriétaires qui cherchent vos services dans votre secteur.\n\nRépondez OUI si vous voulez qu'on en discute.\n\nAlex d'UNPRO`,
      value: `${name}, saviez-vous que les entrepreneurs UNPRO reçoivent en moyenne 12 rendez-vous qualifiés par mois?\n\nOn a de la demande dans votre zone.\n\nunpro.ca\n\nAlex d'UNPRO`,
    };

    const body = messages[template || "intro"] || messages.intro;

    // ── Send via Twilio ──
    const twilioAuth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          MessagingServiceSid: MESSAGING_SID,
          Body: body,
        }),
      }
    );

    const twilioData = await res.json();

    if (!res.ok) {
      console.error("Twilio SMS error:", JSON.stringify(twilioData));

      // Update prospect status
      if (prospect_id) {
        await supabase
          .from("contractors_prospects")
          .update({
            sms_status: "failed",
            sms_queue_status: "failed",
          } as any)
          .eq("id", prospect_id);
      }

      return json({ error: twilioData.message || "SMS send failed", twilio_code: twilioData.code }, 500);
    }

    // ── Update prospect record ──
    if (prospect_id) {
      await supabase
        .from("contractors_prospects")
        .update({
          sms_sent_at: new Date().toISOString(),
          sms_message_sid: twilioData.sid,
          sms_status: "sent",
          sms_queue_status: "sent",
          sms_attempt_count: (await supabase
            .from("contractors_prospects")
            .select("sms_attempt_count")
            .eq("id", prospect_id)
            .maybeSingle()
            .then(r => (r.data as any)?.sms_attempt_count || 0)) + 1,
        } as any)
        .eq("id", prospect_id);
    }

    return json({
      success: true,
      message_sid: twilioData.sid,
      status: twilioData.status,
    });
  } catch (err) {
    console.error("send-sms-prospect error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
