/**
 * UNPRO — calculateur indicatif des aides énergétiques québécoises (novembre 2026).
 * Valeurs nouvelles Rénoclimat depuis le 1er octobre 2026.
 * Sources officielles :
 * https://www.quebec.ca/habitation-territoire/chauffage-consommation-energie/aide-financiere-renovation-ecoenergetique/renoclimat/nouveautes-adaptation-inondations
 * https://cdn-contenu.quebec.ca/cdn-contenu/environnement/transition-energetique/residentiel-renoclimat/renoclimat-guide-participant.pdf
 * https://www.hydroquebec.com/residentiel/mieux-consommer/aides-financieres/logisvert/residentiel.html
 * Ne jamais afficher une estimation comme une admissibilité ou un versement confirmé.
 */
export type GrantWork = "toit" | "murs" | "fondations" | "fenetres" | "thermopompe" | "calfeutrage";
export type BuildingType = "maison" | "multilogement";
export type GrantRegime = "nouveau" | "ancien" | "incertain";
export type FoundationType = "murs-sous-sol" | "dalle-sous-sol" | "murs-vide-sanitaire" | "plancher-vide-sanitaire" | "plancher-expose";
export type RoofType = "grenier" | "plat";

export const GRANT_SOURCES = {
  renoclimat: "https://www.quebec.ca/habitation-territoire/chauffage-consommation-energie/aide-financiere-renovation-ecoenergetique/renoclimat/nouveautes-adaptation-inondations",
  guide: "https://cdn-contenu.quebec.ca/cdn-contenu/environnement/transition-energetique/residentiel-renoclimat/renoclimat-guide-participant.pdf",
  logisvert: "https://www.hydroquebec.com/residentiel/mieux-consommer/aides-financieres/logisvert/residentiel.html",
} as const;

export const GRANT_WORKS: { id: GrantWork; label: string; hint: string; page: string }[] = [
  { id: "toit", label: "Entretoit / grenier / toiture", hint: "Rénoclimat et LogisVert", page: "/subventions/isolation-entretoit" },
  { id: "fenetres", label: "Fenêtres et portes-patio", hint: "Rénoclimat : modèles Les plus écoénergétiques", page: "/subventions/fenetres-portes-patio" },
  { id: "murs", label: "Murs extérieurs", hint: "Isolation avec ajout d'au moins R-9", page: "/subventions/murs-exterieurs" },
  { id: "fondations", label: "Sous-sol, fondations et vide sanitaire", hint: "Isolation selon la surface et le type", page: "/subventions/isolation-fondations" },
  { id: "thermopompe", label: "Thermopompe", hint: "Programme LogisVert, selon le modèle", page: "/subventions/thermopompes-logisvert" },
  { id: "calfeutrage", label: "Calfeutrage / étanchéité", hint: "LogisVert : avec isolation du toit", page: "/subventions/calfeutrage-logisvert" },
];

export interface GrantInputs {
  selected: GrantWork[];
  building: BuildingType;
  regime: GrantRegime;
  roofType: RoofType;
  roofArea: number;
  roofRAdded: number;
  roofRFinal: number;
  wallsArea: number;
  wallsRAdded: number;
  foundationType: FoundationType;
  foundationArea: number;
  foundationRAdded: number;
  windowCount: number;
  windowsMostEfficient: boolean;
}

export interface GrantResult {
  work: GrantWork;
  amount: number | null;
  ceiling: number | null;
  note: string;
}

const FOUNDATION_RATES: Record<FoundationType, { rate: number; minArea: number; minR: number }> = {
  "murs-sous-sol": { rate: 2.5, minArea: 300, minR: 15 },
  "dalle-sous-sol": { rate: 0.5, minArea: 300, minR: 3 },
  "murs-vide-sanitaire": { rate: 3.5, minArea: 300, minR: 23 },
  "plancher-vide-sanitaire": { rate: 3.5, minArea: 300, minR: 23 },
  "plancher-expose": { rate: 3.5, minArea: 150, minR: 23 },
};

export function calculateGrants(input: GrantInputs): {
  results: GrantResult[];
  renoclimatSubtotal: number | null;
  logisvertRoofCaulking: number | null;
} {
  const multi = input.building === "multilogement";
  const results: GrantResult[] = [];
  const newRegime = input.regime === "nouveau";
  const pending = "Montant non calculé : précisez les dimensions et les critères d'isolation; le programme devra confirmer l'admissibilité.";
  const legacy = "Dossier antérieur ou régime incertain : ne pas appliquer les nouveaux barèmes automatiquement. Vérifiez les règles transitoires.";

  for (const work of input.selected) {
    if (!newRegime) {
      results.push({ work, amount: null, ceiling: null, note: legacy });
      continue;
    }
    if (work === "toit") {
      const ceiling = multi ? 5000 : 2000;
      const minR = input.roofType === "grenier" ? 60 : 40;
      const valid = input.roofArea >= 300 && input.roofRAdded >= 20 && input.roofRFinal >= minR;
      results.push({ work, amount: valid ? Math.min(ceiling, input.roofArea * 1.75) : null, ceiling,
        note: valid ? "Projection Rénoclimat selon 1,75 $/pi²; validation des pièces justificatives requise." : `${pending} Minimum : 300 pi², R-20 ajouté et R-${minR} final.` });
    } else if (work === "murs") {
      const ceiling = multi ? 11000 : 7000;
      const valid = input.wallsArea >= 300 && input.wallsRAdded >= 9;
      results.push({ work, amount: valid ? Math.min(ceiling, input.wallsArea * 3.5) : null, ceiling,
        note: valid ? "Projection Rénoclimat selon 3,50 $/pi² de murs nets isolés; preuves requises." : `${pending} Minimum : 300 pi² et R-9 ajouté.` });
    } else if (work === "fondations") {
      const ceiling = multi ? 3500 : 2500;
      const rule = FOUNDATION_RATES[input.foundationType];
      const valid = input.foundationArea >= rule.minArea && input.foundationRAdded >= rule.minR;
      results.push({ work, amount: valid ? Math.min(ceiling, input.foundationArea * rule.rate) : null, ceiling,
        note: valid ? "Projection Rénoclimat selon le type de fondation; combinaison de surfaces à confirmer." : `${pending} Minimum : ${rule.minArea} pi² et R-${rule.minR} ajouté.` });
    } else if (work === "fenetres") {
      const ceiling = multi ? 6000 : 4500;
      const valid = input.windowCount > 0 && input.windowsMostEfficient;
      results.push({ work, amount: valid ? Math.min(ceiling, Math.floor(input.windowCount) * 300) : null, ceiling,
        note: valid ? "300 $ par ouverture brute; modèle ENERGY STAR « Les plus écoénergétiques » et numéro RNCan à valider." : "Indiquez le nombre d'ouvertures et confirmez les modèles ENERGY STAR « Les plus écoénergétiques »; les portes ordinaires ne sont pas admissibles dans ce nouveau volet." });
    } else if (work === "thermopompe") {
      results.push({ work, amount: null, ceiling: null, note: "LogisVert : aide dépendante du modèle précis et de son admissibilité. Aucun montant automatique sans fiche du fabricant." });
    } else {
      results.push({ work, amount: null, ceiling: null, note: "LogisVert : le calfeutrage seul ne donne pas droit aux 1 500 $; il doit accompagner les travaux admissibles d'isolation du toit." });
    }
  }
  const computed = results.filter(r => r.amount !== null).map(r => r.amount as number);
  const renoclimatSubtotal = computed.length ? Math.round(computed.reduce((a, b) => a + b, 0)) : null;
  // Programme distinct, NON additionné par défaut à Rénoclimat :
  // règles de cumul, nature des travaux et admissibilité à vérifier.
  const logisvertRoofCaulking = newRegime && !multi &&
    input.selected.includes("toit") && input.selected.includes("calfeutrage") ? 1500 : null;
  return { results, renoclimatSubtotal, logisvertRoofCaulking };
}

export const GRANT_SEO_PAGES: Record<string, { title: string; h1: string; description: string; intro: string; faq: { question: string; answer: string }[] }> = {
  "calculateur-subventions": {
    title: "Calculateur de subventions rénovation Québec 2026-2027 | UNPRO",
    h1: "Calculez les subventions possibles pour vos travaux au Québec",
    description: "Calculateur gratuit Rénoclimat 2026-2027 et LogisVert : fenêtres, entretoit, murs, sous-sol, thermopompes et calfeutrage. Résultat indicatif et sources officielles.",
    intro: "Estimez les aides possibles sans laisser vos coordonnées. Choisissez vos travaux, précisez votre maison et consultez les conditions officielles avant de demander une évaluation.",
    faq: [
      { question: "Faut-il une évaluation énergétique avant les travaux Rénoclimat?", answer: "Selon le nouveau parcours depuis le 1er octobre 2026, l'évaluation énergétique avant travaux est facultative mais recommandée. Les règles transitoires sont différentes." },
      { question: "Peut-on cumuler Rénoclimat et LogisVert?", answer: "Il faut vérifier les règles de cumul et les dépenses admissibles pour chaque programme. UNPRO n'additionne pas automatiquement les montants de programmes distincts." },
      { question: "Le calculateur garantit-il le remboursement?", answer: "Non. Il présente une estimation conditionnelle, pas une validation gouvernementale. Les licences, factures, dates, modèles et preuves peuvent influer sur la décision." },
    ],
  },
  "isolation-entretoit": {
    title: "Subvention isolation entretoit Rénoclimat et LogisVert 2026 | UNPRO",
    h1: "Subventions pour isoler votre entretoit au Québec",
    description: "Isolation du grenier : Rénoclimat jusqu'à 2 000 $ pour une maison, et LogisVert 1 500 $ si isolation et calfeutrage admissibles. Calculez selon R et superficie.",
    intro: "Avec le nouveau Rénoclimat, le grenier doit notamment atteindre R-60 avec au moins R-20 ajouté et 300 pi² isolés. LogisVert est un programme distinct dont les conditions incluent le calfeutrage.",
    faq: [
      { question: "Quelle valeur R pour la nouvelle subvention Rénoclimat?", answer: "Pour un grenier, R-60 final et au moins R-20 ajouté; pour un toit plat ou cathédrale, R-40 final et R-20 ajouté, sur au moins 300 pi²." },
      { question: "LogisVert paie-t-il le calfeutrage seul?", answer: "Non. L'aide de 1 500 $ vise l'ensemble admissible isolation du toit et travaux de calfeutrage." },
    ],
  },
  "fenetres-portes-patio": {
    title: "Subvention fenêtres Québec 2026 : 300 $ par fenêtre | UNPRO",
    h1: "Subvention Rénoclimat pour fenêtres et portes-patio",
    description: "Rénoclimat 2026 : 300 $ par ouverture brute admissible, jusqu'à 4 500 $ pour une maison. Vérifiez ENERGY STAR Les plus écoénergétiques et calculez.",
    intro: "Le nouveau Rénoclimat couvre certaines fenêtres et portes coulissantes vitrées (portes-patio) installées dans une ouverture existante. Les modèles doivent être ENERGY STAR « Les plus écoénergétiques » et vérifiables par leur numéro RNCan.",
    faq: [
      { question: "Combien pour remplacer 10 fenêtres admissibles?", answer: "Dans le nouveau régime, 10 ouvertures brutes admissibles peuvent représenter une estimation de 3 000 $ avant vérification des autres conditions." },
      { question: "Une porte d'entrée est-elle admissible à 300 $?", answer: "Le nouveau volet vise les fenêtres et certaines portes coulissantes vitrées; ne présumez pas qu'une porte d'entrée ordinaire est couverte." },
      { question: "Pourquoi certaines pages gouvernementales parlent de 150 $?", answer: "Le montant de 150 $ appartient aux anciennes modalités. Les projets commencés avant octobre 2026 peuvent relever de la transition et nécessitent une vérification spécifique." },
    ],
  },
  "murs-exterieurs": {
    title: "Subvention isolation murs extérieurs Québec 2026 | UNPRO",
    h1: "Aide Rénoclimat pour isoler vos murs extérieurs",
    description: "Calculez les aides Rénoclimat 2026 pour l'isolation des murs extérieurs : 3,50 $/pi², jusqu'à 7 000 $ pour une maison, sous conditions.",
    intro: "La nouvelle mesure prévoit 3,50 $/pi² de murs isolés, en excluant les ouvertures, à partir de 300 pi² et d'un ajout d'au moins R-9.",
    faq: [
      { question: "Quelle superficie minimale de murs faut-il isoler?", answer: "La nouvelle grille exige au moins 300 pi² de surface nette et R-9 ajouté pour cette mesure." },
    ],
  },
  "isolation-fondations": {
    title: "Subvention isolation sous-sol et fondations Québec 2026 | UNPRO",
    h1: "Subventions pour isoler les fondations et le sous-sol",
    description: "Estimez l'aide Rénoclimat 2026 selon le type de fondations : murs du sous-sol, dalle, vide sanitaire et plancher exposé. Plafond de 2 500 $ pour une maison.",
    intro: "Le montant varie selon la surface, l'ajout de résistance thermique et le type de fondation. Le calculateur distingue les murs, la dalle et les planchers.",
    faq: [
      { question: "L'uréthane au sous-sol est-il automatiquement subventionné?", answer: "Non. L'admissibilité dépend des travaux, de l'augmentation de résistance thermique, de la surface et du respect de toutes les exigences officielles." },
    ],
  },
  "thermopompes-logisvert": {
    title: "Subvention thermopompe LogisVert Québec 2026 | UNPRO",
    h1: "Quelle aide LogisVert pour votre thermopompe?",
    description: "Thermopompe centrale ou murale : voyez les critères LogisVert et préparez votre projet. Montant déterminé selon la fiche du modèle admissible, sans fausse promesse.",
    intro: "La subvention dépend de l'équipement précis et des critères LogisVert. Rénoclimat ne subventionne pas l'installation d'une thermopompe dans son volet énergétique.",
    faq: [
      { question: "Rénoclimat rembourse-t-il les thermopompes?", answer: "Non, pas dans le volet de rénovation énergétique décrit par les règles actuelles. Vérifiez plutôt LogisVert." },
      { question: "Pourquoi le calculateur n'indique pas un montant universel?", answer: "Parce que le montant dépend notamment du modèle et des critères d'admissibilité; un chiffre sans numéro de modèle serait trompeur." },
    ],
  },
  "calfeutrage-logisvert": {
    title: "Subvention calfeutrage LogisVert Québec 2026 | UNPRO",
    h1: "Calfeutrage et isolation : les subventions applicables",
    description: "LogisVert prévoit 1 500 $ pour l'ensemble admissible isolation de toiture et calfeutrage. Vérifiez les travaux, les conditions et les autres aides.",
    intro: "Le calfeutrage seul ne donne pas droit au montant forfaitaire LogisVert de 1 500 $. Le remplacement de fenêtres ou de portes n'est pas du calfeutrage admissible à cette mesure.",
    faq: [
      { question: "Peut-on recevoir 1 500 $ pour du calfeutrage seulement?", answer: "Non. La mesure LogisVert exige des travaux admissibles d'isolation du toit et de calfeutrage." },
    ],
  },
};
