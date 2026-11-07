/** Public business identity only; no contact data or bearer tokens in URLs. */
export function normalizeContractorEntry(value: string, kind: "website" | "name") {
  const raw = value.trim();
  if (kind === "name") return raw.length >= 2 && raw.length <= 160 ? { name: raw, website: "" } : null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || url.hostname === 'localhost' || /^\d+(\.\d+){3}$/.test(url.hostname)) return null;
    return { name: "", website: `${url.origin}${url.pathname}` };
  } catch { return null; }
}

export function contractorProfileEntryPath(search: string, lang: "fr" | "en", entry?: { name: string; website: string }) {
  const params = new URLSearchParams(search);
  for (const key of ['checkout', 'session_id', 'payment_intent', 'payment_intent_client_secret', 'entreprise', 'website']) params.delete(key);
  params.set('entry', 'profile');
  params.set('lang', lang);
  if (entry?.name) params.set('entreprise', entry.name);
  if (entry?.website) params.set('website', entry.website);
  return `/entrepreneurs/profil?${params}`;
}