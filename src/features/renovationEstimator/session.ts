/**
 * Persistance locale du calculateur de rénovation.
 * Aucune donnée personnelle n'est stockée (pas de nom, téléphone, courriel,
 * ni adresse complète) — uniquement la progression non identifiante.
 */
import type { BuildingAge, PropertyKind, RenoCategory, ScopeLevel } from "./catalog";

const KEY = "unpro_reno_estimator_v1";

export interface EstimatorProgress {
  step: 1 | 2 | 3;
  category: RenoCategory | null;
  sizeSqft: number | null;
  scope: ScopeLevel;
  addons: string[];
  propertyKind: PropertyKind;
  age: BuildingAge;
  citySlug: string | null;
  /** Clé d'idempotence stable pour la conversion serveur. */
  idempotencyKey: string;
}

export function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `rk_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

export function loadProgress(): Partial<EstimatorProgress> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EstimatorProgress>;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProgress(p: EstimatorProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* quota — la progression reste en mémoire */
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
