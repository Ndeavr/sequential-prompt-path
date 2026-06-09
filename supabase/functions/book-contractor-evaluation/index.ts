// UNPRO — book-contractor-evaluation
// Creates an evaluation request from the public contractor profile page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      contractor_slug,
      contact_name,
      email,
      phone,
      preferred_slot,
      message,
      source = "public_profile",
    } = body ?? {};

    if (!contractor_slug || !contact_name || !email) {
      return new Response(
        JSON.stringify({ error: "missing_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email))) {
      return new Response(
        JSON.stringify({ error: "invalid_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("contractor_evaluation_requests")
      .insert({
        contractor_slug: String(contractor_slug).slice(0, 120),
        contact_name: String(contact_name).slice(0, 160),
        email: String(email).toLowerCase().slice(0, 200),
        phone: phone ? String(phone).slice(0, 40) : null,
        preferred_slot: preferred_slot ? String(preferred_slot).slice(0, 120) : null,
        message: message ? String(message).slice(0, 2000) : null,
        source: String(source).slice(0, 60),
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fire-and-forget system event log (best effort).
    await supabase.from("system_events").insert({
      event_type: "contractor_evaluation_requested",
      payload: { contractor_slug, request_id: data?.id, email },
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
