// LIVE Agent — Send approved outreach via Resend (only if approved_by_admin=true)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { draft_id } = await req.json();
    if (!draft_id) throw new Error("draft_id required");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { data: draft, error } = await supabase.from("live_outreach_drafts")
      .select("*, contractor_prospects(*)")
      .eq("id", draft_id).single();
    if (error || !draft) throw new Error("draft not found");
    if (!draft.approved_by_admin) throw new Error("draft not approved by admin");
    if (draft.sent_at) throw new Error("already sent");

    const prospect: any = draft.contractor_prospects;
    if (!prospect?.email) throw new Error("prospect has no email");
    if (prospect.do_not_contact) throw new Error("prospect is do_not_contact");

    const { data: settings } = await supabase.from("live_agent_settings").select("*").limit(1).single();

    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${settings?.outreach_from_name || "Alex — UNPRO"} <${settings?.outreach_from_email || "alex@unpro.ca"}>`,
        to: [prospect.email],
        subject: draft.subject,
        html: draft.body,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      await supabase.from("live_outreach_drafts").update({
        draft_status: "failed", error_message: JSON.stringify(data).slice(0, 500),
      }).eq("id", draft_id);
      throw new Error(`Resend: ${resp.status} ${JSON.stringify(data).slice(0, 200)}`);
    }

    await supabase.from("live_outreach_drafts").update({
      draft_status: "sent", sent_at: new Date().toISOString(), resend_message_id: data.id,
    }).eq("id", draft_id);

    await supabase.from("contractor_prospects").update({
      outreach_status: "sent",
    }).eq("id", prospect.id);

    return new Response(JSON.stringify({ success: true, message_id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
