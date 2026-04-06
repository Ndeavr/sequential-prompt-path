/**
 * UNPRO — Condo Direct Pricing Logic
 * X unités = Y $ / an — no complexity exposed.
 */

export function calculateCondoPrice(units: number): number {
  const u = Math.max(2, Math.round(units));
  if (u <= 12) return 180;
  if (u <= 30) return u * 12;
  if (u <= 75) return u * 9;
  if (u <= 150) return u * 7.5;
  return u * 6;
}

export function getPricePerUnit(units: number): number {
  return calculateCondoPrice(units) / Math.max(1, units);
}

export function getPricePerUnitPerMonth(units: number): number {
  return getPricePerUnit(units) / 12;
}

export function getDynamicBadge(units: number): string {
  const monthly = getPricePerUnitPerMonth(units);
  if (monthly < 1) return "Moins de 1 $ / unité / mois";
  if (units >= 75) return "Tarif ultra compétitif";
  return "Optimisé pour votre taille d'immeuble";
}

export type FeatureTier = "base" | "13+" | "30+" | "75+" | "150+";

export interface IncludedFeature {
  label: string;
  tier: FeatureTier;
}

export const INCLUDED_FEATURES: IncludedFeature[] = [
  // Base
  { label: "Passeport Immeuble complet", tier: "base" },
  { label: "Inventaire des composantes", tier: "base" },
  { label: "Journal de maintenance", tier: "base" },
  { label: "Calendrier d'entretien", tier: "base" },
  { label: "Coffre-fort documents", tier: "base" },
  { label: "Registre du syndicat", tier: "base" },
  { label: "Administrateurs illimités", tier: "base" },
  { label: "Checklist Loi 16", tier: "base" },
  // 13+
  { label: "Recherche intelligente documents", tier: "13+" },
  { label: "Rapports avancés PDF", tier: "13+" },
  { label: "Attestations automatiques", tier: "13+" },
  // 30+
  { label: "Score de santé immeuble", tier: "30+" },
  { label: "Analyse de soumissions IA", tier: "30+" },
  { label: "Recommandations UNPRO", tier: "30+" },
  // 75+
  { label: "Prévisions de maintenance IA", tier: "75+" },
  { label: "Alertes intelligentes", tier: "75+" },
  { label: "Priorisation des travaux", tier: "75+" },
  // 150+
  { label: "Projection fonds de prévoyance 25 ans", tier: "150+" },
  { label: "Dossiers prêts audit / partage", tier: "150+" },
  { label: "Support prioritaire VIP", tier: "150+" },
];

export function getFeaturesForUnits(units: number): IncludedFeature[] {
  return INCLUDED_FEATURES.filter((f) => {
    if (f.tier === "base") return true;
    if (f.tier === "13+" && units >= 13) return true;
    if (f.tier === "30+" && units >= 30) return true;
    if (f.tier === "75+" && units >= 75) return true;
    if (f.tier === "150+" && units >= 150) return true;
    return false;
  });
}

export const EXAMPLE_UNITS = [4, 8, 12, 20, 30, 40, 60, 75, 100, 150];

export const SNAP_POINTS = [4, 12, 30, 75, 150];
