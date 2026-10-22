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