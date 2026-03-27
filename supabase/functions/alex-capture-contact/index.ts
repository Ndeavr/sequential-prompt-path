import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_token, first_name, phone, email } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get session
    const { data: session } = await supabase
      .from("alex_sessions")
      .select("id, no_result_state")
      .eq("session_token", session_token)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert booking draft with contact
    const { data: draft } = await supabase
      .from("alex_booking_drafts")
      .upsert({
        session_id: session_token,
        contact_first_name: first_name,
        contact_phone: phone,
        contact_email: email || null,
        booking_status: "contact_captured",
      }, { onConflict: "session_id" })
      .select("id, booking_status")
      .single();

    // If no result state, create waitlist entry
    if (session.no_result_state) {
      await supabase.from("alex_waitlist_queue").insert({
        session_id: session_token,
        first_name,
        phone,
        email: email || null,
        project_type: null,
        city: null,
        status: "pending",
      });
    }

    // Log action
    await supabase.from("alex_actions").insert({
      session_id: session_token,
      action_type: "capture_contact",
      action_status: "completed",
      trigger_source: "edge_function",
    });

    // Log momentum
    await supabase.from("alex_momentum_events").insert({
      session_id: session_token,
      event_type: "contact_captured",
      momentum_score: 85,
    });

    // Determine next step
    const nextStep = session.no_result_state
      ? { type: "offer_waitlist", label: "Je m'en occupe. On vous contacte rapidement." }
      : { type: "open_calendar", label: "Je vous montre les disponibilités." };

    return new Response(JSON.stringify({
      saved: true,
      booking_draft_status: draft?.booking_status || "contact_captured",
      next_step: nextStep,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("alex-capture-contact error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
