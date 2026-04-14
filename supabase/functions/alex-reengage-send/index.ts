/**
 * alex-reengage-send — Record a re-engagement event.
 * Increments counter, enforces max 3, transitions to passive.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { conversation_id, action } = await req.json();
    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: "conversation_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get or create log
    const { data: existing } = await supabase
      .from("conversation_activity_logs")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const MAX = 3;

    // Action: reset (user came back)
    if (action === "reset") {
      if (existing) {
        await supabase
          .from("conversation_activity_logs")
          .update({
            reengagement_count: 0,
            state: "active",
            last_user_action_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
      return new Response(
        JSON.stringify({ status: "reset", count: 0, state: "active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: increment (send re-engagement)
    const currentCount = existing?.reengagement_count ?? 0;

    if (currentCount >= MAX) {
      return new Response(
        JSON.stringify({ status: "blocked", reason: "max_reached", count: currentCount, state: "passive" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newCount = currentCount + 1;
    const newState = newCount >= MAX ? "passive" : "active";

    if (existing) {
      await supabase
        .from("conversation_activity_logs")
        .update({
          reengagement_count: newCount,
          state: newState,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("conversation_activity_logs")
        .insert({
          conversation_id,
          reengagement_count: newCount,
          state: newState,
        });
    }

    return new Response(
      JSON.stringify({ status: "sent", count: newCount, state: newState }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
