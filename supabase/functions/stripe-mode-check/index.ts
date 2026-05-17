// Tiny edge function returning whether STRIPE_SECRET_KEY is live or test.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const k = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const mode = k.startsWith("sk_live_") ? "live" : k.startsWith("sk_test_") ? "test" : "unknown";
  return new Response(JSON.stringify({ mode }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
