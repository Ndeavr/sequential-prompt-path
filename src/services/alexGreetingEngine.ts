/**
 * AlexGreetingEngine — Time-aware, locale-aware greeting system.
 * Bonjour (5h-11h), Bon après-midi (12h-17h), Bonsoir (18h-4h).
 */

import { buildAlexOpening, type AlexIntent } from "@/services/alexOpeningTemplates";

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
 * Now routes through the canonical Alex Opening Templates engine so every
 * opening is outcome-oriented (orchestrator-style, never chatbot-style).
 */
export function buildAlexInitialGreeting(options: {
  firstName?: string | null;
  isLoggedIn?: boolean;
  intent?: string;
  hour?: number | null;
}): string {
  const { firstName, intent } = options;
  // Lazy require to avoid circular import risk in legacy callers.
  const { buildAlexOpening } =
    require("@/services/alexOpeningTemplates") as typeof import("@/services/alexOpeningTemplates");
  const intentMap: Record<string, import("@/services/alexOpeningTemplates").AlexIntent> = {
    probleme: "repair",
    projet: "renovation",
    avis: "comparison",
    urgence: "emergency",
  };
  return buildAlexOpening({
    firstName: firstName ?? undefined,
    intent: intent ? intentMap[intent] : undefined,
  });
}

