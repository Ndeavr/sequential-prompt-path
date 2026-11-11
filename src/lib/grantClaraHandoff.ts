/**
 * Prépare un transfert explicite du calculateur vers la conversation Clara.
 * Ces données sont celles déclarées par l'utilisateur au moment du clic,
 * jamais des valeurs "vérifiées" par Rénoclimat/LogisVert.
 * Aucun contact, adresse, jeton ou identifiant n'entre dans ce résumé.
 */
import {
  GRANT_WORKS, calculateGrants,
  type GrantInputs, type GrantResult, type GrantWork,
} from "@/lib/grantCalculator2026";

export type GrantHandoffPurpose = "project" | "cost";

const dollar = (amount: number) => new Intl.NumberFormat("fr-CA", {
  style: "currency", currency: "CAD", maximumFractionDigits: 0,
}).format(amount);

const described = (selected: GrantWork[]): string => selected.length
  ? selected.map(id => GRANT_WORKS.find(w => w.id === id)?.label ?? id).join(", ")
  : "aucun type de travaux encore sélectionné";

const resultLine = (r: GrantResult): string => {
  const label = GRANT_WORKS.find(w => w.id === r.work)?.label ?? r.work;
  return r.amount === null
    ? `- ${label} : montant non calculé; renseignements ou admissibilité à confirmer.`
    : `- ${label} : ${dollar(r.amount)} estimés, conditionnels, jamais confirmés par le programme.`;
};

export function buildGrantClaraHandoff(input: GrantInputs, purpose: GrantHandoffPurpose): string {
  const estimate = calculateGrants(input);
  const lines = [
    "Je poursuis mon projet de rénovation depuis le calculateur de subventions UNPRO.",
    "Voici les informations que J'AI SAISIES (toutes déclarées, non vérifiées) :",
    `Travaux sélectionnés : ${described(input.selected)}.`,
    `Habitation : ${input.building === "maison" ? "maison" : "immeuble multilogement (type exact à préciser)"}.`,
    `Historique Rénoclimat : ${input.regime === "nouveau" ? "nouveau parcours depuis octobre 2026 (à confirmer)" : input.regime === "ancien" ? "dossier commencé avant octobre 2026" : "incertain / à clarifier"}.`,
  ];

  if (input.selected.includes("toit")) {
    lines.push(`Toiture : ${input.roofType === "grenier" ? "grenier / entretoit" : "toit plat / cathédrale"}${input.roofArea > 0 ? `, ${input.roofArea} pi²` : ", superficie inconnue"}${input.roofRAdded > 0 ? `, R ajouté : ${input.roofRAdded}` : ", R ajouté inconnu"}${input.roofRFinal > 0 ? `, R final : ${input.roofRFinal}` : ", R final inconnu"}.`);
  }
  if (input.selected.includes("fenetres")) {
    lines.push(`Fenêtres/portes-patio : ${input.windowCount > 0 ? `${Math.floor(input.windowCount)} ouvertures brutes` : "nombre d'ouvertures inconnu"}; modèles ENERGY STAR « Les plus écoénergétiques » ${input.windowsMostEfficient ? "prévus (non vérifiés)" : "non confirmés"}.`);
  }
  if (input.selected.includes("murs")) {
    lines.push(`Murs extérieurs : ${input.wallsArea > 0 ? `${input.wallsArea} pi² nets` : "surface inconnue"}; R ajouté ${input.wallsRAdded > 0 ? input.wallsRAdded : "inconnu"}.`);
  }
  if (input.selected.includes("fondations")) {
    lines.push(`Fondations : type déclaré ${input.foundationType}; ${input.foundationArea > 0 ? `${input.foundationArea} pi²` : "surface inconnue"}; R ajouté ${input.foundationRAdded > 0 ? input.foundationRAdded : "inconnu"}.`);
  }
  if (input.selected.includes("thermopompe")) {
    lines.push("Thermopompe : modèle et admissibilité LogisVert non vérifiés; aucun montant présumé.");
  }
  if (input.selected.includes("calfeutrage")) {
    lines.push("Calfeutrage : mesure LogisVert sous conditions avec isolation du toit, jamais garanti seul.");
  }
  if (estimate.results.length) {
    lines.push("Résultats INDICATIFS du calculateur (ne prouvent pas l'admissibilité) :");
    lines.push(...estimate.results.map(resultLine));
  }
  if (estimate.logisvertRoofCaulking !== null) {
    lines.push("LogisVert toiture + calfeutrage : montant potentiel distinct de 1 500 $, non cumulé automatiquement à Rénoclimat.");
  }
  if (purpose === "cost") {
    lines.push("Je voudrais maintenant comprendre le COÛT probable de ces travaux avant les aides, avec une fourchette seulement si elle est étayée.");
  } else {
    lines.push("Je veux poursuivre le projet et, si pertinent, préparer un rendez-vous exclusif avec un professionnel réellement admissible et disponible.");
  }
  lines.push("Clara, reprends CES réponses sans les redemander. Pose seulement la prochaine question nécessaire, une à la fois. Vérifie ce qui est inconnu; ne présente aucune subvention, certification, disponibilité ou rendez-vous comme confirmé.");
  return lines.join("\n");
}
