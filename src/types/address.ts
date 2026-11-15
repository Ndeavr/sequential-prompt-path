/**
 * UNPRO — Verified Address Types
 * Single source of truth for any address captured anywhere in the platform.
 * An address is either VERIFIED (selected from Google Places, with place id)
 * or DECLARED by the user (typed manually, never geocoded nor verified).
 */

export interface VerifiedAddressData {
  verified: true;
  placeId: string;
  fullAddress: string;
  streetNumber: string;
  streetName: string;
  unit?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

/** Address typed by the user, field by field. Declared, not verified. */
export interface DeclaredAddressParts {
  street: string;
  unit?: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface UnverifiedAddressData {
  verified: false;
  raw: string;
  /** Present when the user filled the manual address fields. */
  declared?: DeclaredAddressParts;
}

export type VerifiedAddress = VerifiedAddressData | UnverifiedAddressData;

export const emptyAddress = (): UnverifiedAddressData => ({ verified: false, raw: "" });

export function isVerified(addr: VerifiedAddress | null | undefined): addr is VerifiedAddressData {
  return !!addr && addr.verified === true;
}

const CA_POSTAL_RE = /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/;

export function normalizePostalCode(value: string): string {
  const v = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return v.length === 6 ? `${v.slice(0, 3)} ${v.slice(3)}` : value.trim().toUpperCase();
}

/** Empty postal code is allowed; a typed one must look Canadian. */
export function isValidPostalCode(value: string): boolean {
  const v = value.trim();
  return v === "" || CA_POSTAL_RE.test(v.replace(/-/g, " ").replace(/\s+/g, " "));
}

export function composeDeclaredAddress(p: DeclaredAddressParts): string {
  const line1 = [p.street.trim(), p.unit?.trim() ? `app. ${p.unit.trim()}` : ""].filter(Boolean).join(", ");
  const tail = [p.province.trim(), p.postalCode.trim() ? normalizePostalCode(p.postalCode) : ""].filter(Boolean).join(" ");
  return [line1, p.city.trim(), tail].filter(Boolean).join(", ");
}

/** Declared parts complete enough to continue (street + city, valid postal code if typed). */
export function getCompleteDeclaredAddress(addr: VerifiedAddress | null | undefined): DeclaredAddressParts | null {
  if (!addr || addr.verified || !addr.declared) return null;
  const d = addr.declared;
  if (d.street.trim().length < 4 || d.city.trim().length < 2 || !isValidPostalCode(d.postalCode)) return null;
  return {
    street: d.street.trim(),
    unit: d.unit?.trim() || undefined,
    city: d.city.trim(),
    province: d.province.trim() || "QC",
    postalCode: d.postalCode.trim() ? normalizePostalCode(d.postalCode) : "",
  };
}

/** Verified OR complete declared address: enough to finish a form without Google. */
export function isUsableAddress(addr: VerifiedAddress | null | undefined): boolean {
  return isVerified(addr) || !!getCompleteDeclaredAddress(addr);
}
