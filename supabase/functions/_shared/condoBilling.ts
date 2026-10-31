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

  // Refund / dispute: resolve the subscription via the charge's invoice, then revoke.
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const charge = event.type === "charge.dispute.created" && typeof obj.charge === "string"
      ? await stripe.charges.retrieve(obj.charge).catch(() => null)
      : obj;
    const subId = charge ? await subscriptionIdForCharge(stripe, charge) : null;
    if (!subId) return false;
    const reason = event.type === "charge.refunded" ? "refunded" : "disputed";
    const { data: c } = await supabase.from("condo_subscriptions").update({ status: reason, plan_tier: "free" })
      .eq("stripe_subscription_id", subId).select("id");
    const { data: p } = await supabase.from("portfolio_subscriptions").update({ status: "cancelled", last_event_id: event.id, updated_at: now })
      .eq("stripe_subscription_id", subId).select("id");
    const hit = (c?.length ?? 0) + (p?.length ?? 0) > 0;
    if (hit) console.log("[condo-billing] revoked", { subId, reason, event: event.id });
    return hit;
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
      await supabase.from("condo_subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
      await supabase.from("portfolio_subscriptions").update({ status: "past_due", last_event_id: event.id, updated_at: now }).eq("stripe_subscription_id", subId);
    }
    return true;
  }

  return true; // other condo/portfolio events: acknowledged, no rights change
}
