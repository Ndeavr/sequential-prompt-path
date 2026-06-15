// Mirror of supabase/functions/_shared/normalizePhone.ts — keep in sync.

export type NormalizedPhone = {
  raw: string;
  normalized: string | null;
  country_code: string | null;
  area_code: string | null;
  valid: boolean;
  reason?: string;
};

export function normalizePhone(input: string | null | undefined): NormalizedPhone {
  const raw = (input ?? "").toString();
  if (!raw.trim()) return { raw, normalized: null, country_code: null, area_code: null, valid: false, reason: "empty" };
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { raw, normalized: null, country_code: null, area_code: null, valid: false, reason: "no_digits" };

  let e164: string;
  if (hasPlus && digits.length >= 11) e164 = `+${digits}`;
  else if (digits.length === 10) e164 = `+1${digits}`;
  else if (digits.length === 11 && digits.startsWith("1")) e164 = `+${digits}`;
  else return { raw, normalized: null, country_code: null, area_code: null, valid: false, reason: "bad_length" };

  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) {
    const [, npa, nxx] = m;
    if (!/^[2-9]/.test(npa) || !/^[2-9]/.test(nxx)) {
      return { raw, normalized: null, country_code: "1", area_code: npa, valid: false, reason: "invalid_nanp" };
    }
    return { raw, normalized: e164, country_code: "1", area_code: npa, valid: true };
  }
  if (/^\+\d{8,15}$/.test(e164)) return { raw, normalized: e164, country_code: null, area_code: null, valid: true };
  return { raw, normalized: null, country_code: null, area_code: null, valid: false, reason: "invalid_format" };
}
