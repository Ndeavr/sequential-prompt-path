/**
 * UNPRO — Formatting Utilities
 */

export const formatCurrency = (amount: number, locale = "en-CA"): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CAD",
  }).format(amount).replace(/\s/g, "\u00A0");
};

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
