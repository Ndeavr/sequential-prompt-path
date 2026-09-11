const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const DEFAULT_CALENDAR_RETURN_TO = "/calendar/connect/success";
const STATE_TTL_MS = 10 * 60 * 1000;

export interface CalendarOAuthState {
  user_id: string;
  return_to: string;
  issued_at: number;
  nonce: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt"]);
}

/** Encrypt provider tokens before persistence. The random IV is stored with the ciphertext. */
export async function encryptCalendarToken(value: string, secret: string): Promise<string> {
  if (!value || !secret) throw new Error("calendar_token_encryption_input_missing");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), encoder.encode(value)),
  );
  return `v1.${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
}

/** Only same-site absolute paths are allowed through OAuth state. */
export function sanitizeCalendarReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_CALENDAR_RETURN_TO;
  }

  try {
    const parsed = new URL(value, "https://unpro.invalid");
    if (parsed.origin !== "https://unpro.invalid") return DEFAULT_CALENDAR_RETURN_TO;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return DEFAULT_CALENDAR_RETURN_TO;
  }
}

export async function createCalendarOAuthState(
  userId: string,
  returnTo: string | null | undefined,
  secret: string,
  now = Date.now(),
): Promise<string> {
  if (!secret) throw new Error("calendar_oauth_state_secret_missing");
  const payload: CalendarOAuthState = {
    user_id: userId,
    return_to: sanitizeCalendarReturnTo(returnTo),
    issued_at: now,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(encodedPayload)),
  );
  return `${encodedPayload}.${toBase64Url(signature)}`;
}

export async function verifyCalendarOAuthState(
  state: string,
  secret: string,
  now = Date.now(),
): Promise<CalendarOAuthState | null> {
  if (!state || !secret) return null;
  const [encodedPayload, encodedSignature, extra] = state.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64Url(encodedSignature).slice() as unknown as BufferSource,
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as Partial<CalendarOAuthState>;
    if (
      typeof payload.user_id !== "string" ||
      payload.user_id.length < 8 ||
      typeof payload.return_to !== "string" ||
      typeof payload.issued_at !== "number" ||
      typeof payload.nonce !== "string" ||
      payload.nonce.length < 8 ||
      payload.issued_at > now + 30_000 ||
      now - payload.issued_at > STATE_TTL_MS
    ) {
      return null;
    }

    return {
      user_id: payload.user_id,
      return_to: sanitizeCalendarReturnTo(payload.return_to),
      issued_at: payload.issued_at,
      nonce: payload.nonce,
    };
  } catch {
    return null;
  }
}

export function calendarAppOrigin(configuredOrigin: string | null | undefined): string {
  try {
    const parsed = new URL(configuredOrigin || "https://unpro.ca");
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      return "https://unpro.ca";
    }
    return parsed.origin;
  } catch {
    return "https://unpro.ca";
  }
}
