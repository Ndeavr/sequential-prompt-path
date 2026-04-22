/**
 * friendlyErrors — Maps technical errors to fr-CA human messages.
 * Never show raw error strings to users.
 */

const ERROR_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /edge function.*500/i, message: "Service temporairement indisponible. Réessayez." },
  { pattern: /no such price/i, message: "Plan introuvable. Contactez-nous." },
  { pattern: /invalid payload/i, message: "Données incorrectes. Vérifiez vos informations." },
  { pattern: /idle.?timeout/i, message: "La connexion a expiré. Réessayez." },
  { pattern: /network|fetch|ERR_NETWORK/i, message: "Connexion internet instable. Vérifiez votre réseau." },
  { pattern: /unauthorized|not authenticated/i, message: "Session expirée. Reconnectez-vous." },
  { pattern: /rate.?limit/i, message: "Trop de tentatives. Réessayez dans quelques secondes." },
  { pattern: /duplicate|already exists/i, message: "Cette information existe déjà." },
  { pattern: /invalid.*email/i, message: "Veuillez entrer un courriel valide." },
  { pattern: /invalid.*phone/i, message: "Veuillez entrer un numéro valide." },
  { pattern: /stripe|payment/i, message: "Erreur de paiement. Vérifiez vos informations et réessayez." },
  { pattern: /timeout/i, message: "La requête a pris trop de temps. Réessayez." },
  { pattern: /signup.*disabled/i, message: "L'inscription est temporairement désactivée." },
  { pattern: /user.*registered/i, message: "Ce courriel est déjà utilisé. Connectez-vous plutôt." },
];

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error
    ? err.message
    : typeof err === "string"
      ? err
      : (err as any)?.message || (err as any)?.error || "";

  for (const { pattern, message } of ERROR_MAP) {
    if (pattern.test(msg)) return message;
  }

  return "Une erreur est survenue. Veuillez réessayer.";
}
