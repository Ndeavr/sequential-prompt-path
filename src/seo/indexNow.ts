/**
 * IndexNow helpers (pure). Used by scripts/indexnow-submit.ts.
 * Protocol: https://www.indexnow.org/documentation — the key is public by design
 * (it proves domain ownership via https://<host>/<key>.txt), not a credential.
 */
export const INDEXNOW_KEY = "be1030eb4c925f213e43407493906192";
export const INDEXNOW_HOST = "unpro.ca";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;
/** Protocol maximum per POST. */
export const INDEXNOW_MAX_URLS = 10_000;

export function isValidIndexNowKey(key: string): boolean {
  return /^[a-zA-Z0-9-]{8,128}$/.test(key);
}

export function extractLocs(xml: string): { loc: string; lastmod?: string }[] {
  const out: { loc: string; lastmod?: string }[] = [];
  const re = /<(?:url|sitemap)>([\s\S]*?)<\/(?:url|sitemap)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1]?.trim();
    const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1]?.trim();
    if (loc) out.push({ loc: loc.replace(/&amp;/g, "&"), lastmod });
  }
  return out;
}

/** Same-host https URLs only, deduplicated, optionally limited to entries modified since `since`. */
export function selectIndexNowUrls(
  entries: { loc: string; lastmod?: string }[],
  opts: { host?: string; since?: Date } = {},
): string[] {
  const host = opts.host ?? INDEXNOW_HOST;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of entries) {
    let u: URL;
    try {
      u = new URL(e.loc);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" || u.host !== host) continue;
    if (opts.since) {
      const t = e.lastmod ? new Date(e.lastmod) : null;
      if (!t || Number.isNaN(t.getTime()) || t < opts.since) continue;
    }
    if (seen.has(u.href)) continue;
    seen.add(u.href);
    out.push(u.href);
  }
  return out;
}

export function buildIndexNowPayloads(urls: string[], key = INDEXNOW_KEY, host = INDEXNOW_HOST) {
  const batches: { host: string; key: string; keyLocation: string; urlList: string[] }[] = [];
  for (let i = 0; i < urls.length; i += INDEXNOW_MAX_URLS) {
    batches.push({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls.slice(i, i + INDEXNOW_MAX_URLS) });
  }
  return batches;
}

export type IndexNowOutcome = "accepted" | "bad_request" | "key_invalid" | "unprocessable" | "rate_limited" | "error";

/** 200 = received, 202 = received (key validation pending). Anything else is not success. */
export function classifyIndexNowStatus(status: number): IndexNowOutcome {
  if (status === 200 || status === 202) return "accepted";
  if (status === 400) return "bad_request";
  if (status === 403) return "key_invalid";
  if (status === 422) return "unprocessable";
  if (status === 429) return "rate_limited";
  return "error";
}
