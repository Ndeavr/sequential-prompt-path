// Send a test personalized email from a run to a recipient (admin preview)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) throw new Error("Auth required");
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin role required");

    const { run_id, recipient_email } = await req.json();
    const to = (recipient_email ?? userData.user.email ?? "").trim();
    if (!run_id) throw new Error("run_id required");
    if (!to) throw new Error("recipient_email required");

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Pick the first personalized prospect of the run
    const { data: companies } = await admin
      .from("outbound_companies")
      .select("id, company_name, city, trade")
      .eq("autopilot_run_id", run_id)
      .limit(20);
    if (!companies?.length) throw new Error("No prospects found for this run");

    const ids = companies.map((c: any) => c.id);
    const { data: leads } = await admin
      .from("outbound_leads")
      .select("id, company_id")
      .in("company_id", ids);
    const leadIds = (leads ?? []).map((l: any) => l.id);
    if (!leadIds.length) throw new Error("No leads for this run");

    const { data: perso } = await admin
      .from("outbound_ai_personalizations")
      .select("lead_id, generated_output, created_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!perso) throw new Error("No personalization generated yet for this run");

    let subject = "Test UNPRO";
    let body = "Test personalized email";
    try {
      const parsed = typeof perso.generated_output === "string"
        ? JSON.parse(perso.generated_output)
        : perso.generated_output;
      subject = parsed.subject ?? subject;
      body = parsed.body ?? body;
    } catch {
      body = String(perso.generated_output ?? body);
    }

    const company = companies.find((c: any) =>
      leads?.find((l: any) => l.id === perso.lead_id && l.company_id === c.id)
    );
    const prefix = `[TEST · ${company?.company_name ?? "—"} · ${company?.city ?? ""}] `;

    // Send via send-transactional-email
    const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        to,
        subject: prefix + subject,
        html: `<div style="font-family:system-ui">${body.replace(/\n/g, "<br/>")}<hr/><p style="color:#888;font-size:12px">Test envoyé depuis Autopilot run ${run_id.slice(0, 8)}</p></div>`,
        purpose: "transactional",
        idempotency_key: `outbound-test-${run_id}-${Date.now()}`,
      }),
    });
    const sendResult = await sendRes.json().catch(() => ({}));

    await admin.from("outbound_run_logs").insert({
      run_id,
      step: "test_send",
      status: sendRes.ok ? "sent" : "failed",
      message: sendRes.ok ? `Test envoyé à ${to}` : `Échec test → ${to}`,
      payload: { recipient: to, response: sendResult, actor: userData.user.id },
    });

    if (!sendRes.ok) throw new Error(sendResult.error ?? "Send failed");

    return new Response(JSON.stringify({ ok: true, sent_to: to, preview: { subject: prefix + subject, body } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-outbound-test error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
