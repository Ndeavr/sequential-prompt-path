// UNPRO — Email Fallback Dispatch
// Sends the contractor-fallback-analysis email when SMS isn't viable
// (non-mobile phone, or after 2 Twilio failures). Idempotent per lead.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { lead_id, reason } = await req.json().catch(() => ({}));
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "missing_lead_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: lead, error } = await sb
      .from("contractor_leads")
      .select("id, company_name, city, email, email_fallback_enabled, email_status, curiosity_slug, do_not_contact")
      .eq("id", lead_id)
      .maybeSingle();

    if (error || !lead) {
      return new Response(JSON.stringify({ error: "lead_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const l = lead as any;
    if (l.do_not_contact) {
      return new Response(JSON.stringify({ skipped: "do_not_contact" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (l.email_fallback_enabled === false) {
      return new Response(JSON.stringify({ skipped: "fallback_disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = (l.email ?? "").trim();
    if (!email || !/@/.test(email)) {
      return new Response(JSON.stringify({ skipped: "no_email" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Idempotent: already sent
    if (l.email_status === "sent") {
      return new Response(JSON.stringify({ skipped: "already_sent" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const private_score_url = l.curiosity_slug
      ? `${PUBLIC_APP_URL}/analyse/${l.curiosity_slug}`
      : `${PUBLIC_APP_URL}/aipp/${l.id}`;

    const { error: invokeError } = await sb.functions.invoke("send-transactional-email", {
      body: {
        templateName: "contractor-fallback-analysis",
        recipientEmail: email,
        idempotencyKey: `fallback-${lead_id}`,
        templateData: {
          company_name: l.company_name ?? "",
          city: l.city ?? "",
          private_score_url,
        },
      },
    });

    if (invokeError) {
      console.error("email-fallback-dispatch invoke failed", invokeError.message);
      return new Response(JSON.stringify({ error: invokeError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("contractor_leads").update({
      email_status: "sent",
      contact_method: "email",
      last_email_at: new Date().toISOString(),
    }).eq("id", lead_id);

    return new Response(JSON.stringify({ ok: true, reason: reason ?? "fallback" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("email-fallback-dispatch error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
