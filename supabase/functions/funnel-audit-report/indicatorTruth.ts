// Pure classification for this report only. No provider calls or mutations.
type Row = Record<string, unknown>;
const internalMarker = /(?:^|[^a-z0-9])(?:e2e(?:[a-z0-9]*)?|admin_test|smoke(?:[a-z0-9]*)?|repair(?:[a-z0-9]*)?|fixture(?:[a-z0-9]*)?|selftest|simulation|synthetic|test)(?:$|[^a-z0-9])/i;

function isInternal(row: Row): boolean {
  for (const key of ["is_test", "is_test_e2e", "e2e_test", "is_simulation", "is_fixture", "is_bot", "bot", "dry_run"]) {
    if (row[key] === true || row[key] === "true") return true;
  }
  const nested = row.metadata ?? row.raw_data;
  if (nested && typeof nested === "object" && !Array.isArray(nested) && isInternal(nested as Row)) return true;
  return ["campaign", "source", "source_name", "business_name", "email", "purpose", "environment", "user_agent"]
    .some(key => typeof row[key] === "string" && internalMarker.test(row[key] as string));
}

export function classifyTrackingLinks(tracks: Row[], prospects: Row[], contractors: Row[]) {
  const realProspects = new Set(prospects.filter(p => !isInternal(p)).map(p => p.id));
  const realContractors = new Set(contractors.filter(c => !isInternal(c)).map(c => c.id));
  const commercial = tracks.filter(t => {
    if (isInternal(t)) return false;
    // Every provided attribution must resolve; never infer identity from a click.
    if (t.prospect_id && !realProspects.has(t.prospect_id)) return false;
    if (t.contractor_id && !realContractors.has(t.contractor_id)) return false;
    return Boolean(t.prospect_id || t.contractor_id);
  });
  const clicks = (rows: Row[]) => rows.reduce((sum, row) => sum + (typeof row.click_count === "number" && Number.isSafeInteger(row.click_count) && row.click_count > 0 ? row.click_count : 0), 0);
  const clicked = (rows: Row[]) => rows.filter(t => typeof t.click_count === "number" && t.click_count > 0).length;
  return {
    raw_links: tracks.length,
    raw_clicks: clicks(tracks),
    raw_clicked_links: clicked(tracks),
    commercial_links: commercial.length,
    commercial_attributed_clicks: clicks(commercial),
    commercial_clicked_links: clicked(commercial),
    excluded_clicks: clicks(tracks) - clicks(commercial),
    human_verification: "not_verified" as const,
    scope: "all_time_link_counters" as const,
  };
}

export function unverifiedPayments(checkouts: Row[]) {
  // These exposed billing rows have no signed LIVE Stripe payload, entry350
  // subtotal/one-time contract, matched activation ledger or refund evidence.
  // Even 'paid' is only a raw status here: never synthesize a verified sale.
  return {
    count: 0,
    verification_status: "not_verified" as const,
    raw_status_candidates: checkouts.filter(c => c.payment_status === "paid" || c.checkout_status === "complete").length,
    reason: "missing_signed_live_entry350_payment_activation_and_refund_evidence",
  };
}