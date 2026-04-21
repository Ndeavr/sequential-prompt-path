import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { businessName, websiteUrl, phone, city, rbqNumber, email, sourceCampaign, outreachTargetId } = body;

    if (!businessName) {
      return new Response(JSON.stringify({ error: "businessName required" }), { status: 400, headers: corsHeaders });
    }

    // Create or find contractor
    let contractorId: string | null = null;
    const { data: existing } = await supabase
      .from("contractors")
      .select("id")
      .eq("business_name", businessName)
      .maybeSingle();

    if (existing) {
      contractorId = existing.id;
    } else {
      const { data: newC } = await supabase.from("contractors").insert({
        business_name: businessName,
        website_url: websiteUrl || null,
        phone: phone || null,
        city: city || null,
        rbq_number: rbqNumber || null,
        email: email || null,
      }).select("id").single();
      contractorId = newC?.id || null;
    }

    // Create intake session
    const sessionToken = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const { data: session } = await supabase.from("audit_intake_sessions").insert({
      contractor_id: contractorId,
      session_token: sessionToken,
      source_campaign: sourceCampaign || null,
      business_name: businessName,
      phone: phone || null,
      website_url: websiteUrl || null,
      city: city || null,
      rbq_number: rbqNumber || null,
      email: email || null,
      funnel_status: "running",
      outreach_target_id: outreachTargetId || null,
    }).select("id").single();

    // Launch audit
    let auditId: string | null = null;
    if (contractorId) {
      const auditUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/aipp-run-audit`;
      const auditRes = await fetch(auditUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ contractor_id: contractorId }),
      });
      const auditData = await auditRes.json();
      auditId = auditData?.audit_id || null;

      if (auditId && session?.id) {
        await supabase.from("audit_intake_sessions").update({ audit_id: auditId }).eq("id", session.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sessionId: session?.id,
      sessionToken,
      contractorId,
      auditId,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 500, headers: corsHeaders });
  }
});
