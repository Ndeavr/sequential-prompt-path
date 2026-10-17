/** Jeton de session invitée Clara pour la vérification d'adresse (aucune inscription requise). */
import { startOrResumeClaraSession } from "@/services/clara/claraSession";

export async function getAddressAccessToken(): Promise<string | null> {
  // A local token may have been created without any matching server session.
  // Always await the existing deduplicated canonical start before using it.
  try {
    return (await startOrResumeClaraSession({ entrypoint: "address_input" })).session_token;
  } catch {
    return null;
  }
}
