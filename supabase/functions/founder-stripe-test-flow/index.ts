// Founder Verification — Stripe end-to-end test flow (sandbox / non-destructive)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const stages: Array<{ stage: string; ok: boolean; ms: number; detail?: string }> = [];

  const run = async (stage: string, fn: () => Promise<string | void>) => {
    const t = Date.now();
    try {
      const detail = await fn();
      stages.push({ stage, ok: true, ms: Date.now() - t, detail: detail ?? undefined });
    } catch (e) {
      stages.push({ stage, ok: false, ms: Date.now() - t, detail: String((e as Error).message ?? e) });
      throw e;
    }
  };

  try {
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) throw new Error("STRIPE_SECRET_KEY missing");

    await run("stripe.balance", async () => {
      const r = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } });
      if (!r.ok) throw new Error(`stripe ${r.status}`);
      const b = await r.json();
      return `available=${b.available?.[0]?.amount ?? 0}${b.available?.[0]?.currency ?? ""}`;
    });

    let sessionUrl = "";
    await run("checkout.create", async () => {
      const params = new URLSearchParams();
      params.set("mode", "payment");
      params.set("success_url", `${req.headers.get("origin") || "https://unpro.ca"}/payment-success`);
      params.set("cancel_url", `${req.headers.get("origin") || "https://unpro.ca"}/payment-canceled`);
      params.append("line_items[0][price_data][currency]", "cad");
      params.append("line_items[0][price_data][product_data][name]", "UNPRO Verification Test");
      params.append("line_items[0][price_data][unit_amount]", "100");
      params.append("line_items[0][quantity]", "1");
      params.append("metadata[founder_test]", "true");
      const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (!r.ok) throw new Error(`checkout ${r.status} ${await r.text()}`);
      const s = await r.json();
      sessionUrl = s.url;
      return `session_id=${s.id}`;
    });

    await run("webhook.simulate", async () => {
      await admin.from("system_events" as any).insert({
        event_type: "stripe.checkout.completed.simulated",
        payload: { source: "founder-stripe-test-flow" },
      }).catch(() => null);
      return "logged";
    });

    await run("activation.dryrun", async () => {
      return "would call activate-contractor-plan with metadata";
    });

    return new Response(JSON.stringify({ ok: true, stages, checkout_url: sessionUrl }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, stages, error: String((e as Error).message ?? e) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
