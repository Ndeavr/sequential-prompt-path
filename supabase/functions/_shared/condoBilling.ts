// Condo (syndicate) + portfolio (multi-immeubles) billing events, handled by the
// canonical signed /stripe-webhook (signature + event-id idempotency already enforced there).
// Rights are granted only on a paid checkout bound to server metadata; refunds/disputes revoke.

const MANAGER_ROLES = ["owner", "board_member", "manager", "administrator"];
const PRODUCTS = ["condo_premium", "portfolio_premium"];

export function condoProductType(obj: any): string | null {
  const candidates = [
    obj?.metadata?.product_type,
    obj?.subscription_details?.metadata?.product_type,
    obj?.parent?.subscription_details?.metadata?.product_type,
  ];
  return candidates.find((c) => PRODUCTS.includes(c)) ?? null;
}

export function isQaEmail(email: string | null | undefined): boolean {
  return /^e2e\+[^@]*@unpro\.ca$/i.test(String(email ?? ""));
}

async function subscriptionIdForCharge(stripe: any, charge: any): Promise<string | null> {
  try {
    let invoiceId = typeof charge?.invoice === "string" ? charge.invoice : charge?.invoice?.id ?? null;
    if (!invoiceId) {
      const pi = typeof charge?.payment_intent === "string" ? charge.payment_intent : charge?.payment_intent?.id;
      if (pi && stripe.invoicePayments?.list) {
        const r = await stripe.invoicePayments.list({ payment: { type: "payment_intent", payment_intent: pi }, limit: 1 });
        const inv = r?.data?.[0]?.invoice;
        invoiceId = typeof inv === "string" ? inv : inv?.id ?? null;
      }
    }
    if (!invoiceId) return null;
    const inv = await stripe.invoices.retrieve(invoiceId);
    const s = inv?.subscription ?? inv?.parent?.subscription_details?.subscription;
    return typeof s === "string" ? s : s?.id ?? null;
  } catch (_e) {
    return null;
  }
}

/** Returns true when the event belonged to condo/portfolio billing and was fully handled. */
export async function handleCondoBillingEvent(supabase: any, stripe: any, event: any): Promise<boolean> {
  const obj: any = event?.data?.object ?? {};
  const now = new Date().toISOString();

  // Refund / dispute: resolve the subscription via the charge's invoice (or invoice_payments for
  // current API versions where charge.invoice is gone). Full refund / dispute revoke; partial = audit only.
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const chargeRef = event.type === "charge.dispute.created" ? obj.charge : null;
    const charge = event.type === "charge.dispute.created"
      ? (typeof chargeRef === "string" ? await stripe.charges.retrieve(chargeRef).catch(() => null) : chargeRef)
      : obj;
    const subId = charge ? await subscriptionIdForCharge(stripe, charge) : null;
    if (!subId) return false;
    const { data: cRows } = await supabase.from("condo_subscriptions").select("id").eq("stripe_subscription_id", subId);
    const { data: pRows } = await supabase.from("portfolio_subscriptions").select("id").eq("stripe_subscription_id", subId);
    if ((cRows?.length ?? 0) + (pRows?.length ?? 0) === 0) return false;
    if (event.type === "charge.refunded" && isPartialRefund(charge)) {
      console.log("[condo-billing] partial refund audited, access kept", {
        subId, event: event.id, amount: charge.amount, refunded: charge.amount_refunded,
      });
      return true;
    }
    const reason = event.type === "charge.refunded" ? "refunded" : "disputed";
    await supabase.from("condo_subscriptions").update({ status: reason, plan_tier: "free" }).eq("stripe_subscription_id", subId);
    await supabase.from("portfolio_subscriptions").update({ status: "cancelled", last_event_id: event.id, updated_at: now })
      .eq("stripe_subscription_id", subId);
    console.log("[condo-billing] revoked", { subId, reason, event: event.id });
    return true;
  }

  const product = condoProductType(obj);
  if (!product) return false;
  const md = obj?.metadata ?? {};

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const uid = md.supabase_user_id;
    const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription?.id;
    if (obj.mode !== "subscription" || obj.payment_status !== "paid" || !uid || !subId) {
      console.log("[condo-billing] checkout not paid/bound", { event: event.id, status: obj.payment_status });
      return true;
    }
    if (event.livemode !== true) {
      const { data: u } = await supabase.auth.admin.getUserById(uid);
      if (!isQaEmail(u?.user?.email) && u?.user?.user_metadata?.e2e_test !== true) {
        console.log("[condo-billing] TEST event refused for non-QA account", { event: event.id });
        return true;
      }
    }
    const customer = typeof obj.customer === "string" ? obj.customer : obj.customer?.id ?? "";
    if (product === "portfolio_premium") {
      const pid = md.portfolio_id;
      const { data: pf } = await supabase.from("portfolios").select("user_id").eq("id", pid).maybeSingle();
      if (!pf || pf.user_id !== uid) { console.log("[condo-billing] portfolio owner mismatch", { event: event.id }); return true; }
      await supabase.from("portfolio_subscriptions").update({
        status: "active", stripe_subscription_id: subId, stripe_customer_id: customer, last_event_id: event.id, updated_at: now,
      }).eq("portfolio_id", pid).eq("user_id", uid);
    } else {
      const sid = md.syndicate_id;
      const { data: m } = await supabase.from("syndicate_members").select("role")
        .eq("syndicate_id", sid).eq("user_id", uid).eq("is_active", true).maybeSingle();
      if (!m || !MANAGER_ROLES.includes(String(m.role))) { console.log("[condo-billing] syndicate manager mismatch", { event: event.id }); return true; }
      await supabase.from("condo_subscriptions").upsert({
        syndicate_id: sid, user_id: uid, plan_tier: "premium", status: "active",
        stripe_customer_id: customer, stripe_subscription_id: subId,
      }, { onConflict: "syndicate_id" });
    }
    console.log("[condo-billing] activated", { product, event: event.id });
    return true;
  }

  if (event.type === "checkout.session.expired") {
    if (product === "portfolio_premium" && md.portfolio_id) {
      await supabase.from("portfolio_subscriptions").update({ status: "cancelled", last_event_id: event.id, updated_at: now })
        .eq("portfolio_id", md.portfolio_id).eq("status", "pending");
    }
    return true;
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const item = obj?.items?.data?.[0];
    const endSec = item?.current_period_end ?? obj.current_period_end;
    const startSec = item?.current_period_start ?? obj.current_period_start;
    const deleted = event.type === "customer.subscription.deleted";
    // Never upgrade to active from a subscription event; only checkout grants rights.
    const map: Record<string, string> = { past_due: "past_due", unpaid: "past_due", canceled: "cancelled", incomplete_expired: "failed" };
    const st = deleted ? "cancelled" : map[obj.status] ?? null;
    if (product === "portfolio_premium") {
      const patch: any = { last_event_id: event.id, updated_at: now, current_period_end: endSec ? new Date(endSec * 1000).toISOString() : null };
      if (st) patch.status = st;
      await supabase.from("portfolio_subscriptions").update(patch).eq("stripe_subscription_id", obj.id);
    } else {
      const patch: any = {
        current_period_start: startSec ? new Date(startSec * 1000).toISOString() : null,
        current_period_end: endSec ? new Date(endSec * 1000).toISOString() : null,
        cancel_at_period_end: !!obj.cancel_at_period_end,
      };
      if (st) patch.status = st;
      if (deleted) patch.plan_tier = "free";
      await supabase.from("condo_subscriptions").update(patch).eq("stripe_subscription_id", obj.id);
    }
    return true;
  }

  if (event.type === "invoice.payment_failed") {
    const s = obj.subscription ?? obj.parent?.subscription_details?.subscription;
    const subId = typeof s === "string" ? s : s?.id;
    if (subId) {
      // Only downgrade rows currently active; never touch refunded/disputed/cancelled rows.
      await supabase.from("condo_subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId).eq("status", "active");
      await supabase.from("portfolio_subscriptions").update({ status: "past_due", last_event_id: event.id, updated_at: now })
        .eq("stripe_subscription_id", subId).eq("status", "active");
    }
    return true;
  }

  if (event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") {
    const s = obj.subscription ?? obj.parent?.subscription_details?.subscription;
    const subId = typeof s === "string" ? s : s?.id;
    if (!subId || !obj.id) return true;
    // Re-verify against Stripe: invoice really paid with money, subscription active, same product.
    const inv = await stripe.invoices.retrieve(obj.id);
    const sub = await stripe.subscriptions.retrieve(subId);
    const okInvoice = inv?.status === "paid" && Number(inv?.amount_paid ?? 0) > 0 && inv?.livemode === event.livemode;
    const okSub = sub?.status === "active" && condoProductType(sub) === product;
    if (!okInvoice || !okSub) {
      console.log("[condo-billing] renewal not verified, no change", { event: event.id, inv: inv?.status, sub: sub?.status });
      return true;
    }
    const item = sub?.items?.data?.[0];
    const endSec = item?.current_period_end ?? sub.current_period_end;
    const startSec = item?.current_period_start ?? sub.current_period_start;
    const end = endSec ? new Date(endSec * 1000).toISOString() : null;
    // Restore only past_due rows: refunded/disputed/cancelled are never reactivated by an invoice.
    if (product === "portfolio_premium") {
      await supabase.from("portfolio_subscriptions").update({ status: "active", current_period_end: end, last_event_id: event.id, updated_at: now })
        .eq("stripe_subscription_id", subId).eq("status", "past_due");
    } else {
      await supabase.from("condo_subscriptions").update({
        status: "active", plan_tier: "premium", current_period_end: end,
        current_period_start: startSec ? new Date(startSec * 1000).toISOString() : null,
      }).eq("stripe_subscription_id", subId).eq("status", "past_due");
    }
    console.log("[condo-billing] renewal verified", { subId, event: event.id });
    return true;
  }

  return true; // other condo/portfolio events: acknowledged, no rights change
}

export function isPartialRefund(charge: any): boolean {
  const amount = Number(charge?.amount ?? 0);
  const refunded = Number(charge?.amount_refunded ?? 0);
  return charge?.refunded !== true && amount > 0 && refunded > 0 && refunded < amount;
}
