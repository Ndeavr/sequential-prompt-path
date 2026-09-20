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
  /** Libellé du bouton d'ouverture, identique pour Clara et pour l'utilisateur. */
  ctaLabel?: string;
}

/**
 * Destinations canoniques. `null` = aucun écran dédié : Clara reste dans la
 * conversation et poursuit la qualification (jamais de route inventée).
 */
const DESTINATIONS: Record<ClaraWorkflowIntent, ClaraDestination | null> = {
  quote_comparison: { path: "/compare-quotes", spoken: "Oui — je vous y amène." },
  quote_analysis: { path: "/compare-quotes", spoken: "Oui — je vous y amène." },
  contractor_verification: { path: "/verifier-un-entrepreneur", spoken: "Oui — je vous y amène." },
  contractor_onboarding: { path: "/entrepreneurs/audit-ia", spoken: "Oui — je vous y amène.", ctaLabel: "Ouvrir mon audit gratuit" },
  affiliate_onboarding: { path: "/affilies/onboarding", spoken: "Oui — je vous y amène.", ctaLabel: "Ouvrir le formulaire" },
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

/**
 * Clara ne peut pas annoncer une ouverture avant qu'elle ait réussi :
 * ces phrases sont retirées du texte du modèle et remplacées, après coup,
 * par une confirmation réelle ou par un message d'échec avec action.
 */
export const PREMATURE_OPEN_ANNOUNCEMENT =
  /(je\s+(vous\s+)?(ai|viens\s+d['’])\s*ouvert[^.!?]*[.!?]?|vous\s+devriez\s+(la|le)\s+voir[^.!?]*[.!?]?|la\s+page\s+(est|s['’]est)\s+ouverte[^.!?]*[.!?]?)/gi;

export function stripOpenAnnouncement(text: string): string {
  return text.replace(PREMATURE_OPEN_ANNOUNCEMENT, "").replace(/\s{2,}/g, " ").trim();
}

export function destinationCtaLabel(destination: ClaraDestination): string {
  return destination.ctaLabel ?? "Ouvrir la page";
}

export function openSuccessMessage(destination: ClaraDestination): string {
  return destination.ctaLabel === "Ouvrir le formulaire"
    ? "Je vous ai ouvert le formulaire. Je reste ici si vous avez une question."
    : "Je vous ai ouvert la page. Je reste ici si vous avez une question.";
}

export function openFailureMessage(destination: ClaraDestination): string {
  return destination.ctaLabel === "Ouvrir le formulaire"
    ? "Je n'ai pas réussi à ouvrir le formulaire. Touchez ici pour continuer."
    : "Je n'ai pas réussi à ouvrir la page. Touchez ici pour continuer.";
}

type NavigateLike = (path: string, options?: { state?: unknown; replace?: boolean }) => void;

/** Une page UNPRO s'ouvre toujours dans le même onglet, jamais en popup. */
export function isInternalPath(target: string): boolean {
  return target.startsWith("/") && !target.startsWith("//");
}

/**
 * Ouverture unique, partagée par Clara et par le bouton visible.
 * Ferme le clavier mobile, change de route, puis vérifie réellement que
 * l'écran a changé avant de laisser Clara confirmer quoi que ce soit.
 */
export async function openClaraDestination(
  navigate: NavigateLike,
  destination: ClaraDestination,
  context?: { intent?: string; note?: string },
): Promise<{ ok: boolean }> {
  if (!isInternalPath(destination.path)) return { ok: false };

  try {
    const active = typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;
    active?.blur?.();

    navigate(destination.path, {
      state: { fromClara: true, claraIntent: context?.intent, claraContext: context?.note },
    });

    await new Promise<void>((resolve) => {
      if (typeof window === "undefined") return resolve();
      window.setTimeout(resolve, 120);
    });

    if (typeof window === "undefined") return { ok: true };
    const arrived = window.location.pathname === destination.path;
    if (arrived) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    return { ok: arrived };
  } catch {
    return { ok: false };
  }
}

/** Les liens externes gardent l'ouverture dans un nouvel onglet. */
export function openExternalUrl(url: string) {
  if (typeof window === "undefined" || isInternalPath(url)) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
