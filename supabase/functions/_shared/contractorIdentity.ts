/** Public identity copied only from the server-owned quote, never verification flags. */
export function contractorIdentityFromQuote(quote: Record<string, unknown> | null, fallbackName: string) {
  const input = quote?.input_payload && typeof quote.input_payload === "object" ? quote.input_payload as Record<string, unknown> : {};
  const text = (value: unknown, max = 300) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const identity: Record<string, string> = { business_name: text(quote?.company_name) || fallbackName };
  for (const [key, value] of Object.entries({ city: quote?.city ?? input.city, specialty: quote?.trade_primary ?? input.trade_primary, phone: input.business_phone, address: input.business_address, province: input.business_province })) {
    if (text(value)) identity[key] = text(value);
  }
  const site = text(input.website_url, 2048);
  if (site) {
    try { const url = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`); if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) identity.website = url.href; } catch { /* Invalid URL is never published. */ }
  }
  return identity;
}

/** Keep owner edits; replace only empty fields and the initial email placeholder. */
export function missingContractorIdentity(existing: Record<string, unknown>, quote: Record<string, unknown> | null, accountEmail: string) {
  if (!quote) return {};
  const identity = contractorIdentityFromQuote(quote, accountEmail);
  return Object.fromEntries(Object.entries(identity).filter(([key, value]) => value && (!existing[key] || (key === "business_name" && existing[key] === accountEmail))));
}
