import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, company_name, city, category, scheduled_at } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find or create lead
    let leadId: string | null = null;
    const { data: existingLead } = await supabase
      .from("contractor_leads")
      .select("id")
      .eq("id", token)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
      await supabase.from("contractor_leads")
        .update({ outreach_status: "booked", lead_status: "qualified", updated_at: new Date().toISOString() })
        .eq("id", leadId);
    }

    // Create booking session
    const { data: session, error } = await supabase.from("booking_sessions").insert({
      company_id: leadId,
      lead_id: leadId,
      company_name,
      city,
      category,
      scheduled_at: scheduled_at || null,
      status: scheduled_at ? "confirmed" : "pending",
      token,
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, session }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
