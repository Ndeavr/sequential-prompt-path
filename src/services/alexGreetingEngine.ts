/**
 * AlexGreetingEngine — Time-aware, locale-aware greeting system.
 * Bonjour (5h-11h), Bon après-midi (12h-17h), Bonsoir (18h-4h).
 */

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function getGreetingPeriod(hour?: number | null): GreetingPeriod {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

export function getGreetingText(period: GreetingPeriod, lang: 'fr' | 'en' = 'fr'): string {
  if (lang === 'en') {
    switch (period) {
      case 'morning': return 'Good morning';
      case 'afternoon': return 'Good afternoon';
      case 'evening': return 'Good evening';
    }
  }
  switch (period) {
    case 'morning': return 'Bonjour';
    case 'afternoon': return 'Bon après-midi';
    case 'evening': return 'Bonsoir';
  }
}

export function getAlexGreetingByLocalTime(
  firstName?: string | null,
  isLoggedIn?: boolean,
  hour?: number | null,
  lang: 'fr' | 'en' = 'fr'
): string {
  const period = getGreetingPeriod(hour);
  const greeting = getGreetingText(period, lang);

  if (isLoggedIn && firstName?.trim()) {
    return `${greeting} ${firstName.trim()}.`;
  }
  return `${greeting}.`;
}

/**
 * Build a full greeting + context sentence for Alex's initial prompt.
 */
export function buildAlexInitialGreeting(options: {
  firstName?: string | null;
  isLoggedIn?: boolean;
  intent?: string;
  hour?: number | null;
}): string {
  const { firstName, isLoggedIn, intent, hour } = options;
  const greeting = getAlexGreetingByLocalTime(firstName, isLoggedIn, hour);

  switch (intent) {
    case 'probleme':
      return `${greeting} Je peux vous aider à trouver une solution! Avez-vous une photo ou pouvez-vous me décrire votre problème?`;
    case 'projet':
      return `${greeting} Un nouveau projet? Je peux certainement vous aider! Avez-vous une photo de ce que vous voulez améliorer ou pouvez-vous me décrire votre projet?`;
    case 'avis':
      return `${greeting} Vous aimeriez que j'analyse vos soumissions? Pas de problème! Vous pouvez les téléverser ou les prendre en photo ici.`;
    default:
      return `${greeting} Comment puis-je vous aider aujourd'hui?`;
  }
}
