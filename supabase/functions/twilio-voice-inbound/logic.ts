// Pure helpers for inbound voice forwarding (testable, no Deno APIs).
export const OWNED_TWILIO_NUMBERS = ["+14503286776", "+15745405938"];

export function isE164(n: string): boolean {
  return /^\+1[2-9]\d{9}$/.test(n);
}

export function maskNumber(n: string): string {
  const d = n.replace(/\D/g, "");
  return d.length >= 4 ? `***-***-${d.slice(-4)}` : "***";
}

export function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

/** Returns null if forwarding would loop or destination is invalid. */
export function buildDialTwiml(dest: string, callerId: string, actionUrl: string, timeout = 25): string | null {
  if (!isE164(dest) || OWNED_TWILIO_NUMBERS.includes(dest) || dest === callerId) return null;
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial timeout="${timeout}" callerId="${xmlEscape(callerId)}" action="${xmlEscape(actionUrl)}" method="POST"><Number>${dest}</Number></Dial></Response>`;
}

export const UNAVAILABLE_TWIML =
  `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fr-CA" voice="Polly.Chantal">Merci d'avoir appelé UNPRO. Nous ne pouvons pas répondre pour le moment. Nous vous rappellerons rapidement. Bonne journée.</Say><Hangup/></Response>`;

export const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response/>`;

export function needsCallback(dialStatus: string): boolean {
  return ["no-answer", "busy", "failed", "canceled"].includes(dialStatus);
}

export async function computeTwilioSignature(url: string, params: Record<string, string>, token: string): Promise<string> {
  const data = Object.keys(params).sort().reduce((a, k) => a + k + params[k], url);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(token), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  let b = "";
  for (const x of sig) b += String.fromCharCode(x);
  return btoa(b);
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}
