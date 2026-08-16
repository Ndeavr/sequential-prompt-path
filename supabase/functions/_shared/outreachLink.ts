/**
 * outreachLink — canonical SMS link builder for UNPRO outreach.
 *
 * Rules (see plan "SMS outreach + aperçu de lien"):
 *  - Always the public UNPRO domain, never a shortener/redirector, so the
 *    receiving messaging app reads UNPRO's own Open Graph metadata.
 *  - Absolute https URL, UTM parameters on the UNPRO domain only.
 *  - Attribution (`ref`) is carried as a query param when the prospect already
 *    has an affiliate/agent code; the activation token stays the server-side
 *    source of truth.
 *  - The link is rendered ALONE on its own line by `smsWithLink()` so Android /
 *    iOS link detection and preview generation have the best chance to fire.
 */

export const PUBLIC_SITE = "https://unpro.ca";

/** Force any preview/staging origin back to the canonical public domain. */
export function canonicalPath(linkOrPath: string): string {
  try {
    const u = new URL(linkOrPath, PUBLIC_SITE);
    return `${u.pathname}${u.search}`;
  } catch {
    return linkOrPath.startsWith("/") ? linkOrPath : `/${linkOrPath}`;
  }
}

export interface OutreachLinkOptions {
  /** utm_campaign value, e.g. "contractor_activation" | "second_touch". */
  campaign: string;
  /** Optional affiliate / agent attribution code. */
  ref?: string | null;
  /** utm_source, defaults to "sms". */
  source?: string;
  /** utm_medium, defaults to "outreach". */
  medium?: string;
}

/**
 * Build the canonical, preview-friendly outreach URL.
 * `linkOrPath` may be a full activation link or a bare path; when empty the
 * homepage is used as fallback (still carrying the UTM attribution).
 */
export function buildOutreachUrl(
  linkOrPath: string | null | undefined,
  opts: OutreachLinkOptions,
): string {
  const path = linkOrPath ? canonicalPath(linkOrPath) : "/";
  const url = new URL(path, PUBLIC_SITE);
  url.searchParams.set("utm_source", opts.source ?? "sms");
  url.searchParams.set("utm_medium", opts.medium ?? "outreach");
  url.searchParams.set("utm_campaign", opts.campaign);
  if (opts.ref) url.searchParams.set("ref", opts.ref);
  return url.toString();
}

/**
 * Compose an SMS body with the link isolated on its own line, followed by the
 * mandatory CASL opt-out line.
 */
export function smsWithLink(
  text: string,
  url: string,
  optOutLine = "Répondez STOP pour ne plus recevoir de messages.",
): string {
  return `${text.trim()}\n\n${url}\n${optOutLine}`;
}
