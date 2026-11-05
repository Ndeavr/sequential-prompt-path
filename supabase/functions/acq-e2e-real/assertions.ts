// Evidence assertions only; no provider calls, writes or gate changes.
export function smsDeliveryConfirmed(httpOk: boolean, status: unknown): boolean {
  return httpOk && status === "delivered";
}

export function funnelIncrementConfirmed(count: number | null): boolean {
  return count !== null && Number.isInteger(count) && count > 0;
}

export function paymentProofError(): string {
  return "signed_test_payment_unverified: Checkout connectivity is not a completed payment or a received signed webhook";
}

// Two-phase TEST payment proof. A run only counts as proven when BOTH hold:
//  1. the Stripe API readback shows a genuinely completed TEST payment for the
//     exact e2e session of this run (paid, complete, livemode=false, 100 CAD,
//     metadata.run_group + e2e marker matching), and
//  2. a checkout.session.completed webhook row exists for that exact session
//     with livemode=false — stripe-webhook only inserts after real signature
//     verification, so the row itself is the signed-webhook proof.
// Anything less (connectivity, expired session, live mode, amount/currency or
// run mismatch, missing webhook row) is NOT a proof.
export function testPaymentProofOk(
  session: {
    id?: unknown;
    payment_status?: unknown;
    status?: unknown;
    livemode?: unknown;
    amount_total?: unknown;
    currency?: unknown;
    metadata?: { run_group?: unknown; e2e?: unknown } | null;
  } | null | undefined,
  webhookRow: { session_id?: unknown; event_type?: unknown; livemode?: unknown } | null | undefined,
  expected: { run_group: string; session_id: string },
): boolean {
  if (!session || !webhookRow) return false;
  if (session.id !== expected.session_id) return false;
  if (session.payment_status !== "paid" || session.status !== "complete") return false;
  if (session.livemode !== false) return false;
  if (session.amount_total !== 100 || session.currency !== "cad") return false;
  if (session.metadata?.run_group !== expected.run_group || session.metadata?.e2e !== "true") return false;
  if (webhookRow.session_id !== expected.session_id) return false;
  if (webhookRow.event_type !== "checkout.session.completed") return false;
  if (webhookRow.livemode !== false) return false;
  return true;
}