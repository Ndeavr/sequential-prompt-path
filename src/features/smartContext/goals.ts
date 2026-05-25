/**
 * UNPRO Smart Context — Contractor goal catalog.
 */
import type { GoalOption } from "./types";

export const CONTRACTOR_GOALS: GoalOption[] = [
  { key: "few_projects", labelFr: "Recevoir quelques projets", subFr: "Compléter mon horaire au besoin", emoji: "🎯" },
  { key: "fill_schedule", labelFr: "Remplir mon horaire", subFr: "Maximiser l'occupation hebdomadaire", emoji: "📅" },
  { key: "grow_fast", labelFr: "Croître rapidement", subFr: "Ajouter du volume et de l'équipe", emoji: "🚀" },
  { key: "less_travel", labelFr: "Réduire mes déplacements", subFr: "Concentrer mes projets près de chez moi", emoji: "🗺️" },
  { key: "bigger_contracts", labelFr: "Augmenter mes contrats moyens", subFr: "Cibler des projets plus payants", emoji: "💰" },
  { key: "dominate_territory", labelFr: "Dominer mon territoire", subFr: "Devenir la référence dans mes villes", emoji: "👑" },
  { key: "optimize_team", labelFr: "Optimiser mon équipe", subFr: "Mieux router les rendez-vous", emoji: "⚙️" },
];
