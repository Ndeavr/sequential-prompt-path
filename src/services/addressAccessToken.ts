/** Jeton de session invitée Clara pour la vérification d'adresse (aucune inscription requise). */
import { peekClaraSessionToken, startOrResumeClaraSession } from "@/services/clara/claraSession";

export async function getAddressAccessToken(): Promise<string | null> {
  const known = peekClaraSessionToken();
  if (known) return known;
  try {
    return (await startOrResumeClaraSession({ entrypoint: "address_input" })).session_token;
  } catch {
    return null;
  }
}
