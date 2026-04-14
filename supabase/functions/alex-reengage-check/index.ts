/**
 * alex-reengage-check — Check if a conversation should receive a re-engagement.
 * Returns current state and whether re-engagement is allowed.
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
    const { conversation_id } = await req.json();
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

    const { data, error } = await supabase
      .from("conversation_activity_logs")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const MAX = 3;
    const canReengage = !data || (data.reengagement_count < MAX && data.state === "active");

    return new Response(
      JSON.stringify({
        can_reengage: canReengage,
        current_count: data?.reengagement_count ?? 0,
        state: data?.state ?? "active",
        last_user_action_at: data?.last_user_action_at ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
