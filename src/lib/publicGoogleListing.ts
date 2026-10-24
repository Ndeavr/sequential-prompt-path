/** Public contractor profiles may link to a business's Google Maps listing, never to an untrusted redirect. */
export function publicGoogleListing(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === "maps.app.goo.gl") return url.href;
    if (!["www.google.com", "google.com", "maps.google.com"].includes(host)) return null;
    if (!url.pathname.startsWith("/maps")) return null;
    return url.href;
  } catch {
    return null;
  }
}
