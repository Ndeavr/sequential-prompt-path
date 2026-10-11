/** Editorial dates represent content changes, never builds or generic row updates. */
export const EDITORIAL_REVISIONS: Record<string, string> = {
  "/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur": "2026-10-11",
};

export function validEditorialDate(value: unknown, now = new Date()): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() > now.getTime()) return undefined;
  return value;
}

export function editorialModifiedDate(published: unknown, reviewed: unknown, now = new Date()): string | undefined {
  const original = validEditorialDate(published, now);
  const revision = validEditorialDate(reviewed, now);
  if (!original) return undefined;
  return revision && new Date(revision) >= new Date(original) ? revision : original;
}

export function formatEditorialDate(value: string, locale = "fr-CA"): string {
  // Calendar-only dates must not shift to yesterday at Quebec's UTC offset.
  return new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "long", year: "numeric",
    timeZone: value.length === 10 ? "UTC" : "America/Toronto",
  }).format(new Date(value));
}