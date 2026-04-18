/**
 * UNPRO — Verified Address Types
 * Single source of truth for any address captured anywhere in the platform.
 * Addresses MUST be verified through Google Places before being persisted.
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

export interface UnverifiedAddressData {
  verified: false;
  raw: string;
}

export type VerifiedAddress = VerifiedAddressData | UnverifiedAddressData;

export const emptyAddress = (): UnverifiedAddressData => ({ verified: false, raw: "" });

export function isVerified(addr: VerifiedAddress | null | undefined): addr is VerifiedAddressData {
  return !!addr && addr.verified === true;
}
