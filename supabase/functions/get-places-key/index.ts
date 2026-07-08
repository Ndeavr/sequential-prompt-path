import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Deprecated: Google Places API keys are no longer exposed to the browser.
  // All Places calls are proxied through edge functions to support custom-domain
  // referer restrictions and to keep keys server-side.
  return new Response(
    JSON.stringify({
      error: "DEPRECATED",
      message: "Use the google-places-autocomplete or business-lookup edge functions instead.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
