/**
 * AlexResponsePolicyEngine — Enforces response quality rules.
 * 
 * BANNED RESPONSES:
 * - "Je cherche le meilleur professionnel" without knowing the service
 * - "J'ai trouvé la meilleure option" without matching logic
 * - "On reprend où on en était" without verified memory
 * - Any promise of callback without contact info
 * - Any arbitrary trade inference from a city alone
 */

import type { AlexSessionMemory } from "./alexMemoryEngine";

export interface PolicyCheck {
  allowed: boolean;
  violation: string | null;
  replacement: string | null;
}

const BANNED_PATTERNS: Array<{
  pattern: RegExp;
  condition: (mem: AlexSessionMemory) => boolean;
  violation: string;
  replacement: string;
}> = [
  {
    pattern: /je cherche le meilleur professionnel/i,
    condition: (mem) => !mem.service_category,
    violation: "CONTRACTOR_SEARCH_WITHOUT_SERVICE",
    replacement: "Pour bien vous orienter, quel type de travaux recherchez-vous ?",
  },
  {
    pattern: /j'ai trouvé la meilleure option/i,
    condition: (mem) => !mem.recommended_contractor_id,
    violation: "CLAIM_MATCH_WITHOUT_DATA",
    replacement: "Je cherche le professionnel idéal pour votre projet.",
  },
  {
    pattern: /on reprend où on en était/i,
    condition: (mem) => !mem.need_qualified && !mem.current_intent,
    violation: "RESUME_WITHOUT_MEMORY",
    replacement: "Comment puis-je vous aider ?",
  },
  {
    pattern: /je vais vous rappeler/i,
    condition: () => true,
    violation: "CALLBACK_PROMISE",
    replacement: "Je suis disponible ici quand vous êtes prêt.",
  },
  {
    pattern: /compris, je note votre besoin/i,
    condition: (mem) => !mem.need_qualified,
    violation: "ACKNOWLEDGE_WITHOUT_UNDERSTANDING",
    replacement: "Pouvez-vous me donner plus de détails ?",
  },
  // ── Plan Truth Engine Rules ──
  {
    pattern: /gestion de projet|facturation|crm|suivi de chantier/i,
    condition: () => true,
    violation: "HALLUCINATION_NONEXISTENT_FEATURE",
    replacement: "UNPRO vous connecte avec des rendez-vous exclusifs qualifiés par IA. Voulez-vous voir les plans disponibles ?",
  },
  {
    pattern: /comptabilit[ée]|paie|inventaire|erp|feuille de temps/i,
    condition: () => true,
    violation: "HALLUCINATION_NONEXISTENT_FEATURE",
    replacement: "UNPRO se concentre sur la génération de rendez-vous exclusifs et le matching IA. Comment puis-je vous aider ?",
  },
  {
    pattern: /gestion\s+des?\s+(?:employ[ée]s|factures|documents)|bon\s+de\s+commande/i,
    condition: () => true,
    violation: "HALLUCINATION_ADMIN_TOOLS",
    replacement: "UNPRO optimise vos revenus via des rendez-vous exclusifs. Voulez-vous découvrir nos plans ?",
  },
];

// Generic filler messages to suppress
const FILLER_PATTERNS = [
  /^je m'en occupe\.?$/i,
  /^compris\.?$/i,
  /^je comprends\.?$/i,
  /^parfait, je m'en occupe\.?$/i,
  /^très bien\.?$/i,
];

export function checkResponsePolicy(
  proposedMessage: string,
  memory: AlexSessionMemory,
): PolicyCheck {
  // Check banned patterns
  for (const rule of BANNED_PATTERNS) {
    if (rule.pattern.test(proposedMessage) && rule.condition(memory)) {
      return {
        allowed: false,
        violation: rule.violation,
        replacement: rule.replacement,
      };
    }
  }

  // Check filler-only messages (allow if followed by actionable content)
  if (FILLER_PATTERNS.some(p => p.test(proposedMessage.trim()))) {
    return {
      allowed: false,
      violation: "FILLER_ONLY_MESSAGE",
      replacement: null, // Skip entirely, let next action speak
    };
  }

  return { allowed: true, violation: null, replacement: null };
}

/**
 * Apply policy to a proposed response. Returns the safe version.
 */
export function enforcePolicy(
  proposedMessage: string,
  memory: AlexSessionMemory,
): string {
  const check = checkResponsePolicy(proposedMessage, memory);
  if (check.allowed) return proposedMessage;
  if (check.replacement) return check.replacement;
  return ""; // Suppress entirely
}
