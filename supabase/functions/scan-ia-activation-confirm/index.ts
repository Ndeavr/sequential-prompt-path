// scan-ia-activation-confirm — verifies Stripe session and marks activation.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ paid: false, error: "Stripe indisponible." }, 503);

    const { session_id, session_token } = await req.json().catch(() => ({}));
    if (!session_id) return json({ paid: false, error: "session_id manquant." }, 400);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const cs = await stripe.checkout.sessions.retrieve(session_id);
    const paid = cs.payment_status === "paid";

    if (paid) {
      const url = Deno.env.get("SUPABASE_URL") ?? "";
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (url && key) {
        const sb = createClient(url, key);
        const token = session_token || cs.client_reference_id || cs.metadata?.session_token;
        if (token) {
          const { data } = await sb
            .from("scan_ia_reports")
            .update({ stripe_session_id: session_id, activated_at: new Date().toISOString() })
            .eq("session_token", token)
            .select("id")
            .maybeSingle();
          return json({ paid: true, report_id: data?.id ?? null });
        }
      }
    }

    return json({ paid, status: cs.payment_status });
  } catch (e) {
    console.error("scan-ia-activation-confirm error:", e);
    return json({ paid: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
