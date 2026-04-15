import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, company_name, city, category, email, phone } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if lead already exists
    const { data: existing } = await supabase
      .from("contractor_leads")
      .select("id, lead_status")
      .eq("id", token)
      .maybeSingle();

    if (existing) {
      // Update to converted
      await supabase.from("contractor_leads")
        .update({
          lead_status: "converted",
          outreach_status: "booked",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return new Response(JSON.stringify({ success: true, lead_id: existing.id, action: "updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new lead
    const { data: newLead, error } = await supabase.from("contractor_leads").insert({
      company_name,
      city,
      category_primary: category,
      email,
      phone,
      source_type: "outbound_email",
      source_label: "email_to_booking",
      lead_status: "converted",
      outreach_status: "booked",
    }).select("id").single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, lead_id: newLead.id, action: "created" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
