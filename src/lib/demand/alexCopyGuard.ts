/**
 * UNPRO — Alex copy guard for no-match scenarios.
 * Replaces forbidden "no contractor" phrasing with queue/expansion language.
 */

export const FORBIDDEN_NO_MATCH_PHRASES = [
  /aucun entrepreneur/gi,
  /no contractor/gi,
  /we'?ll get back to you/gi,
  /could not find/gi,
  /pas d'entrepreneur (disponible|trouvé)/gi,
  /no matches? found/gi,
];

export const ALLOWED_WAITING_PHRASES = [
  "Nous étendons la couverture",
  "Votre projet est en file",
  "Votre recommandation est en préparation",
];

export function sanitizeAlexNoMatchCopy(text: string, ctx?: { city?: string; category?: string; position?: number | null }): string {
  let out = text;
  const fallback = buildWaitingCopy(ctx);
  for (const re of FORBIDDEN_NO_MATCH_PHRASES) {
    if (re.test(out)) out = out.replace(re, fallback);
  }
  return out;
}

export function buildWaitingCopy(ctx?: { city?: string; category?: string; position?: number | null }): string {
  const cat = ctx?.category ?? "entrepreneur compatible";
  const city = ctx?.city ?? "votre région";
  const pos = ctx?.position && ctx.position > 0 ? ` Vous êtes #${ctx.position} en file.` : "";
  return `Nous étendons la couverture pour ${cat} à ${city}.${pos} Votre recommandation est en préparation.`;
}

export function containsForbiddenNoMatchPhrase(text: string): boolean {
  return FORBIDDEN_NO_MATCH_PHRASES.some((re) => re.test(text));
}
