import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { token } = await req.json();
    if (!token) throw new Error("token required");

    const { data: request, error } = await supabase
      .from("review_requests")
      .select("id, homeowner_name, project_type, city, contractor_id, expires_at, status")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!request) throw new Error("not_found");
    if (new Date(request.expires_at) < new Date()) throw new Error("expired");

    const { data: contractor } = await supabase
      .from("contractors")
      .select("id, business_name, logo_url, google_place_id")
      .eq("id", request.contractor_id)
      .maybeSingle();

    // Mark opened
    if (request.status === "sent") {
      await supabase
        .from("review_requests")
        .update({ status: "opened", opened_at: new Date().toISOString() })
        .eq("id", request.id);
    }

    return new Response(
      JSON.stringify({
        id: request.id,
        homeowner_name: request.homeowner_name,
        project_type: request.project_type,
        city: request.city,
        contractor: contractor ?? { id: request.contractor_id, business_name: "Entrepreneur", logo_url: null },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
