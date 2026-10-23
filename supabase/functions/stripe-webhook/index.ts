import { shouldSkipRedelivery, entryActivationDecision, entryPackBlockReason, entry350PaymentBlockReason, entry350CommissionArgs, addCalendarMonths, entry350LedgerConflict } from "../_shared/checkoutGuards.ts";
import { revokeEntry350 } from "../_shared/entry350Revocation.ts";
import { ENTRY350_PROMO_TAX_CONTRACT, verifyEntry350PromoContract } from "../_shared/entry350Promo.ts";
import { reverseEntry350Commission, entry350SessionRevoked } from "../_shared/entry350CommissionReversal.ts";
import { verifyEntry350TaxContract } from "../_shared/entry350Tax.ts";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stripe 2025+ moved current_period_* onto subscription items. Fall back safely.
function getSubscriptionPeriod(sub: any): { start: string | null; end: string | null } {
  const item = sub?.items?.data?.[0];
  const startSec = item?.current_period_start ?? sub?.current_period_start ?? null;
  const endSec = item?.current_period_end ?? sub?.current_period_end ?? null;
  const toIso = (s: number | null) =>
    typeof s === "number" && Number.isFinite(s) ? new Date(s * 1000).toISOString() : null;
  return { start: toIso(startSec), end: toIso(endSec) };
}

// Activation flow observability — best-effort insert, never throws.
async function logActivationStep(
  supabase: any,
  step: string,
  payload: Record<string, unknown>,
) {
  try {
    await supabase.from("activation_flow_events").insert({
      step,
      status: "ok",
      ...payload,
    });
  } catch (_) {
    /* soft-fail */
  }
}



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Corps brut conservé : le flux de la requête ne peut être lu qu'une fois,
  // et le bloc d'erreur doit pouvoir marquer l'événement « failed ».
  let rawBody = "";
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const testWebhookSecret = Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    let stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
    const body = await req.text();
    rawBody = body;

    // Replay mode: internal reprocessing bypasses Stripe signature check.
    // Requires x-replay-token header matching SERVICE_ROLE_KEY.
    const replayToken = req.headers.get("x-replay-token");
    const isReplay =
      !!replayToken &&
      replayToken === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let event: Stripe.Event;

    if (!webhookSecret && !isReplay) {
      return new Response(JSON.stringify({ error: "Webhook verification unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isReplay) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Live signature first; fall back to the Stripe test endpoint secret so
      // test-mode events can be verified for real (never forged, never skipped).
      try {
        try {
          event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret ?? "");
        } catch (liveErr) {
          if (!testWebhookSecret) throw liveErr;
          event = await stripe.webhooks.constructEventAsync(body, sig, testWebhookSecret);
          if (event.livemode) throw liveErr;
        }
      } catch (_sigErr) {
        // Invalid signature = client error; never processed, never retried as a server fault.
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }

    // A test-mode event must be read back with the test key, otherwise every
    // subscription/payment lookup below fails with "no such subscription".
    if (event.livemode === false) {
      const testKey = Deno.env.get("STRIPE_TEST_SECRET_KEY");
      if (testKey) stripe = new Stripe(testKey, { apiVersion: "2025-04-30.basil" });
    }



    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log every webhook receipt into the activation flow (best-effort).
    {
      const obj = (event.data.object as any) || {};
      await logActivationStep(supabase, "webhook_received", {
        stripe_event_id: event.id,
        stripe_session_id: obj?.id ?? null,
        metadata: { event_type: event.type },
      });
    }



    // Observability: log to stripe_webhook_events (idempotent via unique stripe_event_id).
    // CANONICAL AUDIT — this function is the ONLY production Stripe endpoint
    // (Stripe endpoint `we_1Tqjp5CvZwK1QnPVnKuhISaC` -> /functions/v1/stripe-webhook).
    // Never log card data: only ids, status and attribution metadata.
    const receivedAt = new Date().toISOString();
    const sessionObj = (event.data.object as any) || {};
    const evtMd = (sessionObj?.metadata || {}) as Record<string, string>;
    const sessionIdField = sessionObj?.id || null;
    const contractorIdField = evtMd.contractor_id || evtMd.prospect_id || null;
    const prospectIdField = evtMd.prospect_id || null;
    const paymentIntentField =
      typeof sessionObj?.payment_intent === "string"
        ? sessionObj.payment_intent
        : sessionObj?.payment_intent?.id ?? (sessionObj?.object === "payment_intent" ? sessionObj?.id : null);
    // AI attribution must survive checkout -> webhook -> activation.
    const aiAttribution = {
      agent_run_id: evtMd.agent_run_id ?? null,
      agent_name: evtMd.agent_name ?? null,
      acquisition_origin: evtMd.acquisition_origin ?? null,
      human_unpro_touches: evtMd.human_unpro_touches ?? null,
      activation_token: evtMd.activation_token ?? null,
      landing_token: evtMd.landing_token ?? null,
      campaign_id: evtMd.campaign_id ?? null,
      offer: evtMd.offer ?? evtMd.offer_kind ?? null,
    };

    if (isReplay) {
      // Mark row as reprocessing; clear previous error.
      await supabase.from("stripe_webhook_events").update({
        processing_status: "processing",
        error_message: null,
        last_retry_at: new Date().toISOString(),
        retry_count: 0 as any, // will be incremented below via RPC-safe update
      }).eq("stripe_event_id", event.id);
      // Increment retry_count safely
      await supabase.rpc("increment_stripe_event_retry", { p_event_id: event.id }).then(() => {}).catch(() => {});
    } else {
      const { error: insertErr } = await supabase.from("stripe_webhook_events").insert({
        stripe_event_id: event.id,
        event_type: event.type,
        received_at: receivedAt,
        contractor_id: contractorIdField,
        prospect_id: prospectIdField,
        payment_intent_id: paymentIntentField,
        session_id: sessionIdField,
        livemode: (event as any).livemode ?? null,
        attribution: aiAttribution,
        payload: event as any,
        processing_status: "processing",
      });


      if (insertErr && !String(insertErr.message).includes("duplicate")) {
        console.warn("[stripe-webhook] audit insert warning", insertErr.message);
      }
      if (insertErr && String(insertErr.message).includes("duplicate")) {
        const { data: prior } = await supabase.from("stripe_webhook_events")
          .select("processing_status, received_at").eq("stripe_event_id", event.id).maybeSingle();
        if (!shouldSkipRedelivery(prior)) {
          // Previous attempt failed or stalled: retry idempotently instead of dropping it.
          console.log(`Redelivered webhook ${event.id} after ${prior?.processing_status}, reprocessing`);
          await supabase.from("stripe_webhook_events").update({
            processing_status: "processing", error_message: null, last_retry_at: new Date().toISOString(),
          }).eq("stripe_event_id", event.id);
        } else {
        console.log(`Duplicate webhook event ${event.id}, skipping`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        }
      }
    }


    // Legacy audit log (kept for backward compat)
    await supabase.from("integration_audit_logs").insert({
      integration_name: "stripe",
      action_name: event.id,
      status: "processing",
      payload: { type: event.type },
    });



    /* ─────────────────────────────────────────────────────────────
     * Booking payments (smart_bookings + booking_transactions).
     * Idempotent: the transaction is located by Stripe session id or
     * payment intent id, then moved forward in its own state machine.
     * ───────────────────────────────────────────────────────────── */
    try {
      const bookingEvents = new Set([
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
        "payment_intent.payment_failed",
        "charge.refunded",
      ]);

      if (bookingEvents.has(event.type)) {
        const obj = event.data.object as any;
        const sid = obj?.object === "checkout.session" ? obj.id : null;
        const piId =
          typeof obj?.payment_intent === "string"
            ? obj.payment_intent
            : obj?.payment_intent?.id ?? (obj?.object === "payment_intent" ? obj.id : null);

        let txQuery = supabase
          .from("booking_transactions")
          .select("id, booking_id, status, refunded")
          .limit(1);
        txQuery = sid
          ? txQuery.eq("stripe_session_id", sid)
          : txQuery.eq("stripe_payment_intent_id", piId ?? "__none__");

        const { data: txRows, error: txErr } = await txQuery;
        if (txErr) console.error("[stripe-webhook][booking] lookup failed:", txErr.message);

        const tx = txRows?.[0];
        if (tx) {
          const nowIso = new Date().toISOString();
          let update: Record<string, unknown> | null = null;
          let bookingStatus: string | null = null;

          if (
            (event.type === "checkout.session.completed" ||
              event.type === "checkout.session.async_payment_succeeded") &&
            obj?.payment_status === "paid"
          ) {
            if (tx.status !== "completed") {
              update = {
                status: "completed",
                stripe_payment_intent_id: piId,
                payment_method: "stripe",
                payment_reference: piId ?? sid,
                paid_at: nowIso,
              };
              bookingStatus = "confirmed";
            }
          } else if (
            event.type === "checkout.session.async_payment_failed" ||
            event.type === "payment_intent.payment_failed" ||
            event.type === "checkout.session.expired"
          ) {
            if (tx.status !== "completed" && tx.status !== "failed") {
              update = { status: "failed", stripe_payment_intent_id: piId, failed_at: nowIso };
              bookingStatus = "payment_failed";
            }
          } else if (event.type === "charge.refunded") {
            if (!tx.refunded) {
              update = {
                status: "refunded",
                refunded: true,
                refund_amount_cents: obj?.amount_refunded ?? null,
                refunded_at: nowIso,
                stripe_payment_intent_id: piId,
              };
              bookingStatus = "cancelled";
            }
          }

          if (update) {
            const { error: upErr } = await supabase
              .from("booking_transactions")
              .update(update)
              .eq("id", tx.id);
            if (upErr) console.error("[stripe-webhook][booking] update failed:", upErr.message);
            if (!upErr && bookingStatus && tx.booking_id) {
              await supabase
                .from("smart_bookings")
                .update({ status: bookingStatus })
                .eq("id", tx.booking_id);
            }
          }
        }
      }
    } catch (bookingErr) {
      console.error("[stripe-webhook][booking] handler error:", String(bookingErr));
    }

    // ── RÉVOCATION 350 $ : remboursement ou litige ─────────────────────
    // Un remboursement ou un litige retire les 12 mois de Présence IA
    // (contractor_plan_code ignore toute session révoquée). Idempotent.
    if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
      const obj = event.data.object as any;
      const piId = typeof obj?.payment_intent === "string" ? obj.payment_intent : obj?.payment_intent?.id ?? null;
      if (piId) {
        await revokeEntry350(supabase, {
          paymentIntentId: piId,
          eventId: event.id,
          livemode: event.livemode === true,
          reason: event.type === "charge.refunded" ? "refunded" : "disputed",
        });
        // Commission affiliée : LIVE seulement; jamais bloquant pour le reste.
        try {
          await reverseEntry350Commission(supabase, {
            paymentIntentId: piId,
            eventId: event.id,
            livemode: event.livemode === true,
            reason: event.type === "charge.refunded" ? "refunded" : "disputed",
            partial: event.type === "charge.refunded" && typeof obj?.amount === "number" &&
              typeof obj?.amount_refunded === "number" && obj.amount_refunded < obj.amount,
          });
        } catch (e) {
          console.error("[stripe-webhook][entry_350] commission reversal failed", piId, String(e));
        }
      }
    }

    switch (event.type) {

      case "checkout.session.async_payment_succeeded":
      case "checkout.session.completed": {
        let session = event.data.object as Stripe.Checkout.Session;
        // Before paid telemetry, provisioning, roles, subscriptions or flags.
        // Keep legacy/free offers unchanged; only the two paid entry circuits.
        if (session.metadata?.offer === "entry_activation_350" ||
            session.metadata?.offer === "entry_pack_350" ||
            session.metadata?.offer_kind === "pack_350") {
          if (session.metadata?.entry_tax_contract && session.payment_status === "paid") {
            const preliminary = entry350PaymentBlockReason({ ...session, total_details: session.total_details ?? { amount_tax: 5241 } });
            if (preliminary) {
              await supabase.from("stripe_webhook_events").update({ processing_status: preliminary }).eq("stripe_event_id", event.id);
              return new Response(JSON.stringify({ received: true, ignored: preliminary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            session = session.metadata.entry_tax_contract === ENTRY350_PROMO_TAX_CONTRACT
              ? await verifyEntry350PromoContract(stripe, session, event.livemode === true, isReplay)
              : await verifyEntry350TaxContract(stripe, session, event.livemode === true, isReplay);
          }
          const block = entry350PaymentBlockReason(session);
          if (block) {
            await supabase.from("stripe_webhook_events").update({
              processing_status: block,
            }).eq("stripe_event_id", event.id);
            await supabase.from("integration_audit_logs").update({ status: "ignored" })
              .eq("integration_name", "stripe").eq("action_name", event.id);
            return new Response(JSON.stringify({ received: true, ignored: block }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        const contractorId = session.metadata?.contractor_id;
        const planId = session.metadata?.plan_id;
        const planCode = session.metadata?.plan_code;
        const billingInterval = session.metadata?.billing_interval || "month";
        const redemptionId = session.metadata?.redemption_id;
        const promoCode = session.metadata?.promo_code;

        // Founder / activation flow observability.
        if (session.payment_status === "paid" || session.status === "complete") {
          await logActivationStep(supabase, "stripe_payment_succeeded", {
            stripe_event_id: event.id,
            stripe_session_id: session.id,
            email: session.customer_details?.email ?? session.customer_email ?? null,
            metadata: {
              amount_total: session.amount_total,
              currency: session.currency,
              source: session.metadata?.source ?? null,
              offer: session.metadata?.offer ?? null,
            },
          });
        }
        if (session.subscription) {
          await logActivationStep(supabase, "subscription_created", {
            stripe_event_id: event.id,
            stripe_session_id: session.id,
            email: session.customer_details?.email ?? session.customer_email ?? null,
            metadata: {
              subscription_id: String(session.subscription),
              source: session.metadata?.source ?? null,
              offer: session.metadata?.offer ?? null,
            },
          });
        }

        // ── ACTIVATION D'ENTRÉE 350 $ ────────────────────────────────────
        // Paiement unique confirmé par Stripe → rôle entrepreneur, profil
        // activé, devis payé, 12 mois de Présence IA consignés. Idempotent par
        // stripe_session_id dans le registre d'activation.
        if (session.metadata?.offer === "entry_activation_350") {
          const entryContractorId = session.metadata?.contractor_id ?? null;
          const paid = session.payment_status === "paid";
          // Montant exact exigé : 350 $ CAD hors taxes. Tout écart = aucune activation.
          const amountOk = session.amount_subtotal === 35000 && (session.currency ?? "").toLowerCase() === "cad";
          if (entryContractorId && paid && !amountOk) {
            console.error("[stripe-webhook][entry_activation_350] amount mismatch", session.id, session.amount_subtotal, session.currency);
            await supabase.from("admin_notifications").insert({
              type: "entry_activation_350_amount_mismatch", severity: "critical", contractor_id: entryContractorId,
              title: "Paiement 350 $ : montant inattendu — activation bloquée",
              body: "Vérifier la session Stripe avant toute activation manuelle.",
              payload_json: { stripe_session_id: session.id, amount_subtotal: session.amount_subtotal, currency: session.currency },
            });
          }
          if (entryContractorId && paid && amountOk) {
            const { data: already, error: alreadyError } = await supabase
              .from("contractor_activation_ledger")
              .select("id")
              .eq("action", "entry_activation_350_paid")
              .eq("metadata->>stripe_session_id", session.id)
              .maybeSingle();
            const { data: ownerRow, error: ownerError } = await supabase
              .from("contractors").select("user_id, activation_status").eq("id", entryContractorId).maybeSingle();
            const { data: otherSession, error: otherError } = await supabase
              .from("contractor_activation_ledger")
              .select("id")
              .eq("action", "entry_activation_350_paid")
              .eq("contractor_id", entryContractorId)
              .neq("metadata->>stripe_session_id", session.id)
              .limit(1)
              .maybeSingle();
            if (alreadyError || ownerError || otherError || !ownerRow?.user_id) {
              throw new Error("entry_activation_350 ownership or ledger lookup failed");
            }
            // PROMO usage unique global : une autre session déjà payée avec ce code
            // (tout compte) = aucune activation, alerte remboursement.
            const promoCodeId = session.metadata?.entry_tax_contract === ENTRY350_PROMO_TAX_CONTRACT ? session.metadata?.promo_code_id : null;
            let promoAlreadyRedeemed = false;
            if (promoCodeId) {
              const { data: pr, error: prErr } = await supabase.from("contractor_activation_ledger").select("id")
                .eq("action", "entry_activation_350_paid").eq("metadata->>promo_code_id", promoCodeId)
                .neq("metadata->>stripe_session_id", session.id).limit(1).maybeSingle();
              if (prErr) throw new Error("entry_activation_350 promo lookup failed");
              promoAlreadyRedeemed = !!pr;
            }
            // Séparation TEST/LIVE : un événement de test n'active qu'un compte QA marqué.
            let isQaAccount = false;
            if (event.livemode !== true && ownerRow?.user_id) {
              const { data: u } = await supabase.auth.admin.getUserById(ownerRow.user_id);
              const md = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
              isQaAccount = /^e2e\+[^@]+@unpro\.ca$/i.test(u?.user?.email ?? "") || md.e2e_test === true || md.e2e_test === "true";
            }
            const decision = entryActivationDecision({
              livemode: event.livemode,
              isQaAccount,
              sessionAlreadyInLedger: !!already,
              activatedByOtherSession: !!otherSession || promoAlreadyRedeemed,
            });
            console.log("[stripe-webhook][entry_activation_350] decision", { event: event.id, session: session.id, livemode: event.livemode, decision });
            if (decision === "test_on_non_qa" || decision === "duplicate_payment") {
              await supabase.from("admin_notifications").insert({
                type: decision === "duplicate_payment" ? "entry_activation_350_duplicate_payment" : "entry_activation_350_test_blocked",
                severity: decision === "duplicate_payment" ? "critical" : "warning",
                contractor_id: entryContractorId,
                title: decision === "duplicate_payment"
                  ? (event.livemode ? "Double paiement 350 $ (réel) — à rembourser" : "Double paiement 350 $ (TEST) — à rembourser")
                  : "Paiement TEST sur un compte non QA — aucune activation",
                body: "Aucune activation supplémentaire n'a été faite.",
                payload_json: { stripe_session_id: session.id, stripe_event_id: event.id, livemode: event.livemode ?? null, quote_id: session.metadata?.quote_id ?? null },
              });
            }
            if (decision === "activate" || decision === "already_processed") {
              const nowIso = new Date().toISOString();
              const presenceUntil = addCalendarMonths(new Date(), 12).toISOString();
              const guaranteed = Number(session.metadata?.guaranteed_appointments ?? 0) || 0;
              // Le registre d'abord : s'il échoue, rien d'autre n'est modifié.
              const { error: ledgerErr } = decision === "already_processed" ? { error: null } : await supabase.from("contractor_activation_ledger").insert({
                contractor_id: entryContractorId,
                action: "entry_activation_350_paid",
                source: "stripe_webhook",
                before_state: { activation_status: ownerRow?.activation_status ?? null },
                after_state: { activation_status: "activated", presence_ia_until: presenceUntil, guaranteed_appointments: guaranteed },
                metadata: {
                  stripe_session_id: session.id,
                  stripe_event_id: event.id,
                  stripe_payment_intent: session.payment_intent ? String(session.payment_intent) : null,
                  amount_cents: session.amount_total ?? 35000,
                  amount_subtotal_cents: session.amount_subtotal ?? null,
                  amount_discount_cents: session.total_details?.amount_discount ?? 0,
                  amount_tax_cents: session.total_details?.amount_tax ?? null,
                  entry_tax_contract: session.metadata?.entry_tax_contract ?? null,
                  ...(promoCodeId ? { promo_code: "PROMO", promo_code_id: promoCodeId, promo_coupon_id: session.metadata?.promo_coupon_id ?? null, stripe_customer: session.customer ? String(session.customer) : null } : {}),
                  livemode: event.livemode ?? null,
                  quote_id: session.metadata?.quote_id ?? null,
                  prospect_id: session.metadata?.prospect_id ?? null,
                  ref: session.metadata?.ref ?? null,
                  campaign: session.metadata?.campaign ?? null,
                },
              });
              // PROMO déjà encaissé par une AUTRE session (index uq_entry350_single_promo_redemption) :
              // aucun droit, aucune commission, alerte remboursement, accusé de réception seulement.
              let promoOriginal: { contractor_id?: string | null; metadata?: unknown } | null = null;
              let promoOriginalSession: unknown = null;
              if (ledgerErr && entry350LedgerConflict(ledgerErr.message) === "promo_already_redeemed") {
                const { data: original, error: origErr } = await supabase.from("contractor_activation_ledger")
                  .select("contractor_id, metadata").eq("action", "entry_activation_350_paid")
                  .eq("metadata->>promo_code_id", String(promoCodeId)).limit(1).maybeSingle();
                if (origErr || !original) throw new Error("entry_activation_350 promo original lookup failed");
                promoOriginal = original;
                promoOriginalSession = (original.metadata as Record<string, unknown> | null)?.stripe_session_id ?? null;
              }
              // Same session hitting the promo index first = concurrent redelivery, stays idempotent.
              if (promoOriginal && promoOriginalSession !== session.id) {
                const original = promoOriginal;
                const originalSession = promoOriginalSession;
                await supabase.from("admin_notifications").insert({
                  type: "entry_activation_350_promo_duplicate", severity: "critical", contractor_id: entryContractorId,
                  title: event.livemode ? "Code PROMO déjà utilisé — paiement réel à rembourser" : "Code PROMO déjà utilisé (TEST) — à rembourser",
                  body: "Deuxième paiement avec le code PROMO à usage unique. Aucune activation, aucun droit, aucune commission. Rembourser cette session.",
                  payload_json: { stripe_session_id: session.id, stripe_event_id: event.id, original_stripe_session_id: originalSession,
                    original_contractor_id: original?.contractor_id ?? null, promo_code_id: promoCodeId, amount_total: session.amount_total ?? null, livemode: event.livemode ?? null },
                });
                await supabase.from("stripe_webhook_events").update({ processing_status: "duplicate_promo_redemption" }).eq("stripe_event_id", event.id);
                return new Response(JSON.stringify({ received: true, activated: false, ignored: "duplicate_promo_redemption" }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
              // Livraison concurrente de la MÊME session déjà inscrite (index unique) = idempotent.
              const concurrentDup = ledgerErr && (entry350LedgerConflict(ledgerErr.message) === "same_session" || promoOriginalSession === session.id);
              if (ledgerErr && !concurrentDup) {
                console.error("[stripe-webhook][entry_activation_350] ledger insert failed:", ledgerErr.message);
                throw new Error(`entry_activation_350 ledger: ${ledgerErr.message}`);
              }
              // A ledger receipt is not proof that every entitlement write succeeded.
              // Replay the same-session upserts after an interrupted delivery;
              // never insert another receipt or extend the original presence period.
              {
                const must = (label: string, r: { error: { message: string } | null }) => {
                  if (r.error) throw new Error(`entry_activation_350 ${label}: ${r.error.message}`);
                };
                if (ownerRow?.user_id) {
                  must("role", await supabase.from("user_roles")
                    .upsert({ user_id: ownerRow.user_id, role: "contractor" }, { onConflict: "user_id,role" }));
                }
                must("contractor", await supabase.from("contractors")
                  .update({ account_status: "active", activation_status: "activated" })
                  .eq("id", entryContractorId)
                  .neq("activation_status", "activated"));
                if (session.metadata?.quote_id) {
                  must("quote", await supabase.from("contractor_pricing_quotes")
                    .update({ pricing_status: "paid", stripe_checkout_session_id: session.id })
                    .eq("id", String(session.metadata.quote_id))
                    .neq("pricing_status", "paid"));
                  // Pipeline commercial : jamais alimenté par un paiement TEST.
                  if (event.livemode === true) {
                    await supabase.from("contractor_leads")
                      .update({ lead_status: "entry_350_paid", payment_status: "paid", paid_at: nowIso, next_follow_up_at: null })
                      .eq("metadata_json->>quote_id", String(session.metadata.quote_id));
                  }
                }
                if (decision === "activate" && !concurrentDup) {
                await supabase.from("contractor_funnel_events").insert({
                  contractor_id: entryContractorId,
                  event_type: "entry_350_payment_success",
                  metadata: { stripe_session_id: session.id, amount_cents: session.amount_total ?? 35000, livemode: event.livemode ?? null, test: event.livemode !== true, quote_id: session.metadata?.quote_id ?? null, ref: session.metadata?.ref ?? null },
                });
                await supabase.from("admin_notifications").insert({
                  type: "entry_activation_350_paid",
                  severity: "info",
                  contractor_id: entryContractorId,
                  title: event.livemode ? "Activation 350 $ payée (réel)" : "Activation 350 $ payée (TEST)",
                  body: "Un entrepreneur a activé son profil (350 $, 12 mois de Présence IA).",
                  payload_json: { stripe_session_id: session.id, livemode: event.livemode ?? null, ref: session.metadata?.ref ?? null, quote_id: session.metadata?.quote_id ?? null, guaranteed_appointments: guaranteed },
                });
                }
                // Commission affiliée : LIVE payé 35000 seulement, affiliée résolue
                // au checkout. RPC idempotente par session (relivraison = no-op).
                // N'empêche jamais l'activation; échec = alerte, Stripe peut relivrer.
                const commissionArgs = entry350CommissionArgs({
                  livemode: event.livemode, decision, session, contractorId: entryContractorId,
                });
                if (commissionArgs) {
                  try {
                    // Remboursement/litige déjà reçu pour cette session : aucune commission.
                    if (await entry350SessionRevoked(supabase, session.id)) {
                      throw new Error("session_revoked_before_commission");
                    }
                    const affRes = await supabase.rpc("record_affiliate_payment_conversion", commissionArgs);
                    if (affRes.error) throw new Error(affRes.error.message);
                  } catch (e) {
                    console.error("[stripe-webhook][entry_activation_350] affiliate conversion failed", session.id, String(e));
                    await supabase.from("admin_notifications").insert({
                      type: "entry_activation_350_commission_failed", severity: "critical", contractor_id: entryContractorId,
                      title: "Commission affiliée non inscrite (350 $)",
                      body: "Activation conservée. Commission à réinscrire (idempotente par session).",
                      payload_json: { stripe_session_id: session.id, affiliate_id: commissionArgs.p_affiliate_id, error: String(e) },
                    });
                  }
                }
              }
            }
          }
        }

        // ── OFFRE DE REPLI — CRÉDIT UNPRO 350 $ ──────────────────────────
        // Seule source d'octroi du crédit. Idempotent : un index unique sur
        // metadata->>'stripe_session_id' empêche tout double crédit.
        if (session.metadata?.offer === "fallback_credit_350") {
          const creditContractorId = session.metadata?.contractor_id ?? null;
          const paid = session.payment_status === "paid" || session.status === "complete";

          if (creditContractorId && paid) {
            // Paiement confirmé → accès à l'espace entrepreneur (idempotent, même
            // mécanisme que le provisionnement). Sans ce rôle, le retour /pro
            // renvoyait vers l'espace propriétaire.
            const { data: ownerRow } = await supabase
              .from("contractors")
              .select("user_id")
              .eq("id", creditContractorId)
              .maybeSingle();
            if (ownerRow?.user_id) {
              await supabase.from("user_roles")
                .upsert({ user_id: ownerRow.user_id, role: "contractor" }, { onConflict: "user_id,role" });
            }
            const { data: existingCredit } = await supabase
              .from("pricing_transactions")
              .select("id")
              .eq("transaction_type", "fallback_credit_350")
              .eq("metadata->>stripe_session_id", session.id)
              .maybeSingle();

            if (!existingCredit) {
              const { data: wallet } = await supabase
                .from("contractor_wallet")
                .select("id, balance_cents, lifetime_credited_cents")
                .eq("contractor_id", creditContractorId)
                .maybeSingle();

              const previousBalance = Number(wallet?.balance_cents ?? 0);
              const newBalance = previousBalance + 35000;

              let walletId = wallet?.id ?? null;
              if (walletId) {
                await supabase
                  .from("contractor_wallet")
                  .update({
                    balance_cents: newBalance,
                    lifetime_credited_cents:
                      Number(wallet?.lifetime_credited_cents ?? 0) + 35000,
                    last_top_up_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", walletId);
              } else {
                const { data: createdWallet } = await supabase
                  .from("contractor_wallet")
                  .insert({
                    contractor_id: creditContractorId,
                    balance_cents: newBalance,
                    lifetime_credited_cents: 35000,
                    last_top_up_at: new Date().toISOString(),
                  })
                  .select("id")
                  .single();
                walletId = createdWallet?.id ?? null;
              }

              const { error: creditErr } = await supabase
                .from("pricing_transactions")
                .insert({
                  contractor_id: creditContractorId,
                  wallet_id: walletId,
                  amount_cents: 35000,
                  transaction_type: "fallback_credit_350",
                  description_fr:
                    "Crédit UNPRO — sécurisation de présence (offre de repli 350 $)",
                  balance_after_cents: newBalance,
                  metadata: {
                    stripe_session_id: session.id,
                    stripe_event_id: event.id,
                    stripe_payment_intent: session.payment_intent
                      ? String(session.payment_intent)
                      : null,
                    origin: "fallback_credit_350",
                    quote_id: session.metadata?.quote_id ?? null,
                    prospect_id: session.metadata?.prospect_id ?? null,
                    ref: session.metadata?.ref ?? null,
                  },
                });

              // Un doublon concurrent est rattrapé par l'index unique : le solde
              // est alors remis à sa valeur précédente pour rester exact.
              if (creditErr) {
                console.error("[stripe-webhook][fallback_credit_350] insert failed:", creditErr.message);
                await supabase
                  .from("contractor_wallet")
                  .update({ balance_cents: previousBalance, updated_at: new Date().toISOString() })
                  .eq("contractor_id", creditContractorId)
                  .eq("balance_cents", newBalance);
              } else {
                await supabase.from("contractor_activation_ledger").insert({
                  contractor_id: creditContractorId,
                  action: "fallback_credit_350_granted",
                  source: "stripe_webhook",
                  before_state: { balance_cents: previousBalance },
                  after_state: { balance_cents: newBalance },
                  metadata: {
                    stripe_session_id: session.id,
                    stripe_event_id: event.id,
                    amount_cents: 35000,
                  },
                });

                // Activation du compte (idempotent : ne rétrograde jamais un compte déjà activé).
                await supabase
                  .from("contractors")
                  .update({ account_status: "active", activation_status: "activated" })
                  .eq("id", creditContractorId)
                  .neq("activation_status", "activated");

                // Notification admin interne (aucun SMS/courriel automatique).
                await supabase.from("admin_notifications").insert({
                  type: "fallback_credit_350_paid",
                  severity: "info",
                  contractor_id: creditContractorId,
                  title: "Crédit UNPRO 350 $ payé",
                  body: "Un entrepreneur a sécurisé sa présence (crédit de 350 $ ajouté).",
                  payload_json: {
                    stripe_session_id: session.id,
                    ref: session.metadata?.ref ?? null,
                    quote_id: session.metadata?.quote_id ?? null,
                  },
                });

                await supabase.from("contractor_funnel_events").insert({
                  contractor_id: creditContractorId,
                  event_type: "fallback_350_payment_success",
                  metadata: {
                    stripe_session_id: session.id,
                    amount_cents: 35000,
                    quote_id: session.metadata?.quote_id ?? null,
                  },
                });

                // Clôture du lead d'abandon lié au devis (sans doublon).
                if (session.metadata?.quote_id) {
                  await supabase
                    .from("contractor_leads")
                    .update({
                      lead_status: "fallback_350_paid",
                      payment_status: "paid",
                      paid_at: new Date().toISOString(),
                      next_follow_up_at: null,
                    })
                    .eq("metadata_json->>quote_id", String(session.metadata.quote_id));
                }
              }
            }
          }
        }

        // HOMEOWNER PLANS: activate entitlements immediately after payment.
        // Idempotent — replaying the event just re-affirms the active row.
        if (session.metadata?.plan_type === "homeowner") {
          const hoUserId = session.metadata?.user_id ?? null;
          const hoPlanCode = session.metadata?.plan_code ?? null;
          const stripeSubId = session.subscription ? String(session.subscription) : null;

          if (hoUserId && hoPlanCode) {
            let periodStart: string | null = null;
            let periodEnd: string | null = null;
            if (stripeSubId) {
              try {
                const s = await stripe.subscriptions.retrieve(stripeSubId);
                const p = getSubscriptionPeriod(s as Stripe.Subscription);
                periodStart = p.start;
                periodEnd = p.end;
              } catch (e) {
                console.error("[stripe-webhook] homeowner subscription fetch failed", e);
              }
            }

            const patch = {
              user_id: hoUserId,
              plan_code: hoPlanCode,
              status: "active",
              stripe_customer_id: session.customer ? String(session.customer) : null,
              stripe_subscription_id: stripeSubId,
              stripe_checkout_session_id: session.id,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            };

            const { data: existingHo } = await supabase
              .from("homeowner_subscriptions")
              .select("id")
              .eq("user_id", hoUserId)
              .eq("plan_code", hoPlanCode)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (existingHo?.id) {
              await supabase.from("homeowner_subscriptions").update(patch).eq("id", existingHo.id);
            } else {
              await supabase.from("homeowner_subscriptions").insert(patch);
            }

            // Any other homeowner plan for this user is superseded.
            await supabase
              .from("homeowner_subscriptions")
              .update({ status: "canceled", updated_at: new Date().toISOString() })
              .eq("user_id", hoUserId)
              .neq("plan_code", hoPlanCode)
              .in("status", ["active", "trialing", "pending"]);

            console.log("[stripe-webhook] homeowner plan activated", hoUserId, hoPlanCode);
          } else {
            console.warn("[stripe-webhook] homeowner checkout without user_id metadata", session.id);
          }
        }


        // SMS OUTREACH flow: /invitation/:token → 1$ activation
        // Idempotent + transactional: creates contractor + contractor_profiles,
        // links prospect, and marks recommendable. Safe to replay any # of times.
        if (session.metadata?.source === "sms_outreach" && session.metadata?.landing_token) {
          const landingToken = session.metadata.landing_token as string;
          try {
            // Idempotency guard: if any prospect already has this session_id, short-circuit.
            const { data: alreadyProcessed } = await supabase
              .from("prospects")
              .select("id, contractor_id, activation_paid_at")
              .eq("stripe_session_id", session.id)
              .maybeSingle();
            if (alreadyProcessed?.activation_paid_at && alreadyProcessed.contractor_id) {
              console.log("[stripe-webhook] sms_outreach idempotent skip", session.id);
              break;
            }

            const { data: prospect } = await supabase
              .from("prospects")
              .select("id, business_name, main_city, region_name, service, domaine, telephone, email, campaign_id, contractor_id, prenom, nom")
              .eq("landing_token", landingToken)
              .maybeSingle();

            if (!prospect) {
              console.error("[stripe-webhook] sms_outreach prospect not found", landingToken);
              break;
            }

            const paidAtIso = new Date().toISOString();
            const category = (prospect.service || prospect.domaine || null) as string | null;

            // Step 1 — ensure contractors row (idempotent, look up by prospect.contractor_id first)
            let cId: string | null = (prospect.contractor_id as string) || null;
            if (cId) {
              // Sanity: verify row still exists
              const { data: existing } = await supabase
                .from("contractors").select("id").eq("id", cId).maybeSingle();
              if (!existing) cId = null;
            }
            if (!cId) {
              // Try match by normalized phone/email to avoid dup
              if (prospect.telephone) {
                const { data: byPhone } = await supabase
                  .from("contractors").select("id").eq("phone", prospect.telephone).limit(1).maybeSingle();
                if (byPhone?.id) cId = byPhone.id as string;
              }
              if (!cId && prospect.email) {
                const { data: byEmail } = await supabase
                  .from("contractors").select("id").eq("email", prospect.email).limit(1).maybeSingle();
                if (byEmail?.id) cId = byEmail.id as string;
              }
            }
            if (!cId) {
              // Create unclaimed contractor row. user_id is a placeholder until the
              // prospect signs up — reconciliation matches on prospects.contractor_id.
              const placeholderUserId = crypto.randomUUID();
              const { data: created, error: insertErr } = await supabase
                .from("contractors")
                .insert({
                  user_id: placeholderUserId,
                  business_name: prospect.business_name ?? "Entreprise à activer",
                  city: prospect.main_city ?? null,
                  province: "QC",
                  phone: prospect.telephone ?? null,
                  email: prospect.email ?? null,
                  specialty: category,
                  account_status: "active",
                  activation_status: "activated",
                  onboarding_status: "sms_outreach_paid",
                } as never)
                .select("id")
                .maybeSingle();
              if (insertErr) {
                console.error("[stripe-webhook] contractor insert failed", insertErr.message, insertErr.details);
              }
              cId = (created?.id as string) ?? null;
            } else {
              // Refresh core fields on existing contractor (never overwrite non-null business_name blindly)
              await supabase.from("contractors").update({
                phone: prospect.telephone ?? undefined,
                email: prospect.email ?? undefined,
                city: prospect.main_city ?? undefined,
                specialty: category ?? undefined,
                account_status: "active",
                activation_status: "activated",
                onboarding_status: "sms_outreach_paid",
                updated_at: paidAtIso,
              } as never).eq("id", cId);
            }

            // Step 2 — ensure contractor_profiles row (unique on contractor_id)
            if (cId) {
              const { data: profile } = await supabase
                .from("contractor_profiles").select("id").eq("contractor_id", cId).maybeSingle();
              if (!profile) {
                const { error: profErr } = await supabase.from("contractor_profiles").insert({
                  contractor_id: cId,
                  business_name: prospect.business_name ?? null,
                  primary_category: category,
                  is_public: false,
                } as never);
                if (profErr) console.error("[stripe-webhook] contractor_profile insert failed", profErr.message);
              }
            }

            // Step 3 — compute recommendable
            const validContact = !!(prospect.telephone || prospect.email);
            const recommendable =
              !!cId &&
              !!prospect.business_name &&
              !!category &&
              validContact &&
              !!prospect.main_city;

            // Step 4 — link prospect + write idempotency key
            await supabase.from("prospects").update({
              funnel_status: recommendable ? "activated" : "paid_1_dollar",
              activation_paid_at: paidAtIso,
              recommendable,
              contractor_id: cId,
              stripe_session_id: session.id,
              stripe_customer_id: (session.customer as string) || null,
            }).eq("id", prospect.id);

            // Step 5 — ledger (best-effort)
            if (cId) {
              await supabase.from("contractor_activation_ledger").insert({
                contractor_id: cId,
                action: "paid",
                source: "sms_outreach",
                metadata: {
                  prospect_id: prospect.id,
                  amount_paid: session.amount_total ?? 100,
                  currency: session.currency ?? "cad",
                  stripe_session_id: session.id,
                  paid_at: paidAtIso,
                  landing_token: landingToken,
                },
              } as never).then(() => {}, () => {});
            }

            await supabase.from("prospect_status_transitions").insert({
              prospect_id: prospect.id,
              contractor_id: cId,
              campaign_id: prospect.campaign_id,
              previous_status: "checkout_started",
              new_status: recommendable ? "recommendable" : "paid_1_dollar",
              source: "stripe_webhook",
              metadata: { session_id: session.id, landing_token: landingToken },
            } as never).then(() => {}, () => {});

            // Step 6 — trigger match recomputation (idempotent, best-effort)
            if (cId && recommendable) {
              supabase.functions.invoke("match-waiting-demand", { body: { contractor_id: cId } })
                .catch((e) => console.warn("[match-waiting-demand] sms_outreach failed", e));
            }
          } catch (e) {
            console.error("[stripe-webhook] sms_outreach activation failed", (e as Error).message);
          }
          break;
        }

        // ENTRY PACK 350 $ flow (create-activation-checkout): the live acquisition
        // pool is verified_contractor_prospects. Without this branch a real
        // payment is invisible to the cockpit. "activation_7d" is the legacy 1 $
        // offer, kept only so in-flight sessions still reconcile.
        if (
          (session.metadata?.activation_token && session.metadata?.offer !== "entry_activation_350") ||
          session.metadata?.offer === "entry_pack_350" ||
          session.metadata?.offer_kind === "pack_350" ||
          session.metadata?.offer === "activation_7d"
        ) {
          const activationToken = session.metadata?.activation_token || null;
          const vProspectId = session.metadata?.prospect_id || null;
          let activatedContractorId: string | null = null;

          // GUARD — never activate or emit payment_completed/contractor_activated
          // on an unpaid session (async payment methods complete later).
          const paidVerified =
            session.payment_status === "paid" ||
            session.payment_status === "no_payment_required";
          if (!paidVerified) {
            await supabase.from("stripe_webhook_events").update({
              processing_status: "ignored_unpaid",
            }).eq("stripe_event_id", event.id);
            console.log("[stripe-webhook] entry_pack session not paid yet", session.id, session.payment_status);
            break;
          }
          // Pack 350 $ : seul un paiement LIVE exact (35 000 ¢ CAD hors taxes)
          // crée ou active un compte. TEST ou montant inattendu = aucune activation.
          if (session.metadata?.offer === "entry_pack_350") {
            const block = entryPackBlockReason({
              livemode: event.livemode,
              amountSubtotal: session.amount_subtotal,
              currency: session.currency,
            });
            if (block) {
              await supabase.from("stripe_webhook_events").update({ processing_status: block }).eq("stripe_event_id", event.id);
              await supabase.from("admin_notifications").insert({
                type: `entry_pack_350_${block}`,
                severity: block === "ignored_amount_mismatch" ? "critical" : "warning",
                title: block === "ignored_amount_mismatch"
                  ? "Pack 350 $ : montant inattendu — activation bloquée"
                  : "Pack 350 $ TEST — aucune activation",
                body: "Aucun compte ni droit n'a été créé.",
                payload_json: { stripe_session_id: session.id, stripe_event_id: event.id, livemode: event.livemode ?? null, amount_subtotal: session.amount_subtotal, currency: session.currency },
              });
              break;
            }
          }

          let entryPackFatal: Error | null = null;
          try {

            // 1 — close the checkout session record (cockpit truth).
            await supabase
              .from("billing_checkout_sessions")
              .update({
                checkout_status: "complete",
                payment_status: "paid",
                stripe_customer_id: (session.customer as string) || null,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_checkout_session_id", session.id);

            // 2 — mark the prospect paid.
            let prospect: any = null;
            if (vProspectId) {
              const { data: p, error: pErr } = await supabase
                .from("verified_contractor_prospects")
                .select("id, business_name, legal_name, city, category, email, phone_e164, website_url")
                .eq("id", vProspectId)
                .maybeSingle();
              if (pErr) console.error("[stripe-webhook] prospect fetch failed", pErr.message);
              prospect = p ?? null;
              const { error: upErr } = await supabase
                .from("verified_contractor_prospects")
                // 'activated' is the terminal value allowed by the table CHECK.
                .update({ outreach_status: "activated" })
                .eq("id", vProspectId);
              if (upErr) console.error("[stripe-webhook] prospect status update failed", upErr.message);
            }

            // 2b — Founder guest checkout (pro-founder-checkout-guest) uses the
            // founder_score_prospects pool. Without this fallback a real 350 $
            // payment never creates a contractor.
            if (!prospect && vProspectId) {
              const { data: fp } = await supabase
                .from("founder_score_prospects")
                .select("id, company, city, trade, email, phone, website")
                .eq("id", vProspectId)
                .maybeSingle();
              if (fp) {
                prospect = {
                  id: fp.id,
                  business_name: fp.company,
                  legal_name: fp.company,
                  city: fp.city,
                  category: fp.trade,
                  email: fp.email,
                  phone_e164: fp.phone,
                  website_url: fp.website,
                };
                await supabase
                  .from("founder_score_prospects")
                  .update({ status: "paid", paid_at: new Date().toISOString(), stripe_session_id: session.id })
                  .eq("id", fp.id);
              }
            }

            // 2c — Guest checkout without any prospect: rely on Stripe identity.
            if (!prospect && session.customer_details?.email) {
              prospect = {
                id: null,
                business_name: session.customer_details?.name ?? session.customer_details.email,
                legal_name: null,
                city: null,
                category: null,
                email: session.customer_details.email,
                phone_e164: session.customer_details?.phone ?? null,
                website_url: null,
              };
            }



            // 3 — create/activate the contractor account (idempotent).
            if (prospect) {
              const phone = prospect.phone_e164 ?? null;
              const email = prospect.email ?? session.customer_details?.email ?? null;
              let existing: { id: string } | null = null;
              if (phone) {
                const { data } = await supabase
                  .from("contractors").select("id").eq("phone", phone).limit(1).maybeSingle();
                existing = (data as any) ?? null;
              }
              if (!existing && email) {
                const { data } = await supabase
                  .from("contractors").select("id").eq("email", email).limit(1).maybeSingle();
                existing = (data as any) ?? null;
              }
              if (!existing) {
                // contractors.user_id is NOT NULL — provision (or reuse) the auth
                // account for the payer before creating the contractor record.
                let ownerUserId: string | null = null;
                if (email) {
                  const { data: createdUser, error: userErr } =
                    await supabase.auth.admin.createUser({
                      email,
                      email_confirm: true,
                      user_metadata: {
                        business_name: prospect.business_name ?? null,
                        source: "stripe_entry_pack_350",
                      },
                    });
                  if (createdUser?.user?.id) {
                    ownerUserId = createdUser.user.id;
                  } else {
                    // Already registered — look the account up by email.
                    console.warn("[stripe-webhook] createUser fallback", userErr?.message);
                    const { data: list } = await supabase
                      .from("profiles").select("user_id").eq("email", email).limit(1).maybeSingle();
                    ownerUserId = (list as any)?.user_id ?? null;
                  }
                }
                if (!ownerUserId) {
                  console.error("[stripe-webhook] cannot provision contractor: no owner user", { email });
                } else {
                  await supabase.from("user_roles")
                    .upsert({ user_id: ownerUserId, role: "contractor" }, { onConflict: "user_id,role" });
                  const { data: created, error: createErr } = await supabase
                    .from("contractors")
                    .insert({
                      user_id: ownerUserId,
                      business_name: prospect.business_name ?? prospect.legal_name ?? "Entrepreneur UNPRO",
                      specialty: prospect.category ?? null,
                      city: prospect.city ?? null,
                      province: "QC",
                      phone,
                      email,
                      website: prospect.website_url ?? null,
                      verification_status: "pending",
                      account_status: "active",
                      activation_status: "active",
                      onboarding_status: "payment_completed",
                      // Paid != verified: private until RBQ/identity review.
                      is_published: false,
                      is_discoverable: false,
                    })
                    .select("id")
                    .maybeSingle();
                  if (createErr) {
                    console.error("[stripe-webhook] activation contractor insert failed", createErr.message);
                  } else {
                    existing = (created as any) ?? null;
                  }
                }
              } else {
                await supabase.from("contractors").update({
                  account_status: "active",
                  activation_status: "active",
                  onboarding_status: "payment_completed",
                  // Publication flags untouched: payment never publishes.
                  updated_at: new Date().toISOString(),
                }).eq("id", existing.id);
              }
              activatedContractorId = existing?.id ?? null;

              if (activatedContractorId) {
                await supabase
                  .from("billing_checkout_sessions")
                  .update({ contractor_id: activatedContractorId })
                  .eq("stripe_checkout_session_id", session.id);
// Entry 350 = one-time: activate_contractor_unified would publish the
                // profile, so the prospect is marked paid directly instead.
                if (session.metadata?.offer === "entry_pack_350") {
                  await supabase.from("contractor_prospects")
                    .update({ activation_status: "activated", payment_status: "paid" })
                    .eq("contractor_id", activatedContractorId);
                } else {
                                await supabase.rpc("activate_contractor_unified", {
                  p_contractor_id: activatedContractorId,
                  p_source: "stripe_entry_pack_350",
                  // A one-time entry is not a perpetual paid subscription.
                  // Its time-bound access comes only from the verified ledger.
                  p_plan_id: session.metadata?.offer === "entry_pack_350"
                    ? null : session.metadata?.plan_code || "entry_pack_350",
                  p_actor: null,
                  p_metadata: {
                    checkout_session_id: session.id,
                    activation_token: activationToken,
                    prospect_id: vProspectId,
                  },
                }).then(() => {}, (e: unknown) =>
                  console.warn("[stripe-webhook] activate_contractor_unified soft-fail", String(e)));
                }
                // Reçu canonique des 12 mois de Présence IA (même registre que le
                // parcours plan personnalisé). Index unique par session : une
                // relivraison n'ajoute rien et ne prolonge jamais la période.
                if (session.metadata?.offer === "entry_pack_350" && event.livemode === true) {
                  const { error: ledErr } = await supabase.from("contractor_activation_ledger").insert({
                    contractor_id: activatedContractorId,
                    action: "entry_activation_350_paid",
                    source: "stripe_webhook",
                    after_state: { activation_status: "active", presence_ia_months: 12 },
                    metadata: {
                      stripe_session_id: session.id,
                      stripe_event_id: event.id,
                      stripe_payment_intent: session.payment_intent ? String(session.payment_intent) : null,
                      amount_cents: session.amount_total ?? null,
                      livemode: true,
                      offer: "entry_pack_350",
                      prospect_id: vProspectId,
                      ref: session.metadata?.ref ?? null,
                    },
                  });
                  if (ledErr && !/duplicate key|uq_ledger_entry350_session/i.test(ledErr.message)) {
                    entryPackFatal = new Error(`entry_pack_350 ledger: ${ledErr.message}`);
                  }
                }
              } else if (session.metadata?.offer === "entry_pack_350" && event.livemode === true) {
                entryPackFatal = new Error("entry_pack_350 paid but no contractor could be provisioned");
              }
            }

            await supabase.from("unpro_payment_activation_audit").insert({
              contractor_id: activatedContractorId,
              prospect_id: vProspectId,
              stripe_event_id: event.id,
              checkout_session_id: session.id,
              payment_intent_id: (session.payment_intent as string) || null,
              action: "entry_pack_activation",
              result: "success",
              new_status: "activated",
              amount_cents: session.amount_total ?? null,
              currency: session.currency ?? "cad",
              metadata: {
                activation_token: activationToken,
                source: session.metadata?.source ?? null,
                slug: session.metadata?.prospect_slug ?? null,
                contractor_id: activatedContractorId,
                ...aiAttribution,
              },
            });

            // Keep the webhook audit row attribution-complete for AI revenue proof.
            await supabase.from("stripe_webhook_events").update({
              contractor_id: activatedContractorId,
              prospect_id: vProspectId,
              payment_intent_id: (session.payment_intent as string) || null,
              attribution: {
                ...aiAttribution,
                contractor_id: activatedContractorId,
                prospect_id: vProspectId,
                amount_cents: session.amount_total ?? null,
                currency: session.currency ?? "cad",
              },
            }).eq("stripe_event_id", event.id);

            // AFFILIATE ATTRIBUTION — canonical economics: direct 20% of the
            // PRE-TAX base ($70 on $350), 5% parent override ($17.50) cascades
            // via the affiliate_apply_subaffiliate_override trigger. Resolves
            // the affiliate from metadata ref, prospect lock, assignment, or
            // confirmed attribution. No affiliate → clean no-op. Idempotent
            // per Stripe session. Never blocks activation.
            try {
              const pretaxCents =
                (session.amount_subtotal as number | null) ??
                (session.amount_total as number | null) ??
                35000;
              const affRes = await supabase.rpc("record_affiliate_payment_conversion", {
                p_prospect_id: vProspectId,
                p_contractor_id: activatedContractorId,
                p_user_id: null,
                p_amount_pretax_cents: pretaxCents,
                p_stripe_session_id: session.id,
                p_affiliate_id: (session.metadata?.affiliate_id as string) || null,
                p_referral_code: (session.metadata?.ref as string) || null,
                p_metadata: {
                  offer_code: session.metadata?.offer_code ?? null,
                  acquisition_origin: session.metadata?.acquisition_origin ?? null,
                  agent_run_id: session.metadata?.agent_run_id ?? null,
                },
              });
              if ((affRes.data as any)?.recorded) {
                console.log("[stripe-webhook] affiliate conversion recorded", affRes.data);
              }
            } catch (e) {
              console.warn("[stripe-webhook] affiliate conversion soft-fail", String(e));
            }

            // Canonical funnel event. v_activation_funnel counts event_type='paid',
            // so this MUST be 'paid' — 'payment_succeeded' was invisible to the cockpit.
            await supabase.rpc("record_engagement_event", {
              _event_type: "paid",
              _channel: "web",
              _status: "paid",
              _provider: "stripe",
              _prospect_id: vProspectId,
              _contractor_id: activatedContractorId,
              _tracking_id: activationToken,
              _source_table: "billing_checkout_sessions",
              _source_row_id: session.id,
              _metadata: {
                amount_cents: session.amount_total ?? null,
                campaign_id: session.metadata?.campaign_id ?? null,
                activation_token: activationToken,
                contractor_id: activatedContractorId,
              },
              _idempotency_key: `paid:${session.id}`,
            });

            // Canonical golden-path steps 4/5 and 5/5. Kept alongside 'paid'
            // (legacy cockpit) so the invited-contractor funnel is coherent:
            // activation_page_viewed -> activation_cta_clicked ->
            // stripe_checkout_created -> payment_completed -> contractor_activated.
            {
              const trackingId =
                activationToken || (session.metadata?.landing_token as string) || null;
              const evtBase = {
                _channel: "web",
                _status: "paid",
                _provider: "stripe",
                _prospect_id: vProspectId,
                _contractor_id: activatedContractorId,
                _tracking_id: trackingId,
                _source_table: "billing_checkout_sessions",
                _source_row_id: session.id,
                _metadata: {
                  amount_cents: session.amount_total ?? null,
                  offer_code: session.metadata?.offer_code ?? null,
                  activation_token: activationToken,
                  landing_token: session.metadata?.landing_token ?? null,
                  contractor_id: activatedContractorId,
                  ...aiAttribution,
                },

              };
              await supabase.rpc("record_engagement_event", {
                ...evtBase,
                _event_type: "payment_completed",
                _idempotency_key: `payment_completed:${session.id}`,
              }).then(() => {}, () => {});
              if (activatedContractorId) {
                await supabase.rpc("record_engagement_event", {
                  ...evtBase,
                  _event_type: "contractor_activated",
                  _idempotency_key: `contractor_activated:${session.id}`,
                }).then(() => {}, () => {});
              }
            }

            console.log("[stripe-webhook] entry pack activation recorded", {
              prospect_id: vProspectId,
              contractor_id: activatedContractorId,
              session: session.id,
            });
          } catch (e) {
            console.error("[stripe-webhook] entry_pack_350 handling failed", (e as Error).message);
          }
          // A LIVE paid 350 $ without its entitlement receipt must be retried, not marked processed.
          if (entryPackFatal) throw entryPackFatal;
          break;
        }



        // ACQUISITION PIPELINE flow: prospect-driven checkout (acq-create-checkout)
        if (session.metadata?.source === "acquisition_pipeline" && session.metadata?.prospect_id) {
          const prospectId = session.metadata.prospect_id;
          const acqPlanId = session.metadata.plan_id;
          try {
            const sub = session.subscription ? await stripe.subscriptions.retrieve(session.subscription as string) : null;
            await supabase.from("contractor_prospects").update({
              payment_status: "paid",
              activation_status: "active",
              onboarding_status: "completed",
              selected_plan: acqPlanId,
              stripe_customer_id: (session.customer as string) || null,
              stripe_subscription_id: sub?.id || null,
              blocked_reason: null,
              updated_at: new Date().toISOString(),
            }).eq("id", prospectId);
            await supabase.from("acquisition_pipeline_logs").insert({
              prospect_id: prospectId, step: "stripe_webhook.activation", status: "success",
              message: `Activé via plan ${acqPlanId}`,
              metadata: { session_id: session.id, subscription_id: sub?.id, amount: session.amount_total },
            });
            // Demand Intelligence — try to match newly active contractor (best-effort).
            // contractor_prospects.id is not always the canonical contractors.id; we still ping
            // match-waiting-demand which is idempotent and no-ops on missing contractors.
            await supabase.functions.invoke("match-waiting-demand", {
              body: { contractor_id: prospectId },
            }).catch((e) => console.warn("[match-waiting-demand] prospect branch failed", e));
          } catch (e) {
            await supabase.from("acquisition_pipeline_logs").insert({
              prospect_id: prospectId, step: "stripe_webhook.activation", status: "error", message: String(e), metadata: { session_id: session.id },
            });
          }
          break;
        }


        // ACQ flow: acquisition pipeline (acq_subscriptions / acq_contractors)
        if (contractorId && planCode && !planId) {
          const couponCode = session.metadata?.coupon_code || null;
          const isTrialOffer = session.metadata?.is_trial_offer === "1";
          const slotCity = session.metadata?.slot_city || null;
          const slotTrade = session.metadata?.slot_trade || null;

          // Retrieve payment method from PaymentIntent (saved via setup_future_usage)
          let paymentMethodId: string | null = null;
          let customerId: string | null = (session.customer as string) || null;
          try {
            if (session.payment_intent) {
              const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
              paymentMethodId = (pi.payment_method as string) || null;
              if (!customerId && pi.customer) customerId = pi.customer as string;
            }
          } catch (e) { console.warn("[acq] pi retrieve failed", e); }

          const trialStart = new Date();
          const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 3600 * 1000);

          await supabase
            .from("acq_subscriptions")
            .update({
              status: isTrialOffer ? "trial_active" : "active",
              stripe_session_id: session.id,
              stripe_customer_id: customerId,
              stripe_payment_method_id: paymentMethodId,
              payment_method_on_file: !!paymentMethodId,
              trial_started_at: isTrialOffer ? trialStart.toISOString() : null,
              trial_ends_at: isTrialOffer ? trialEnd.toISOString() : null,
              activated_at: new Date().toISOString(),
              amount_paid: (session.amount_total || 0) / 100,
            })
            .eq("stripe_session_id", session.id);

          await supabase
            .from("acq_contractors")
            .update({ status: "active" })
            .eq("id", contractorId);

          // Demand Intelligence — match waiting homeowners to the freshly activated contractor.
          await supabase.functions.invoke("match-waiting-demand", {
            body: { contractor_id: contractorId },
          }).catch((e) => console.warn("[match-waiting-demand] acq branch failed", e));

          // Increment territory slot
          if (slotCity && slotTrade) {
            await supabase.rpc("acq_increment_slot", { p_city: slotCity, p_trade: slotTrade });
          }

          // Trigger day_0 follow-up
          await supabase.functions.invoke("acq-followup-send", {
            body: { contractor_id: contractorId, sequence_code: "day_0" }
          }).catch(() => {});

          if (couponCode) {
            const { data: coupon } = await supabase
              .from("acq_coupons")
              .select("id, redemptions_count")
              .eq("code", couponCode)
              .maybeSingle();
            if (coupon) {
              await supabase.from("acq_coupon_redemptions").insert({
                contractor_id: contractorId,
                coupon_id: coupon.id,
                code: couponCode,
                stripe_session_id: session.id,
                amount_charged: (session.amount_total || 0) / 100,
              });
              await supabase
                .from("acq_coupons")
                .update({ redemptions_count: (coupon.redemptions_count || 0) + 1 })
                .eq("id", coupon.id);
            }
          }

          await supabase.from("acq_payment_events").insert({
            contractor_id: contractorId,
            event_type: "checkout.session.completed",
            stripe_event_id: event.id,
            payload: session as any,
          });
          break;
        }

        if (!contractorId || !planId) break;

        // GUARD — l'activation payée dépend UNIQUEMENT d'un paiement confirmé
        // par Stripe. Une session complétée mais non payée (paiement asynchrone)
        // n'active rien : l'événement suivant (async_payment_succeeded /
        // invoice.paid) reprendra le relais.
        {
          const paidVerified =
            session.payment_status === "paid" ||
            session.payment_status === "no_payment_required";
          if (!paidVerified) {
            await supabase.from("stripe_webhook_events").update({
              processing_status: "ignored_unpaid",
            }).eq("stripe_event_id", event.id);
            console.log("[stripe-webhook] plan session not paid yet", session.id, session.payment_status);
            break;
          }
        }

        const subscription = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription as string)
          : null;

        // Update checkout_sessions
        await supabase
          .from("checkout_sessions")
          .update({
            checkout_status: "paid",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription?.id || null,
            currency: session.currency?.toUpperCase() || "CAD",
          })
          .eq("external_checkout_id", session.id);

        // Upsert contractor_subscriptions
        if (subscription) {
          const period = getSubscriptionPeriod(subscription);
          await supabase.from("contractor_subscriptions").upsert(
            {
              contractor_id: contractorId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscription.id,
              plan_id: planId,
              billing_interval: billingInterval,
              status: subscription.status,
              // Vérité de paiement issue de Stripe uniquement.
              payment_status:
                session.payment_status === "paid" ? "paid" : session.payment_status || "unpaid",
              amount_paid_cents: session.amount_total ?? 0,
              currency: (session.currency || "cad").toUpperCase(),
              ...(session.metadata?.quote_id ? { quote_id: session.metadata.quote_id } : {}),
              current_period_start: period.start,
              current_period_end: period.end,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "contractor_id" }
          );
        }

        // Activate contractor (PATCH A — use real columns; fail loudly on error)
        const nowIso = new Date().toISOString();

        // Load existing contractor to compute slug fallback if missing
        const { data: existingContractor } = await supabase
          .from("contractors")
          .select("slug, business_name, legal_name, email")
          .eq("id", contractorId)
          .maybeSingle();

        const slugify = (s: string) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 80);

        const activationPatch: Record<string, unknown> = {
          account_status: "active",
          activation_status: "active",
          onboarding_status: "completed",
          is_published: true,
          is_discoverable: true,
          is_accepting_appointments: true,
          booking_enabled: true,
          booking_page_published: true,
          published_at: nowIso,
          updated_at: nowIso,
        };

        const attributedProspectId = session.metadata?.prospect_id || null;

        if (!existingContractor?.slug) {
          const seed =
            (existingContractor as any)?.business_name ||
            (existingContractor as any)?.legal_name ||
            (existingContractor as any)?.email ||
            contractorId;
          const base = slugify(String(seed)) || "pro";
          activationPatch.slug = `${base}-${contractorId.slice(0, 8)}`;
        }

        const { error: activateErr } = await supabase
          .from("contractors")
          .update(activationPatch)
          .eq("id", contractorId);

        if (activateErr) {
          console.error("[stripe-webhook] CRITICAL: contractor activation failed", {
            contractorId,
            planId,
            error: activateErr,
          });
          await supabase.from("integration_audit_logs").insert({
            integration_name: "stripe",
            action_name: `${event.id}.activation_failed`,
            status: "error",
            payload: { contractor_id: contractorId, plan_id: planId, error: activateErr.message },
          });
          throw new Error(`Contractor activation failed: ${activateErr.message}`);
        }

        if (attributedProspectId) {
          await supabase
            .from("verified_contractor_prospects")
            .update({ outreach_status: "activated", last_action_at: nowIso })
            .eq("id", attributedProspectId);
        }

        // DEVIS — le plan personnalisé payé passe à l'état « payé » (source de
        // vérité du parcours, idempotent : rejouer l'événement ne change rien).
        {
          const quoteId = session.metadata?.quote_id || null;
          if (quoteId) {
            const { error: quoteErr } = await supabase
              .from("contractor_pricing_quotes")
              .update({ pricing_status: "paid", updated_at: nowIso })
              .eq("id", quoteId);
            // Filet : un devis payé n'est jamais orphelin (jamais réassigné).
            const metaContractor = session.metadata?.contractor_id || null;
            if (metaContractor) {
              await supabase
                .from("contractor_pricing_quotes")
                .update({ contractor_id: metaContractor })
                .eq("id", quoteId)
                .is("contractor_id", null);
            }
            if (quoteErr) {
              console.error("[stripe-webhook] quote paid update failed", quoteErr.message);
            }
            // Converti : toute relance ouverte se ferme, plus aucune alerte.
            try {
              await supabase.functions.invoke("contractor-relance-abandon", {
                body: { action: "close", quote_id: quoteId },
              });
            } catch (e) {
              console.warn("[stripe-webhook] relance close soft-fail", String(e));
            }
          }
        }

        // ATTRIBUTION AFFILIÉE — même procédure canonique que l'offre 350 $ :
        // l'affiliée est résolue à partir des metadata de la session (code
        // vérifié côté serveur avant le checkout). Aucune affiliée → no-op
        // propre. Idempotent par session Stripe. Ne bloque jamais l'activation.
        try {
          const pretaxCents =
            (session.amount_subtotal as number | null) ??
            (session.amount_total as number | null) ??
            0;
          const affRes = await supabase.rpc("record_affiliate_payment_conversion", {
            p_prospect_id: session.metadata?.prospect_id || null,
            p_contractor_id: contractorId,
            p_user_id: null,
            p_amount_pretax_cents: pretaxCents,
            p_stripe_session_id: session.id,
            p_affiliate_id: (session.metadata?.affiliate_id as string) || null,
            p_referral_code: (session.metadata?.ref as string) || null,
            p_metadata: {
              plan_id: planId,
              quote_id: session.metadata?.quote_id ?? null,
              billing_interval: billingInterval,
            },
          });
          if ((affRes.data as any)?.recorded) {
            console.log("[stripe-webhook] affiliate conversion recorded (plan)", affRes.data);
          }
        } catch (e) {
          console.warn("[stripe-webhook] affiliate conversion soft-fail (plan)", String(e));
        }

        // TUNNEL — paiement confirmé + compte activé écrits côté serveur :
        // l'autorité est l'événement Stripe, pas le retour du navigateur.
        try {
          await supabase.from("contractor_funnel_events").upsert([
            {
              dedupe_key: `payment_completed:${session.id}`,
              event_type: "payment_completed",
              step: "payment_succeeded",
              event_source: "stripe",
              source: "stripe",
              contractor_id: contractorId,
              prospect_id: attributedProspectId,
              affiliate_code: (session.metadata?.ref as string) || null,
              metadata: {
                funnel_step: "payment_succeeded",
                plan_id: planId,
                quote_id: session.metadata?.quote_id ?? null,
                amount_total: session.amount_total,
                currency: session.currency,
                stripe_session_id: session.id,
              },
            },
            {
              dedupe_key: `profile_activated:${session.id}`,
              event_type: "profile_activated",
              step: "account_activated",
              event_source: "stripe",
              source: "stripe",
              contractor_id: contractorId,
              prospect_id: attributedProspectId,
              affiliate_code: (session.metadata?.ref as string) || null,
              metadata: {
                funnel_step: "account_activated",
                plan_id: planId,
                stripe_session_id: session.id,
              },
            },
          ], { onConflict: "dedupe_key", ignoreDuplicates: true });
        } catch (e) {
          console.warn("[stripe-webhook] funnel events (plan) soft-fail", String(e));
        }

        // Mirror plan on contractor_subscriptions already handled above.

        // Demand Intelligence — match waiting homeowners to the freshly activated contractor.
        await supabase.functions.invoke("match-waiting-demand", {
          body: { contractor_id: contractorId },
        }).catch((e) => console.warn("[match-waiting-demand] contractors branch failed", e));

        // Consume promo redemption
        if (redemptionId) {
          await supabase
            .from("promo_code_redemptions")
            .update({ status: "consumed" })
            .eq("id", redemptionId)
            .eq("status", "reserved");
        }

        // Welcome email (fr-CA) — fire-and-forget
        try {
          const { data: contractor } = await supabase
            .from("contractors")
            .select("business_name, owner_name, email")
            .eq("id", contractorId)
            .maybeSingle();
          const recipient = (contractor as any)?.email || session.customer_email || session.customer_details?.email;
          if (recipient) {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "entrepreneur-welcome",
                recipientEmail: recipient,
                idempotencyKey: `welcome-${contractorId}-${session.id}`,
                templateData: {
                  businessName: (contractor as any)?.business_name || null,
                  ownerName: (contractor as any)?.owner_name || null,
                },
              },
            });
          }
        } catch (e) {
          console.warn("[stripe-webhook] welcome email failed", e);
        }

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const redemptionId = session.metadata?.redemption_id;

        // Mark checkout as expired
        await supabase
          .from("checkout_sessions")
          .update({ checkout_status: "expired" })
          .eq("external_checkout_id", session.id);

        // Reverse promo reservation so user can try again
        if (redemptionId) {
          await supabase
            .from("promo_code_redemptions")
            .update({ status: "reversed" })
            .eq("id", redemptionId)
            .eq("status", "reserved");
        }

        // Signal d'abandon prioritaire : session créée puis expirée sans paiement.
        try {
          const quoteId = session.metadata?.quote_id;
          if (quoteId) {
            await supabase.functions.invoke("contractor-relance-abandon", {
              body: { quote_id: quoteId },
            });
          }
        } catch (e) {
          console.warn("[stripe-webhook] relance trigger soft-fail", String(e));
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        const planId = subscription.metadata?.plan_id;
        const billingInterval = subscription.metadata?.billing_interval;

        const period = getSubscriptionPeriod(subscription);
        const updateData: Record<string, unknown> = {
          status: subscription.status,
          current_period_start: period.start,
          current_period_end: period.end,
          updated_at: new Date().toISOString(),
        };
        if (planId) updateData.plan_id = planId;
        if (billingInterval) updateData.billing_interval = billingInterval;

        await supabase
          .from("contractor_subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subId);

        // Ensure contractor is active
        const { data: sub } = await supabase
          .from("contractor_subscriptions")
          .select("contractor_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (sub?.contractor_id) {
          const nowIso2 = new Date().toISOString();
          await supabase
            .from("contractors")
            .update({
              account_status: "active",
              activation_status: "active",
              is_published: true,
              is_discoverable: true,
              is_accepting_appointments: true,
              updated_at: nowIso2,
            })
            .eq("id", sub.contractor_id);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        await supabase
          .from("contractor_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const planId = subscription.metadata?.plan_id;
        const billingInterval = subscription.metadata?.billing_interval;

        const period = getSubscriptionPeriod(subscription);
        const updateData: Record<string, unknown> = {
          status: subscription.status,
          current_period_start: period.start,
          current_period_end: period.end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        };
        if (planId) updateData.plan_id = planId;
        if (billingInterval) updateData.billing_interval = billingInterval;

        await supabase
          .from("contractor_subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id);

        // Homeowner plans: renewal, cancellation scheduling and status sync.
        if (subscription.metadata?.plan_type === "homeowner") {
          await supabase
            .from("homeowner_subscriptions")
            .update({
              status: subscription.status,
              current_period_start: period.start,
              current_period_end: period.end,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from("contractor_subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        // Homeowner plans revert to Découverte as soon as the subscription ends.
        await supabase
          .from("homeowner_subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);


        // Deactivate contractor
        const { data: sub } = await supabase
          .from("contractor_subscriptions")
          .select("contractor_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (sub?.contractor_id) {
          await supabase
            .from("contractors")
            .update({
              account_status: "canceled",
              activation_status: "inactive",
              is_published: false,
              is_discoverable: false,
              is_accepting_appointments: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.contractor_id);
        }

        break;
      }
    }

    // Update audit log
    await supabase
      .from("integration_audit_logs")
      .update({ status: "completed" })
      .eq("integration_name", "stripe")
      .eq("action_name", event.id);


    await supabase
      .from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString(), success: true, processing_status: "processed" })
      .eq("stripe_event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      // Best-effort: try to parse the event id from the body to mark it failed
      // (may not always succeed depending on where the throw occurred).
      // Callers can also inspect logs by request id.
      try {
        const parsed = JSON.parse(rawBody);
        if (parsed?.id) {
          await supabase.from("stripe_webhook_events").update({
            processing_status: "failed",
            error_message: msg,
            success: false,
            last_retry_at: new Date().toISOString(),
          }).eq("stripe_event_id", parsed.id);
        }
      } catch (markErr) { console.error("[stripe-webhook] could not mark event failed", String(markErr)); }
    } catch (_) { /* noop */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


