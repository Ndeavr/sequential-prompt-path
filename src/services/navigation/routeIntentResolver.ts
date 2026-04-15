/**
 * UNPRO — Route Intent Resolver
 * Resolves broken/inaccessible routes to the best available destination.
 */

export interface RouteResolution {
  resolved: boolean;
  targetPath: string;
  resolutionType: "redirect" | "fallback_rendered" | "login_requested" | "alex_opened" | "parent_redirect";
  intentDetected?: string;
  message?: string;
  ctaLabel?: string;
}

// Role-based default destinations
const roleDefaults: Record<string, string> = {
  homeowner: "/dashboard",
  contractor: "/pro",
  admin: "/admin",
  partner: "/dashboard",
  guest: "/",
};

// Known route pattern → fallback mappings
const patternFallbacks: Array<{ pattern: RegExp; fallback: string; intent: string }> = [
  { pattern: /^\/admin/, fallback: "/admin", intent: "admin" },
  { pattern: /^\/pro/, fallback: "/pro", intent: "contractor" },
  { pattern: /^\/dashboard/, fallback: "/dashboard", intent: "homeowner" },
  { pattern: /^\/entrepreneur/, fallback: "/entrepreneur/onboarding-voice", intent: "contractor_onboarding" },
  { pattern: /^\/checkout/, fallback: "/tarifs", intent: "checkout" },
  { pattern: /^\/booking/, fallback: "/", intent: "booking" },
  { pattern: /^\/services\//, fallback: "/services", intent: "services" },
  { pattern: /^\/problemes\//, fallback: "/problemes", intent: "problem_detection" },
  { pattern: /^\/villes\//, fallback: "/villes", intent: "city" },
  { pattern: /^\/professionnels\//, fallback: "/professionnels", intent: "professionals" },
  { pattern: /^\/condo/, fallback: "/copropriete", intent: "condo" },
  { pattern: /^\/design/, fallback: "/design", intent: "design" },
  { pattern: /^\/alex/, fallback: "/alex", intent: "alex" },
  { pattern: /^\/courtier/, fallback: "/courtiers", intent: "broker" },
];

export function resolveRouteIntent(
  attemptedPath: string,
  userRole: string | null,
  isAuthenticated: boolean
): RouteResolution {
  // 1. Check pattern fallbacks
  for (const { pattern, fallback, intent } of patternFallbacks) {
    if (pattern.test(attemptedPath)) {
      return {
        resolved: true,
        targetPath: fallback,
        resolutionType: "parent_redirect",
        intentDetected: intent,
        message: "Redirection vers la section correspondante",
      };
    }
  }

  // 2. Role-based fallback
  if (isAuthenticated && userRole) {
    return {
      resolved: true,
      targetPath: roleDefaults[userRole] || "/",
      resolutionType: "fallback_rendered",
      intentDetected: "role_home",
      message: "Retour à votre espace",
    };
  }

  // 3. Guest fallback
  return {
    resolved: true,
    targetPath: "/",
    resolutionType: "fallback_rendered",
    intentDetected: "generic",
    message: "Retour à l'accueil",
  };
}

export function isGoogleEntry(): boolean {
  if (typeof document === "undefined") return false;
  const ref = document.referrer;
  return /google\./i.test(ref);
}

export function detectIntentFromPath(path: string): string {
  for (const { pattern, intent } of patternFallbacks) {
    if (pattern.test(path)) return intent;
  }
  return "generic";
}
