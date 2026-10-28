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

/** An explicit request or Clara's latest offer enables the action. A new unrelated
 * user turn hides a previous offer immediately, without waiting for Clara's reply.
 */
export function shouldOfferHomeownerRegistration(turns: readonly RegistrationTurn[]): boolean {
  const last = turns[turns.length - 1];
  if (!last) return false;
  const previous = turns[turns.length - 2];
  if (last.role === "user") {
    if (isRegistrationRequest(last.text)) return true;
    const affirmative = /^(?:oui|yes|ok|d'accord|d’accord|volontiers|allons-y)[.!\s]*$/i.test(last.text.trim());
    return affirmative && previous?.role === "assistant" && isRegistrationRequest(previous.text);
  }
  return isRegistrationRequest(last.text) ||
    (previous?.role === "user" && isRegistrationRequest(previous.text));
}
