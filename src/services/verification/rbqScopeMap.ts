/**
 * UNPRO Verification Engine — RBQ License Scope Intelligence
 *
 * Maps RBQ subcategory codes to homeowner-friendly work types.
 */
import type { MappedWorkType, ProjectFit } from "./types";

export const RBQ_SCOPE_MAP: Record<string, { label_fr: string; work_types: string[] }> = {
  "1.1":  { label_fr: "Bâtiments résidentiels neufs", work_types: ["Construction neuve", "Maison neuve", "Jumelé", "Cottage"] },
  "1.2":  { label_fr: "Bâtiments résidentiels existants (rénovation)", work_types: ["Rénovation générale", "Agrandissement", "Sous-sol", "Cuisine", "Salle de bain"] },
  "2.1":  { label_fr: "Excavation et terrassement", work_types: ["Excavation", "Terrassement", "Drain français", "Fondation"] },
  "3.1":  { label_fr: "Structures de béton", work_types: ["Fondation béton", "Dalle", "Mur de soutènement", "Réparation de fissures"] },
  "4.1":  { label_fr: "Maçonnerie, pierre", work_types: ["Brique", "Pierre", "Bloc de béton", "Cheminée", "Rejointoiement"] },
  "5.1":  { label_fr: "Acier, métaux ouvrés", work_types: ["Structure acier", "Escalier métal", "Rampe", "Balcon métal"] },
  "6.1":  { label_fr: "Menuiserie, charpenterie", work_types: ["Charpente", "Menuiserie", "Plancher bois", "Escalier bois", "Terrasse", "Cabanon"] },
  "7.1":  { label_fr: "Couverture (toiture)", work_types: ["Remplacement de toiture", "Réparation de toiture", "Bardeaux d'asphalte", "Membrane élastomère", "Toit plat", "Toiture en tôle"] },
  "8.1":  { label_fr: "Revêtement extérieur", work_types: ["Revêtement vinyle", "Canexel", "Crépi", "Stucco", "Bardage", "Fibrociment"] },
  "9.1":  { label_fr: "Isolation générale", work_types: ["Isolation des murs", "Isolation d'entretoit", "Pare-vapeur", "Coupe-froid"] },
  "9.2":  { label_fr: "Isolation thermique", work_types: ["Isolation de grenier", "Isolation d'entretoit", "Isolation des murs", "Cellulose soufflée", "Laine soufflée", "Uréthane giclé", "Polystyrène"] },
  "10.1": { label_fr: "Gypse, plâtrage", work_types: ["Pose gypse", "Tirage de joints", "Plâtrage", "Crépi intérieur", "Faux plafond"] },
  "11.1": { label_fr: "Peinture", work_types: ["Peinture intérieure", "Peinture extérieure", "Teinture", "Vernissage", "Décapage"] },
  "12.1": { label_fr: "Carrelage, céramique", work_types: ["Céramique plancher", "Céramique murale", "Mosaïque", "Porcelaine", "Dosseret"] },
  "13.1": { label_fr: "Revêtement souple", work_types: ["Vinyle", "Linoléum", "Tapis", "Couvre-plancher"] },
  "14.1": { label_fr: "Ébénisterie, menuiserie architecturale", work_types: ["Armoires de cuisine", "Vanités", "Moulures", "Boiserie"] },
  "15.1": { label_fr: "Électricité", work_types: ["Filage", "Panneau électrique", "Prises", "Éclairage", "Mise aux normes", "Borne de recharge"] },
  "15.7": { label_fr: "Systèmes d'alarme et sécurité", work_types: ["Alarme incendie", "Système de sécurité", "Caméras de surveillance", "Détecteurs"] },
  "16.1": { label_fr: "Plomberie", work_types: ["Plomberie générale", "Chauffe-eau", "Tuyauterie", "Robinetterie", "Toilette", "Drain"] },
  "17.1": { label_fr: "Chauffage", work_types: ["Fournaise", "Thermopompe", "Plancher chauffant", "Chaudière", "Radiateur"] },
  "17.2": { label_fr: "Ventilation, climatisation", work_types: ["Échangeur d'air", "Climatisation centrale", "VRC", "Conduits", "Hotte"] },
  "18.1": { label_fr: "Portes, fenêtres", work_types: ["Remplacement fenêtres", "Portes d'entrée", "Portes-fenêtres", "Fenêtres PVC", "Fenêtres aluminium"] },
  "19.1": { label_fr: "Systèmes de gicleurs", work_types: ["Gicleurs résidentiels", "Système d'extinction"] },
};

/** Map RBQ subcategory codes to structured work types */
export function mapRbqSubcategories(codes: string[]): MappedWorkType[] {
  return codes
    .map((code) => {
      const entry = RBQ_SCOPE_MAP[code];
      if (!entry) return null;
      return { rbq_code: code, label_fr: entry.label_fr, work_types: entry.work_types };
    })
    .filter(Boolean) as MappedWorkType[];
}

/** Compare project description keywords against mapped work types */
export function evaluateProjectFit(
  mappedTypes: MappedWorkType[],
  projectDescription: string | null
): { fit: ProjectFit; score: number; explanation: string } {
  if (!projectDescription || projectDescription.trim().length === 0) {
    return { fit: null, score: 0, explanation: "Aucun projet décrit — compatibilité non évaluée." };
  }
  if (mappedTypes.length === 0) {
    return { fit: "verify", score: 20, explanation: "Aucune sous-catégorie RBQ détectée — vérification recommandée." };
  }

  const projectLower = projectDescription.toLowerCase();
  const allWorkTypes = mappedTypes.flatMap((m) => m.work_types);
  const matches = allWorkTypes.filter((wt) => projectLower.includes(wt.toLowerCase()));
  const ratio = matches.length / Math.max(allWorkTypes.length, 1);

  if (matches.length >= 2 || ratio >= 0.3) {
    return {
      fit: "compatible",
      score: Math.min(95, 60 + Math.round(ratio * 40)),
      explanation: `${matches.length} type(s) de travaux correspondent à la portée de licence.`,
    };
  }
  if (matches.length === 1) {
    return {
      fit: "partial",
      score: 50,
      explanation: `Correspondance partielle détectée (${matches[0]}). Vérification complémentaire recommandée.`,
    };
  }
  // Check broader keyword proximity
  const categoryLabels = mappedTypes.map((m) => m.label_fr.toLowerCase());
  const categoryMatch = categoryLabels.some((lbl) => projectLower.includes(lbl.split(" ")[0]));
  if (categoryMatch) {
    return {
      fit: "partial",
      score: 40,
      explanation: "Catégorie de licence potentiellement liée au projet décrit.",
    };
  }

  return {
    fit: "incompatible",
    score: 15,
    explanation: "Aucune correspondance détectée entre la licence et le projet décrit. Vérification complémentaire recommandée.",
  };
}
