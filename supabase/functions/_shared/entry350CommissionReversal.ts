// Reverses the affiliate commission of a CA$350 entry activation after a LIVE
// Stripe refund or dispute. Statuses allowed by affiliate_conversions:
// pending | approved | paid | rejected. Policy (fail-safe):
//  - TEST events never touch commissions.
//  - Session is resolved from contractor_activation_ledger (never from event metadata).
//  - Full refund / dispute on pending|approved direct row → 'rejected'
//    (trigger affiliate_sync_override_status mirrors it onto the 5 % override).
//  - Partial refund → no status change, manual review alert (no prorata policy exists).
//  - Direct or override already 'paid' → no change, critical reconciliation alert.
//  - Rows are never deleted; reversal audit kept in metadata.reversal. Idempotent.
// deno-lint-ignore no-explicit-any
type Db = any;

export type CommissionReversalResult =
  | "test_ignored" | "not_found" | "no_commission" | "reversed"
  | "already_reversed" | "manual_review" | "paid_needs_reconciliation";

export async function entry350SessionRevoked(db: Db, sessionId: string): Promise<boolean> {
  const { data, error } = await db.from("contractor_activation_ledger")
    .select("id").eq("action", "deactivated").eq("source", "stripe_webhook")
    .eq("metadata->>stripe_session_id", sessionId).limit(1);
  if (error) throw new Error(`entry_350 revoked check: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export async function reverseEntry350Commission(
  db: Db,
  i: { paymentIntentId: string; eventId: string; livemode: boolean; reason: "refunded" | "disputed"; partial: boolean },
): Promise<CommissionReversalResult> {
  if (i.livemode !== true) return "test_ignored";
  const { data: rows, error } = await db.from("contractor_activation_ledger")
    .select("contractor_id, metadata")
    .eq("action", "entry_activation_350_paid")
    .eq("metadata->>stripe_payment_intent", i.paymentIntentId)
    .limit(1);
  if (error) throw new Error(`entry_350 commission lookup: ${error.message}`);
  const led = rows?.[0];
  const sid = led?.metadata?.stripe_session_id;
  if (!led || typeof sid !== "string" || !sid) return "not_found";

  const { data: direct, error: dErr } = await db.from("affiliate_conversions")
    .select("id, status, metadata, affiliate_id, commission_amount_cents")
    .eq("commission_kind", "direct")
    .eq("metadata->>stripe_session_id", sid)
    .limit(1);
  if (dErr) throw new Error(`entry_350 commission select: ${dErr.message}`);
  const conv = direct?.[0];
  if (!conv) return "no_commission";
  const meta = conv.metadata ?? {};
  if (meta.reversal || conv.status === "rejected") return "already_reversed";

  const { data: overrides, error: oErr } = await db.from("affiliate_conversions")
    .select("id, status").eq("commission_kind", "subaffiliate_override").eq("source_conversion_id", conv.id);
  if (oErr) throw new Error(`entry_350 override select: ${oErr.message}`);
  const anyPaid = conv.status === "paid" || (overrides ?? []).some((o: { status: string }) => o.status === "paid");

  const audit = { reason: i.reason, stripe_event_id: i.eventId, stripe_payment_intent: i.paymentIntentId, at: new Date().toISOString() };
  const alert = async (type: string, title: string, body: string) => {
    await db.from("admin_notifications").insert({
      type, severity: "critical", contractor_id: led.contractor_id, title, body,
      payload_json: { stripe_session_id: sid, conversion_id: conv.id, affiliate_id: conv.affiliate_id, ...audit },
    });
  };

  if (anyPaid || (i.partial && i.reason === "refunded")) {
    if (meta.reversal_review) return anyPaid ? "paid_needs_reconciliation" : "manual_review";
    const { error: uErr } = await db.from("affiliate_conversions")
      .update({ metadata: { ...meta, reversal_review: { ...audit, partial: i.partial, already_paid: anyPaid } } })
      .eq("id", conv.id);
    if (uErr) throw new Error(`entry_350 commission review flag: ${uErr.message}`);
    if (anyPaid) {
      await alert("entry_activation_350_commission_paid_reconcile", "Commission 350 $ déjà versée — réconciliation requise",
        "Remboursement ou litige après versement. Aucune reprise automatique; décision humaine requise.");
      return "paid_needs_reconciliation";
    }
    await alert("entry_activation_350_commission_partial_refund", "Remboursement partiel 350 $ — commission à revoir",
      "Aucune politique de commission au prorata. Commission inchangée; décision humaine requise.");
    return "manual_review";
  }

  const { data: upd, error: uErr } = await db.from("affiliate_conversions")
    .update({ status: "rejected", metadata: { ...meta, reversal: audit } })
    .eq("id", conv.id).eq("status", conv.status).select("id");
  if (uErr) throw new Error(`entry_350 commission reverse: ${uErr.message}`);
  if (!upd?.length) return "already_reversed";
  await alert("entry_activation_350_commission_reversed", "Commission 350 $ annulée (remboursement/litige)",
    "Commission directe et commission d'équipe rejetées. Historique conservé.");
  return "reversed";
}
