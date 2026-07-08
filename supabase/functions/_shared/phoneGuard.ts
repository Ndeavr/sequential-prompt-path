// phoneGuard.ts — deterministic rejection of placeholder / test / invalid phones.
// Applied by solicitation-build-queue (pre-insert) and solicitation-send-sms
// (pre-Twilio) as defense in depth. Numbers are NOT sent to Twilio; they are
// classified with error_code=INVALID_TEST_NUMBER so admins can see them.

export type PhoneGuardResult =
  | { ok: true; e164: string }
  | { ok: false; reason: string; code: "INVALID_TEST_NUMBER" | "INVALID_FORMAT" };

/** Normalize to E.164 for NANP (Canada/US). Returns null if not NANP-shaped. */
export function toE164NANP(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

/**
 * Rules (all applied to E.164 form):
 * - Area code 555 (fictional).
 * - Exchange 555 + line 0100-0199 (official fictional 555-01xx).
 * - Repeating last-4 digits (0000, 1111 … 9999).
 * - Sequential ascending/descending last-4 (1234, 2345, 4321, 9876).
 * - Line starts with 0000 or ends with 0000.
 * - Whole number is all the same digit.
 */
export function guardPhone(raw: string | null | undefined): PhoneGuardResult {
  const e164 = toE164NANP(raw);
  if (!e164) return { ok: false, reason: "not NANP 10/11 digits", code: "INVALID_FORMAT" };

  const digits = e164.slice(2); // strip +1
  const area = digits.slice(0, 3);
  const exch = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  if (area === "555") return { ok: false, reason: "area code 555 (fictional)", code: "INVALID_TEST_NUMBER" };
  if (exch === "555" && /^01\d\d$/.test(line))
    return { ok: false, reason: "555-01xx fictional exchange", code: "INVALID_TEST_NUMBER" };

  const repeats = ["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"];
  if (repeats.includes(line))
    return { ok: false, reason: `repeating line ${line}`, code: "INVALID_TEST_NUMBER" };

  const asc = "0123456789";
  const desc = "9876543210";
  if (asc.includes(line) || desc.includes(line))
    return { ok: false, reason: `sequential line ${line}`, code: "INVALID_TEST_NUMBER" };

  if (new Set(digits).size === 1)
    return { ok: false, reason: "monotone number", code: "INVALID_TEST_NUMBER" };

  // Area code sanity: NANP area codes cannot start with 0 or 1.
  if (area.startsWith("0") || area.startsWith("1"))
    return { ok: false, reason: "invalid NANP area code", code: "INVALID_FORMAT" };

  return { ok: true, e164 };
}
