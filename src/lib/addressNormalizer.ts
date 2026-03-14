/**
 * UNPRO — Address Normalizer
 * Normalizes Québec addresses into a canonical format for deduplication and slug generation.
 */

export interface ParsedAddress {
  streetNumber: string;
  streetName: string;
  unit?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  fullAddress: string;
  normalizedAddress: string;
}

/**
 * Normalize a full address string to a canonical lowercase form.
 * Removes accents, extra spaces, and standardizes common abbreviations.
 */
export function normalizeAddress(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toLowerCase()
    .replace(/\brue\b/g, "rue")
    .replace(/\bavenue\b|\bav\.\b|\bav\b/g, "av")
    .replace(/\bboulevard\b|\bblvd\.\b|\bblvd\b/g, "blvd")
    .replace(/\bchemin\b|\bch\.\b|\bch\b/g, "ch")
    .replace(/\bchemin\b/g, "ch")
    .replace(/\bsaint-/g, "st-")
    .replace(/\bsainte-/g, "ste-")
    .replace(/\bmont-royal\b/g, "mont-royal")
    .replace(/[,#.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a URL-safe slug from address components.
 * Format: {streetNumber}-{streetName}-{city}-{province}
 */
export function generateSlug(parts: {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  province?: string;
}): string {
  const pieces = [
    parts.streetNumber,
    parts.streetName,
    parts.city,
    parts.province || "qc",
  ].filter(Boolean);

  return pieces
    .join("-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parse a Google Places-style address into structured components.
 * Falls back to simple splitting if format is unrecognized.
 */
export function parseAddress(fullAddress: string): Partial<ParsedAddress> {
  const normalized = normalizeAddress(fullAddress);

  // Try pattern: "123 rue example, montreal, qc h1a 1a1"
  const match = fullAddress.match(
    /^(\d+[a-zA-Z]?)\s+(.+?),\s*(.+?),\s*([A-Za-z]{2})\s*([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)?/
  );

  if (match) {
    const [, streetNumber, streetName, city, province, postalCode] = match;
    return {
      streetNumber: streetNumber.trim(),
      streetName: streetName.trim(),
      city: city.trim(),
      province: province.trim().toUpperCase(),
      postalCode: postalCode?.trim().toUpperCase() || "",
      country: "CA",
      fullAddress: fullAddress.trim(),
      normalizedAddress: normalized,
    };
  }

  // Fallback: just normalize
  return {
    fullAddress: fullAddress.trim(),
    normalizedAddress: normalized,
  };
}

/**
 * Build a display-ready full address from components.
 */
export function buildFullAddress(parts: {
  streetNumber?: string;
  streetName?: string;
  unit?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}): string {
  const line1 = [parts.streetNumber, parts.streetName].filter(Boolean).join(" ");
  const unitStr = parts.unit ? `app. ${parts.unit}` : "";
  const line2 = [parts.city, parts.province].filter(Boolean).join(", ");
  const pieces = [line1, unitStr, line2, parts.postalCode].filter(Boolean);
  return pieces.join(", ").replace(/, ,/g, ",");
}
