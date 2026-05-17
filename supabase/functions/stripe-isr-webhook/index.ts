// Stripe webhook for ISR live runs. Marks payment_completed + activated when
// checkout.session.completed is received with metadata.source === "sms_live_run".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });
    const sig = req.headers.get("stripe-signature");
    const whSecret = Deno.env.get("STRIPE_ISR_WEBHOOK_SECRET");
    if (!sig || !whSecret) throw new Error("missing_signature_or_secret");

    const raw = await req.text();
    const event = await stripe.webhooks.constructEventAsync(raw, sig, whSecret);

    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ ok: true, ignored: event.type }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const session = event.data.object as any;
    const md = session.metadata || {};
    if (md.source !== "sms_live_run") {
      return new Response(JSON.stringify({ ok: true, ignored: "not_sms_live_run" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const runId: string | undefined = md.run_id;
    const prospectId: string | undefined = md.prospect_id;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (runId) {
      const now = new Date().toISOString();
      await sb.from("acquisition_run_steps").upsert(
        [
          {
            run_id: runId,
            step_key: "payment_completed",
            step_order: 10,
            status: "succeeded",
            logs: [{ at: now, session_id: session.id, amount_total: session.amount_total }],
            completed_at: now,
          },
          {
            run_id: runId,
            step_key: "activated",
            step_order: 11,
            status: "succeeded",
            logs: [{ at: now, prospect_id: prospectId }],
            completed_at: now,
          },
        ],
        { onConflict: "run_id,step_key" }
      );
      await sb.from("live_acquisition_runs").update({ status: "succeeded" }).eq("id", runId);
    }

    if (prospectId) {
      await sb
        .from("war_prospects")
        .update({ status: "activated", activated_at: new Date().toISOString() })
        .eq("id", prospectId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stripe-isr-webhook]", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
