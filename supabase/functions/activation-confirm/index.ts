// Confirms the $1 activation Stripe session and activates the contractor profile.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { session_id, run_id } = await req.json();
    if (!session_id || !run_id) throw new Error("session_id and run_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ paid: false, status: session.payment_status }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: run } = await supabase
      .from("activation_pipeline_runs")
      .select(
        "id, domain, recommended_plan, extraction, signals, contractor_id, activated_at",
      )
      .eq("id", run_id)
      .maybeSingle();
    if (!run) throw new Error("run not found");

    // Idempotent: if already activated, return existing.
    if (run.activated_at && run.contractor_id) {
      return new Response(
        JSON.stringify({
          paid: true,
          contractor_id: run.contractor_id,
          run_id: run.id,
          already_activated: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const signals = (run.signals ?? {}) as Record<string, unknown>;
    const extraction = (run.extraction ?? {}) as Record<string, unknown>;
    const emails = Array.isArray(signals.emails_found)
      ? signals.emails_found as string[]
      : [];
    const phones = Array.isArray(signals.phones_found)
      ? signals.phones_found as string[]
      : [];
    const businessName =
      (extraction?.metadata as Record<string, unknown> | undefined)
        ?.title as string ?? run.domain ?? "Entrepreneur UNPRO";

    // Try to upsert a contractor row. The schema may vary; we keep this best-effort.
    let contractorId: string | null = null;
    try {
      const { data: contractor } = await supabase
        .from("contractors")
        .insert({
          business_name: businessName,
          website: run.domain ? `https://${run.domain}` : null,
          email: emails[0] ?? session.customer_details?.email ?? null,
          phone: phones[0] ?? null,
          is_founder: true,
          founder_plan: run.recommended_plan,
          activation_run_id: run.id,
          status: "active",
        })
        .select("id")
        .single();
      contractorId = contractor?.id ?? null;
    } catch (e) {
      console.warn("[activation-confirm] contractor insert skipped", e);
    }

    await supabase
      .from("activation_pipeline_runs")
      .update({
        pipeline_status: "activated",
        activated_at: new Date().toISOString(),
        contractor_id: contractorId,
        stripe_session_id: session.id,
      })
      .eq("id", run.id);

    // Best-effort system event
    try {
      await supabase.from("system_events").insert({
        event_type: "contractor_activated",
        payload: {
          run_id: run.id,
          contractor_id: contractorId,
          plan: run.recommended_plan,
          amount: session.amount_total,
          currency: session.currency,
          domain: run.domain,
        },
      });
    } catch (_) { /* table optional */ }

    return new Response(
      JSON.stringify({
        paid: true,
        contractor_id: contractorId,
        run_id: run.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
