// PROTECTED — Canonical phone normalization for SMS pipeline.
// Mirror lives at src/lib/normalizePhone.ts; keep both in sync.

export type NormalizedPhone = {
  raw: string;
  normalized: string | null;
  country_code: string | null;
  area_code: string | null;
  valid: boolean;
  reason?: string;
};

export function normalizePhone(input: string | null | undefined, defaultCountry: "CA" | "US" = "CA"): NormalizedPhone {
  const raw = (input ?? "").toString();
  if (!raw.trim()) return { raw, normalized: null, country_code: null, area_code: null, valid: false, reason: "empty" };

  // Strip everything but digits and leading +
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { raw, normalized: null, country_code: null, area_code: null, valid: false, reason: "no_digits" };

  let e164: string;
  if (hasPlus && digits.length >= 11) {
    e164 = `+${digits}`;
  } else if (digits.length === 10) {
    // NANP 10-digit
    e164 = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    e164 = `+${digits}`;
  } else {
    return { raw, normalized: null, country_code: null, area_code: null, valid: false, reason: "bad_length" };
  }

  // NANP validation: +1 NPA-NXX-XXXX, NPA & NXX must start with 2-9
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) {
    const [, npa, nxx] = m;
    if (!/^[2-9]/.test(npa) || !/^[2-9]/.test(nxx)) {
      return { raw, normalized: null, country_code: "1", area_code: npa, valid: false, reason: "invalid_nanp" };
    }
    return { raw, normalized: e164, country_code: "1", area_code: npa, valid: true };
  }

  // Non-NANP: accept E.164 length 8-15 after the +
  if (/^\+\d{8,15}$/.test(e164)) {
    return { raw, normalized: e164, country_code: null, area_code: null, valid: true };
  }

  return { raw, normalized: null, country_code: null, area_code: null, valid: false, reason: "invalid_format" };
}
