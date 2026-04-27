import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, signals } = await req.json();
    if (!user_id || !signals?.length) {
      return new Response(JSON.stringify({ error: "user_id and signals required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const results = [];
    for (const signal of signals) {
      const { error } = await supabase
        .from("alex_user_memory")
        .upsert({
          user_id,
          memory_key: signal.key,
          memory_value: signal.value,
          confidence_score: signal.confidence || 0.5,
          source: signal.source || "conversation",
          last_used_at: new Date().toISOString(),
        }, { onConflict: "user_id,memory_key" });

      results.push({ key: signal.key, stored: !error, error: error?.message });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
