import { isSafeReturnPath, saveReturnPath } from "@/lib/authReturn";
import { saveRoleIntent } from "@/services/auth/roleIntent";

/**
 * Canonical contractor auth handoff for the paid funnel.
 * `/auth` redirects to `/role` and drops the query string, and a contractor
 * intent without a returnPath resolves to `/join/profile` — both lost the
 * quote. Persist the contractor intent + exact return path, then go to
 * `/login` directly so the user comes back to the same quote after OTP.
 */
export function contractorLoginPath(returnPath: string): string {
  const safe = isSafeReturnPath(returnPath) ? returnPath : "/entrepreneur/devis-personnalise";
  saveRoleIntent("contractor", { returnPath: safe });
  saveReturnPath(safe, "protected_route");
  return "/login";
}
