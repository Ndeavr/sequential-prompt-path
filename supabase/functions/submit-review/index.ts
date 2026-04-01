import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.99.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { contractor_id, content, rating, service_type } = body;

    if (!contractor_id || !content || !rating) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: "Rating must be 1-5" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has a booking with this contractor
    const { data: booking } = await supabase
      .from("bookings")
      .select("id")
      .eq("user_id", user.id)
      .eq("contractor_id", contractor_id)
      .limit(1)
      .maybeSingle();

    const proofType = booking ? "booking" : "none";
    const verificationStatus = booking ? "verified" : "pending";

    const { data: review, error: insertError } = await supabase
      .from("reviews")
      .insert({
        contractor_id,
        user_id: user.id,
        content,
        rating,
        service_type,
        verification_status: verificationStatus,
        proof_type: proofType,
        verified_at: booking ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ review, verification_status: verificationStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
