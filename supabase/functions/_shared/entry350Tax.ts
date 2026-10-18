/** Founder confirmed GST+QST registration (2026-10-18). Never accept a client flag. */
export function entry350TaxCollectionApproved(): boolean { return true; }

export const ENTRY350_TAX_CONTRACT = "qc-exclusive-v1";
export const ENTRY350_AMOUNTS = { subtotal: 35000, gst: 1750, qst: 3491, tax: 5241, total: 40241 } as const;
export const QUEBEC_TAX_DEFS = [
  { key: "gst_5", display_name: "TPS", percentage: 5, jurisdiction: "CA" },
  { key: "qst_9975", display_name: "TVQ", percentage: 9.975, jurisdiction: "CA-QC" },
] as const;

const ratesByClient = new WeakMap<object, Promise<string[]>>();
/** Cache belongs to the SDK client/key, never a cross-environment global key. */
export async function ensureQuebecTaxRates(stripe: any): Promise<string[]> {
  const cached = ratesByClient.get(stripe);
  if (cached) return cached;
  const pending = (async () => {
    const existing = await stripe.taxRates.list({ active: true, limit: 100 });
    const ids: string[] = [];
    for (const def of QUEBEC_TAX_DEFS) {
      const found = existing.data.find((r: any) => r.metadata?.unpro_tax === def.key &&
        r.inclusive === false && r.percentage === def.percentage && r.country === "CA" &&
        (def.jurisdiction !== "CA-QC" || r.state === "QC"));
      const rate = found ?? await stripe.taxRates.create({
        display_name: def.display_name, description: `${def.display_name} (${def.percentage} %)`,
        percentage: def.percentage, inclusive: false, country: "CA",
        state: def.jurisdiction === "CA-QC" ? "QC" : undefined, metadata: { unpro_tax: def.key },
      });
      ids.push(rate.id);
    }
    return ids;
  })();
  ratesByClient.set(stripe, pending);
  try { return await pending; } catch (error) { ratesByClient.delete(stripe); throw error; }
}

/** Signed event identifies the session; authenticated Stripe GET attests its lines.
 * Old events lacking total_details are hydrated using the handler's newer SDK API.
 * No paid mutation can precede this verification. Metadata alone is insufficient.
 */
export async function verifyEntry350TaxContract(stripe: any, signed: any, live: boolean, replay: boolean) {
  if (!signed.metadata?.entry_tax_contract) return signed; // explicitly historical
  if (replay || signed.metadata.entry_tax_contract !== ENTRY350_TAX_CONTRACT) throw new Error("entry_tax_contract_unverified");
  const session = await stripe.checkout.sessions.retrieve(signed.id);
  if (session.id !== signed.id || session.livemode !== live ||
      session.metadata?.entry_tax_contract !== ENTRY350_TAX_CONTRACT ||
      session.metadata?.offer !== signed.metadata?.offer || session.payment_status !== signed.payment_status ||
      session.amount_subtotal !== signed.amount_subtotal || session.amount_total !== signed.amount_total) {
    throw new Error("entry_tax_session_mismatch");
  }
  const lines = await stripe.checkout.sessions.listLineItems(signed.id, { limit: 100 });
  const line = lines.data?.[0];
  if (lines.has_more || lines.data?.length !== 1 || line.quantity !== 1 ||
      line.currency !== "cad" || line.amount_subtotal !== ENTRY350_AMOUNTS.subtotal ||
      line.amount_total !== ENTRY350_AMOUNTS.total || line.amount_discount !== 0 ||
      line.amount_tax !== ENTRY350_AMOUNTS.tax || line.taxes?.length !== 2 ||
      session.automatic_tax?.enabled === true || session.total_details?.amount_discount !== 0) {
    throw new Error("entry_tax_lines_mismatch");
  }
  for (const [index, def] of QUEBEC_TAX_DEFS.entries()) {
    const taxes = line.taxes.filter((t: any) => t.rate?.metadata?.unpro_tax === def.key);
    if (taxes.length !== 1 || taxes[0].rate.inclusive !== false ||
        taxes[0].rate.percentage !== def.percentage || taxes[0].rate.country !== "CA" ||
        (def.jurisdiction === "CA-QC" && taxes[0].rate.state !== "QC") ||
        taxes[0].amount !== (index === 0 ? ENTRY350_AMOUNTS.gst : ENTRY350_AMOUNTS.qst)) {
      throw new Error("entry_tax_rate_mismatch");
    }
  }
  return session;
}