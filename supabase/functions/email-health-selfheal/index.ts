// Cron-invoked: runs full health probe + live send to healthcheck@unpro.ca every 15 min.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const base = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Fire live test (writes health check row)
  const resp = await fetch(`${base}/functions/v1/email-live-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify({ recipient: "healthcheck@unpro.ca", triggered_by: "cron" }),
  });
  const body = await resp.json().catch(() => ({}));

  return new Response(JSON.stringify({ ran_at: new Date().toISOString(), result: body }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
