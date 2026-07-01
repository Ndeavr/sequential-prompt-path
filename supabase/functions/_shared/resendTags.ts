// Sanitize Resend email tag names/values.
// Resend rule: ASCII letters, numbers, underscores or dashes. Max 256 chars.
// Never throws. Silently drops invalid tags rather than blocking sends.

export type ResendTag = { name: string; value: string };

function clean(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .normalize("NFD")
    // strip diacritics
    .replace(/[\u0300-\u036f]/g, "")
    // spaces -> underscore
    .replace(/\s+/g, "_")
    // anything not [A-Za-z0-9_-] -> underscore
    .replace(/[^A-Za-z0-9_-]/g, "_")
    // collapse runs
    .replace(/_+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 256);
}

export function sanitizeTagValue(v: unknown): string {
  return clean(v);
}

/** Accepts either an array of {name,value} or a record object. Always returns a Resend-safe array. */
export function sanitizeTags(
  input: ResendTag[] | Record<string, unknown> | null | undefined,
): ResendTag[] {
  if (!input) return [];
  const list: ResendTag[] = Array.isArray(input)
    ? input.map((t) => ({ name: t?.name ?? "", value: t?.value ?? "" }))
    : Object.entries(input).map(([k, v]) => ({ name: k, value: v as any }));

  const out: ResendTag[] = [];
  for (const t of list) {
    const name = clean(t.name);
    const value = clean(t.value);
    if (!name || !value) continue;
    out.push({ name, value });
  }
  return out;
}
