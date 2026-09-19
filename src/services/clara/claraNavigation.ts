/**
 * UNPRO — Clara conduit, elle n'oriente pas.
 *
 * Règle produit centrale : si l'intention correspond à un écran réellement
 * présent dans l'application, Clara y amène l'utilisateur elle-même. Elle ne
 * dit jamais « cherchez sur le site » ni « allez dans le menu ».
 *
 * Aucune route n'est inventée ici : chaque destination existe dans
 * `src/app/router.tsx` et est vérifiée par le test de garde.
 */
import type { ClaraWorkflowIntent } from "@/services/clara/claraWorkflow";

export interface ClaraDestination {
  /** Route canonique existante. */
  path: string;
  /** Ce que Clara dit avant de naviguer, jamais une instruction de recherche. */
  spoken: string;
}

/**
 * Destinations canoniques. `null` = aucun écran dédié : Clara reste dans la
 * conversation et poursuit la qualification (jamais de route inventée).
 */
const DESTINATIONS: Record<ClaraWorkflowIntent, ClaraDestination | null> = {
  quote_comparison: { path: "/compare-quotes", spoken: "Oui — je vous y amène." },
  quote_analysis: { path: "/compare-quotes", spoken: "Oui — je vous y amène." },
  contractor_verification: { path: "/verifier-un-entrepreneur", spoken: "Oui — je vous y amène." },
  contractor_onboarding: { path: "/entrepreneur/onboarding", spoken: "Oui — je vous y amène." },
  affiliate_onboarding: { path: "/affilies/onboarding", spoken: "Oui — je vous y amène." },
  design_generation: { path: "/design", spoken: "Oui — je vous y amène." },
  photo_problem_analysis: null,
  video_problem_analysis: null,
  contractor_search: { path: "/decrire-mon-projet", spoken: "Oui — je vous y amène." },
  homeowner_problem: null,
  appointment_booking: null,
  general_question: null,
};

/**
 * Intentions faibles : on ne navigue jamais sur un signal quasi nul.
 * Le classificateur normalise fortement ses scores : une demande explicite
 * (« comparer mes soumissions ») se situe autour de 0.3.
 */
const MIN_CONFIDENCE = 0.15;

export function resolveClaraDestination(
  intent: ClaraWorkflowIntent,
  confidence = 1,
): ClaraDestination | null {
  if (confidence < MIN_CONFIDENCE) return null;
  return DESTINATIONS[intent] ?? null;
}

/**
 * Formulations interdites : elles renvoient l'utilisateur chercher lui-même.
 */
export const FORBIDDEN_GUIDANCE =
  /(cherchez|recherchez|chercher)\s+(sur\s+le\s+site|dans\s+le\s+site)|allez\s+(dans|sur|à)\s+(le\s+menu|la\s+page|la\s+section)|rendez-vous\s+sur\s+la\s+page|vous\s+(pouvez|pourrez)\s+(trouver|retrouver)\s+(cela|ça|cette\s+\w+)\s+(sur|dans)|consultez\s+la\s+page|visitez\s+la\s+page|naviguez\s+vers/i;

export function containsForbiddenGuidance(text: string): boolean {
  return FORBIDDEN_GUIDANCE.test(text);
}

/**
 * Remplace une consigne de recherche par une prise en charge réelle.
 * Sans destination connue, Clara reste dans la conversation plutôt que
 * d'envoyer l'utilisateur chercher : on retire simplement la phrase fautive.
 */
export function rewriteGuidance(text: string, destination: ClaraDestination | null): string {
  if (!containsForbiddenGuidance(text)) return text;

  const kept = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !containsForbiddenGuidance(sentence))
    .join(" ")
    .trim();

  if (destination) return kept ? `${kept} ${destination.spoken}` : destination.spoken;
  return kept || "Je m'en occupe avec vous ici.";
}
