/** Show property/account registration only when it naturally follows a homeowner's
 * current conversation, never as a permanent footer on an empty chat.
 * This is presentation logic; the existing CTA owns authentication and navigation.
 */
type RegistrationTurn = { role: "user" | "assistant"; text: string };

const ACTION = /\b(?:enregistrer|enregistrez|inscrire|sauvegarder|conserver|creer|cree|creez|ouvrir|ajouter|register|save|create|open|add)\b/;
const OBJECT = /\b(?:propriete|passeport maison|dossier maison|mon compte|un compte|votre compte|compte unpro|ma maison|votre maison|my property|your property|home passport|home file|my account|an account|your account)\b/;
const NEGATIVE = /\b(?:ne veux pas|pas maintenant|sans creer|dont want|do not want|not now|no account)\b/;

function isRegistrationRequest(text: string): boolean {
  const normal = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ACTION.test(normal) && OBJECT.test(normal) && !NEGATIVE.test(normal);
}

/** Only the most recent exchange matters; switching topic makes old CTAs disappear. */
export function shouldOfferHomeownerRegistration(turns: readonly RegistrationTurn[]): boolean {
  return turns.slice(-2).some((turn) => isRegistrationRequest(turn.text));
}
