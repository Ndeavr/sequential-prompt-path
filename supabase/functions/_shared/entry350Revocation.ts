// Revokes a CA$350 entry activation after a Stripe refund or dispute.
// contractor_plan_code() ignores any session with a 'deactivated' stripe_webhook row.
// deno-lint-ignore no-explicit-any
type Db = any;

export async function revokeEntry350(
  db: Db,
  i: { paymentIntentId: string; eventId: string; livemode: boolean; reason: "refunded" | "disputed" },
): Promise<"revoked" | "already_revoked" | "not_found"> {
  const { data: rows, error } = await db.from("contractor_activation_ledger")
    .select("contractor_id, metadata")
    .eq("action", "entry_activation_350_paid")
    .eq("metadata->>stripe_payment_intent", i.paymentIntentId)
    .limit(1);
  if (error) throw new Error(`entry_350 revoke lookup: ${error.message}`);
  const row = rows?.[0];
  if (!row) return "not_found";
  const sid = (row.metadata ?? {}).stripe_session_id;
  const { data: prior, error: pErr } = await db.from("contractor_activation_ledger")
    .select("id").eq("action", "deactivated").eq("source", "stripe_webhook")
    .eq("metadata->>stripe_session_id", sid).limit(1);
  if (pErr) throw new Error(`entry_350 revoke check: ${pErr.message}`);
  if (prior?.length) return "already_revoked";
  const { error: insErr } = await db.from("contractor_activation_ledger").insert({
    contractor_id: row.contractor_id,
    action: "deactivated",
    source: "stripe_webhook",
    metadata: { stripe_session_id: sid, stripe_event_id: i.eventId, stripe_payment_intent: i.paymentIntentId, livemode: i.livemode, reason: i.reason },
  });
  if (insErr) throw new Error(`entry_350 revoke insert: ${insErr.message}`);
  await db.from("admin_notifications").insert({
    type: "entry_activation_350_revoked", severity: "critical", contractor_id: row.contractor_id,
    title: i.reason === "refunded" ? "Activation 350 $ remboursée — Présence IA retirée" : "Litige sur l'activation 350 $ — Présence IA suspendue",
    body: "Les droits inclus ne sont plus accordés pour cette session.",
    payload_json: { stripe_session_id: sid, stripe_event_id: i.eventId },
  });
  return "revoked";
}
