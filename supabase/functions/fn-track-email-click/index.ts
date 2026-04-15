import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, source_email_id, user_agent } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up lead by token (use lead_id or metadata)
    const { data: lead } = await supabase
      .from("contractor_leads")
      .select("id, company_name, city, category_primary, email")
      .eq("id", token)
      .maybeSingle();

    // Log click
    await supabase.from("outbound_clicks").insert({
      company_id: lead?.id || null,
      token,
      source_email_id,
      user_agent,
    });

    // Update lead status if found
    if (lead) {
      await supabase
        .from("contractor_leads")
        .update({ outreach_status: "clicked", updated_at: new Date().toISOString() })
        .eq("id", lead.id);
    }

    return new Response(JSON.stringify({
      success: true,
      lead: lead ? {
        id: lead.id,
        company_name: lead.company_name,
        city: lead.city,
        category: lead.category_primary,
      } : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
