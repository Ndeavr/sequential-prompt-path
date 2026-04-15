import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Look up lead
    const { data: lead } = await supabase
      .from("contractor_leads")
      .select("id, company_name, city, category_primary, email, phone")
      .eq("id", token)
      .maybeSingle();

    if (!lead) {
      return new Response(JSON.stringify({
        context: { company_name: "Votre entreprise", city: "Votre ville", category: "Services résidentiels" },
        greeting: "Bonjour! Je suis Alex, votre conseiller UNPRO. Comment puis-je vous aider aujourd'hui?",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update status
    await supabase.from("contractor_leads")
      .update({ outreach_status: "engaged", updated_at: new Date().toISOString() })
      .eq("id", lead.id);

    // Build personalized context
    const context = {
      company_name: lead.company_name || "Votre entreprise",
      city: lead.city || "Votre ville",
      category: lead.category_primary || "Services résidentiels",
      email: lead.email,
      phone: lead.phone,
    };

    const greeting = `Bonjour${lead.company_name ? ` ${lead.company_name}` : ""}! J'ai analysé votre visibilité${lead.city ? ` à ${lead.city}` : ""} et j'ai identifié des opportunités de croissance. Voulez-vous en savoir plus?`;

    return new Response(JSON.stringify({ context, greeting, lead_id: lead.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
