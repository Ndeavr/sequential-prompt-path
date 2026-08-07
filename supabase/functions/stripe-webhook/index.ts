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

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
    const body = await req.text();

    // Replay mode: internal reprocessing bypasses Stripe signature check.
    // Requires x-replay-token header matching SERVICE_ROLE_KEY.
    const replayToken = req.headers.get("x-replay-token");
    const isReplay =
      !!replayToken &&
      replayToken === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let event: Stripe.Event;

    if (webhookSecret && !isReplay) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
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



    // Observability: log to stripe_webhook_events (idempotent via unique stripe_event_id)
    const receivedAt = new Date().toISOString();
    const sessionObj = (event.data.object as any) || {};
    const sessionIdField = sessionObj?.id || null;
    const contractorIdField =
      sessionObj?.metadata?.contractor_id ||
      sessionObj?.metadata?.prospect_id ||
      null;

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
        session_id: sessionIdField,
        payload: event as any,
        processing_status: "processing",
      });

      if (insertErr && !String(insertErr.message).includes("duplicate")) {
        console.warn("[stripe-webhook] audit insert warning", insertErr.message);
      }
      if (insertErr && String(insertErr.message).includes("duplicate")) {
        console.log(`Duplicate webhook event ${event.id}, skipping`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // Legacy audit log (kept for backward compat)
    await supabase.from("integration_audit_logs").insert({
      integration_name: "stripe",
      action_name: event.id,
      status: "processing",
      payload: { type: event.type },
    });


    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
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

        // $1 ACTIVATION flow (create-activation-checkout): the live acquisition
        // pool is verified_contractor_prospects. Without this branch a real $1
        // payment is invisible to the cockpit.
        if (
          session.metadata?.activation_token ||
          session.metadata?.offer === "activation_7d"
        ) {
          const activationToken = session.metadata?.activation_token || null;
          const vProspectId = session.metadata?.prospect_id || null;
          try {
            if (vProspectId) {
              await supabase
                .from("verified_contractor_prospects")
                .update({
                  outreach_status: "paid",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", vProspectId);
            }
            await supabase.from("unpro_payment_activation_audit").insert({
              prospect_id: vProspectId,
              stripe_event_id: event.id,
              checkout_session_id: session.id,
              payment_intent_id: (session.payment_intent as string) || null,
              action: "dollar_activation",
              result: "success",
              new_status: "activated",
              amount_cents: session.amount_total ?? null,
              metadata: {
                activation_token: activationToken,
                source: session.metadata?.source ?? null,
                slug: session.metadata?.prospect_slug ?? null,
              },
            });
            await supabase.rpc("record_engagement_event", {
              _event_type: "payment_succeeded",
              _channel: "web",
              _status: "paid",
              _provider: "stripe",
              _prospect_id: vProspectId,
              _source_table: "unpro_payment_activation_audit",
              _source_row_id: session.id,
              _metadata: {
                amount_cents: session.amount_total ?? null,
                campaign_id: session.metadata?.campaign_id ?? null,
                activation_token: activationToken,
              },
              _idempotency_key: `payment_succeeded:${session.id}`,
            });
            console.log("[stripe-webhook] $1 activation recorded", {
              prospect_id: vProspectId,
              session: session.id,
            });
          } catch (e) {
            console.error("[stripe-webhook] activation_7d handling failed", (e as Error).message);
          }
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
        const rawBody = await req.clone().text();
        const parsed = JSON.parse(rawBody);
        if (parsed?.id) {
          await supabase.from("stripe_webhook_events").update({
            processing_status: "failed",
            error_message: msg,
            success: false,
          }).eq("stripe_event_id", parsed.id);
        }
      } catch (_) { /* noop */ }
    } catch (_) { /* noop */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


