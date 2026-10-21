/**
 * UNPRO — Formatting Utilities
 */

export const formatCurrency = (amount: number, locale = "en-CA"): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CAD",
  }).format(amount).replace(/\s/g, "\u00A0");
};

/** Pure dollars/percentage points: no conversion to cents or ratios. */
export function parseQuebecNumber(raw: string): number | null {
  const clean = raw.replace(/[\s\u00A0\u202F]/g, "").replace(/[$%]$/, "").replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean)) return null;
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

export function formatQuebecNumber(value: number, unit: "$" | "%"): string {
  const number = new Intl.NumberFormat("fr-CA", {
    maximumFractionDigits: 20,
    minimumFractionDigits: unit === "$" && !Number.isInteger(value) ? 2 : 0,
  }).format(value).replace(/\s/g, "\u00A0");
  return `${number}\u00A0${unit}`;
}

export const formatDate = (dateStr: string, locale = "en-CA"): string => {
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatScore = (score: number): string => {
  return `${Math.round(score)}/100`;
};
