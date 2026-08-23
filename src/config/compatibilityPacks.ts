/**
 * UNPRO — Registre des packs de compatibilité entrepreneur.
 * Un seul questionnaire, une seule architecture : le pack change uniquement
 * la taxonomie (services, questions conditionnelles, préqualification).
 */
import {
  COMPAT_PREQUAL,
  COMPAT_PROJECT_QUESTIONS,
  COMPAT_SERVICES,
  TRADE_PACK,
  type PrequalDef,
  type ProjectQuestion,
  type ServiceDef,
  type Stance,
} from "./compatibilityExcavation";
import {
  ISOLATION_PREQUAL,
  ISOLATION_PROJECT_QUESTIONS,
  ISOLATION_SERVICES,
  ISOLATION_TRADE_PACK,
} from "./compatibilityIsolation";

export interface CompatPack {
  id: string;
  label: string;
  services: readonly ServiceDef[];
  projectQuestions: readonly ProjectQuestion[];
  prequal: readonly PrequalDef[];
}

export const COMPAT_PACKS: Record<string, CompatPack> = {
  [TRADE_PACK]: {
    id: TRADE_PACK,
    label: "Excavation / Fondations / Drainage",
    services: COMPAT_SERVICES,
    projectQuestions: COMPAT_PROJECT_QUESTIONS,
    prequal: COMPAT_PREQUAL,
  },
  [ISOLATION_TRADE_PACK]: {
    id: ISOLATION_TRADE_PACK,
    label: "Isolation / Entretoit / Enveloppe",
    services: ISOLATION_SERVICES,
    projectQuestions: ISOLATION_PROJECT_QUESTIONS,
    prequal: ISOLATION_PREQUAL,
  },
};

export const DEFAULT_TRADE_PACK = TRADE_PACK;

export function getCompatPack(id?: string | null): CompatPack {
  return (id && COMPAT_PACKS[id]) || COMPAT_PACKS[DEFAULT_TRADE_PACK];
}

/** Dimensions débloquées par les services retenus (priority ou accepted). */
export function packUnlockedDimensions(pack: CompatPack, prefs: Record<string, Stance>): Set<string> {
  const set = new Set<string>();
  for (const svc of pack.services) {
    const stance = prefs[svc.slug];
    if (stance === "priority" || stance === "accepted") {
      (svc.unlocks ?? []).forEach((d) => set.add(d));
    }
  }
  return set;
}

export function packVisibleProjectQuestions(
  pack: CompatPack,
  prefs: Record<string, Stance>,
): ProjectQuestion[] {
  const unlocked = packUnlockedDimensions(pack, prefs);
  return pack.projectQuestions.filter(
    (q) => !q.requires || q.requires.length === 0 || q.requires.some((d) => unlocked.has(d)),
  );
}

/** Étiquettes tous packs confondus (utilisé par l'admin). */
export function anyServiceLabel(slug: string): string {
  for (const p of Object.values(COMPAT_PACKS)) {
    const s = p.services.find((x) => x.slug === slug);
    if (s) return s.label;
  }
  return slug;
}

export function anyProjectLabel(dimension: string, key: string): string {
  for (const p of Object.values(COMPAT_PACKS)) {
    const q = p.projectQuestions.find((x) => x.dimension === dimension && x.key === key);
    if (q) return q.label;
  }
  return `${dimension}:${key}`;
}

export function anyPrequalLabel(criterion: string): string {
  for (const p of Object.values(COMPAT_PACKS)) {
    const c = p.prequal.find((x) => x.criterion === criterion);
    if (c) return c.label;
  }
  return criterion;
}
