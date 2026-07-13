// repair-paid-contractor-activation
// Reconciles ANY paid $1 SMS outreach checkout that failed to create/link a contractor.
// Modes:
//   { session_id } → repair a single Stripe session (called from success page after timeout)
//   { sweep: true, limit? } → admin sweep of the last N days (retroactive audit)
//   {} → dry-run count of gaps
//
// Idempotent. Reuses the same logic as stripe-webhook by replaying via x-replay-token.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function replayWebhook(sessionId: string) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { ok: false, reason: "not_paid", session_id: sessionId };
  }
  const fakeEvent = {
    id: `evt_replay_${sessionId}`,
    type: "checkout.session.completed",
    data: { object: session },
  };
  const url = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/stripe-webhook`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-replay-token": Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    },
    body: JSON.stringify(fakeEvent),
  });
  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, body: text, session_id: sessionId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const { session_id, sweep, limit = 100 } = body ?? {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- Single session repair (from success page timeout) ---
    if (session_id) {
      const result = await replayWebhook(session_id);
      return json({ mode: "single", result });
    }

    // --- Sweep mode: find prospects with activation_paid_at but no contractor,
    // OR contractor without profile ---
    if (sweep) {
      const { data: gaps } = await supabase
        .from("prospects")
        .select("id, stripe_session_id, contractor_id, activation_paid_at")
        .not("activation_paid_at", "is", null)
        .limit(limit);

      const toRepair: string[] = [];
      for (const p of gaps ?? []) {
        if (!p.stripe_session_id) continue;
        let needs = false;
        if (!p.contractor_id) needs = true;
        else {
          const { data: prof } = await supabase.from("contractor_profiles")
            .select("id").eq("contractor_id", p.contractor_id).maybeSingle();
          if (!prof) needs = true;
        }
        if (needs) toRepair.push(p.stripe_session_id);
      }

      const results = [];
      for (const sid of toRepair) {
        try {
          const r = await replayWebhook(sid);
          results.push(r);
        } catch (e) {
          results.push({ ok: false, session_id: sid, error: (e as Error).message });
        }
      }
      return json({ mode: "sweep", scanned: gaps?.length ?? 0, repaired: results.filter((r) => r.ok).length, results });
    }

    // --- Dry-run: count gaps ---
    const { data: gaps } = await supabase
      .from("prospects")
      .select("id, stripe_session_id, contractor_id, activation_paid_at")
      .not("activation_paid_at", "is", null);

    let missingContractor = 0;
    let missingProfile = 0;
    for (const p of gaps ?? []) {
      if (!p.contractor_id) { missingContractor++; continue; }
      const { data: prof } = await supabase.from("contractor_profiles")
        .select("id").eq("contractor_id", p.contractor_id).maybeSingle();
      if (!prof) missingProfile++;
    }
    return json({
      mode: "dry_run",
      total_paid: gaps?.length ?? 0,
      missing_contractor: missingContractor,
      missing_profile: missingProfile,
    });
  } catch (e) {
    console.error("[repair-paid-contractor-activation]", (e as Error).message);
    return json({ error: "internal_error", detail: (e as Error).message }, 500);
  }
});
