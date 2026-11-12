/** Pont « partenariat à commission » → Clara via le deep-link existant /alex?q= (aucun prix, aucun taux, aucune coordonnée). */
export function buildCommissionClaraLink(fr = true): string {
  const q = fr
    ? "Je suis entrepreneur. Je veux discuter d’un partenariat à 100 % à commission, sur entente personnalisée."
    : "I am a contractor. I want to discuss a 100% commission partnership, under a custom agreement.";
  return `/alex?q=${encodeURIComponent(q)}`;
}
