// Twilio X-Twilio-Signature validation (official algorithm):
// base64(HMAC-SHA1(authToken, url + concat(sorted key+value))). Constant-time compare.
export async function computeTwilioSignature(url: string, params: Record<string, string>, authToken: string): Promise<string> {
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function isValidTwilioSignature(url: string, params: Record<string, string>, header: string, authToken: string): Promise<boolean> {
  if (!authToken || !header || !url) return false;
  const expected = await computeTwilioSignature(url, params, authToken);
  if (expected.length !== header.length) return false;
  let m = 0;
  for (let i = 0; i < expected.length; i++) m |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return m === 0;
}

// Status ranking for monotonic updates: a lower-ranked status never overwrites a higher one.
const RANK: Record<string, number> = {
  queued: 1, accepted: 1, api_accepted: 1, scheduled: 1, sending: 2, sent: 3,
  delivery_unknown: 3, delivered: 5, read: 6, undelivered: 5, failed: 5, canceled: 5,
};
export function isStatusRegression(current: string | null | undefined, next: string): boolean {
  const c = RANK[(current ?? "").toLowerCase()] ?? 0;
  const n = RANK[next] ?? 0;
  if (c >= 5 && n <= c) return true; // terminal: ignore duplicates and regressions
  return n < c;
}
