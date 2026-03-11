/**
 * UNPRO — SEO FAQ Fragments
 * Reusable FAQ entries for SEO pages, keyed by topic.
 */

export interface SeoFaq {
  question: string;
  answer: string;
  topics: string[];
}

export const SEO_FAQS: SeoFaq[] = [
  // ─── General ───
  { question: "Comment vérifier si un entrepreneur est licencié au Québec ?", answer: "Vous pouvez vérifier la licence d'un entrepreneur sur le site de la RBQ (Régie du bâtiment du Québec) en entrant son numéro de licence ou le nom de son entreprise. UNPRO vérifie automatiquement les licences des entrepreneurs inscrits sur la plateforme.", topics: ["general", "verification", "couvreur", "isolation", "plomberie", "electricien", "fondation", "renovation"] },
  { question: "Combien de soumissions devrais-je obtenir ?", answer: "Nous recommandons d'obtenir au minimum 3 soumissions détaillées avant de prendre une décision. Cela vous permet de comparer les prix, les approches et les garanties. UNPRO peut vous aider à analyser et comparer vos soumissions.", topics: ["general", "soumission"] },
  { question: "Est-ce que UNPRO est gratuit pour les propriétaires ?", answer: "Oui, l'utilisation de base d'UNPRO est gratuite pour les propriétaires. Vous pouvez rechercher des entrepreneurs, téléverser des soumissions pour analyse et demander des rendez-vous sans frais.", topics: ["general", "plateforme"] },
  { question: "Comment UNPRO vérifie-t-il les entrepreneurs ?", answer: "UNPRO utilise un système de vérification multi-niveaux incluant la validation de la licence RBQ, la vérification des assurances, l'analyse des avis clients et un score de fiabilité propriétaire (score AIPP). Seuls les entrepreneurs vérifiés apparaissent dans les résultats de recherche.", topics: ["general", "verification", "aipp"] },
  { question: "Quelles subventions sont disponibles pour la rénovation au Québec ?", answer: "Plusieurs programmes sont disponibles : Rénoclimat (efficacité énergétique), LogisVert, le programme de la SCHL pour l'efficacité énergétique, et divers programmes municipaux. Les montants et conditions varient. Consultez un conseiller en énergie pour maximiser vos subventions.", topics: ["general", "isolation", "renovation", "energie", "thermopompe", "chauffage", "fenetre"] },
  // ─── Toiture ───
  { question: "Quand est le meilleur moment pour refaire un toit au Québec ?", answer: "La saison idéale pour les travaux de toiture au Québec est de mai à octobre, avec une période optimale entre juin et septembre. Les bardeaux adhèrent mieux par temps chaud (au-dessus de 10°C). En hiver, seules les réparations urgentes devraient être effectuées.", topics: ["couvreur", "toiture", "saisonnier"] },
  { question: "Combien coûte un toit neuf au Québec ?", answer: "Le coût moyen varie entre 5 000 $ et 18 000 $ pour une maison standard, selon la superficie, le type de bardeaux et la complexité du toit. Les toitures plates en membrane peuvent coûter davantage.", topics: ["couvreur", "infiltration-eau-toit"] },
  // ─── Isolation ───
  { question: "Quelle est la différence entre isolation soufflée et giclée ?", answer: "L'isolation soufflée (cellulose ou laine) est déposée en vrac et est plus abordable. L'isolation giclée (polyuréthane) est pulvérisée et offre une meilleure performance par pouce et agit comme pare-air. Le choix dépend de votre budget, de l'espace disponible et de la performance recherchée.", topics: ["isolation", "entretoit", "isolation-entretoit"] },
  { question: "Combien coûte l'isolation d'un entretoit ?", answer: "Pour une maison standard, comptez entre 2 000 $ et 6 000 $ pour de la cellulose soufflée. Le polyuréthane giclé coûte généralement plus cher mais offre une meilleure performance par pouce d'épaisseur.", topics: ["isolation", "isolation-entretoit"] },
  // ─── Plomberie ───
  { question: "Comment savoir si j'ai une fuite de plomberie cachée ?", answer: "Surveillez votre compteur d'eau : fermez tous les robinets et vérifiez si le compteur continue de tourner. D'autres signes incluent des taches d'eau inexpliquées, une augmentation de la facture d'eau ou des bruits d'écoulement sans utilisation.", topics: ["plombier", "fuite-plomberie"] },
  { question: "Combien coûte le remplacement d'un drain français ?", answer: "Le remplacement d'un drain français coûte entre 8 000 $ et 25 000 $ au Québec, selon le périmètre, la profondeur d'excavation et l'accessibilité du terrain. C'est un investissement majeur mais essentiel pour protéger la fondation.", topics: ["fondation", "drain-francais", "infiltration-sous-sol"] },
  // ─── Électricité ───
  { question: "Quand faut-il remplacer un panneau électrique ?", answer: "Un panneau de plus de 25-30 ans, un panneau de marque Federal Pacific ou Zinsco, ou un panneau qui ne fournit pas assez d'ampérage pour vos besoins devrait être remplacé. Comptez entre 1 500 $ et 5 000 $ pour le remplacement.", topics: ["electricien", "panneau-electrique-vetuste"] },
  // ─── Fenêtres ───
  { question: "Quand remplacer ses fenêtres ?", answer: "Remplacez vos fenêtres si vous observez de la condensation entre les vitres, des courants d'air, de la difficulté à les ouvrir/fermer, ou si elles sont à simple vitrage. Des fenêtres modernes triple vitrage peuvent réduire vos coûts de chauffage de 15 à 25 %.", topics: ["fenetre", "condensation-fenetre", "perte-chaleur"] },
  // ─── Chauffage ───
  { question: "Thermopompe murale ou centrale : laquelle choisir ?", answer: "La murale est idéale pour chauffer/climatiser des zones spécifiques et coûte moins cher à installer (3 500 $ à 5 000 $). La centrale distribue l'air dans toute la maison via des conduits (8 000 $ à 15 000 $). Le choix dépend de la présence de conduits et de vos besoins.", topics: ["chauffage", "thermopompe"] },
  // ─── Fondation ───
  { question: "Une fissure de fondation est-elle grave ?", answer: "Les microfissures verticales de moins de 3 mm sont souvent normales (retrait du béton). Les fissures horizontales, en escalier, ou qui s'élargissent sont plus préoccupantes et nécessitent une évaluation professionnelle. Coût de réparation : 500 $ à 20 000 $ selon la gravité.", topics: ["fondation", "fissure-fondation", "inspection"] },
  // ─── Rénovation ───
  { question: "Quel est le retour sur investissement d'une rénovation de cuisine ?", answer: "Une rénovation de cuisine bien exécutée offre un retour sur investissement de 75 à 100 % à la revente. C'est l'une des rénovations les plus rentables avec la salle de bain. Budget moyen : 15 000 $ à 60 000 $.", topics: ["renovation", "renovation-cuisine"] },
  { question: "Combien coûte une rénovation de salle de bain au Québec ?", answer: "Le coût moyen varie de 8 000 $ à 35 000 $ selon l'ampleur des travaux. Une rénovation cosmétique (peinture, robinetterie) coûte moins qu'une rénovation complète avec remplacement de plomberie et d'imperméabilisation.", topics: ["renovation", "renovation-salle-de-bain", "plombier"] },
  // ─── Aménagement ───
  { question: "Ai-je besoin d'un permis pour installer une clôture ?", answer: "Dans la plupart des municipalités québécoises, un permis est requis pour l'installation d'une clôture. Les règlements varient selon la municipalité (hauteur maximale, matériaux, distance de la propriété). Vérifiez auprès de votre service d'urbanisme avant de commencer.", topics: ["cloture", "paysagiste", "amenagement-paysager"] },
  // ─── Décontamination ───
  { question: "Comment savoir si ma maison contient de l'amiante ?", answer: "Les maisons construites avant 1985 sont plus susceptibles de contenir de l'amiante dans les isolants, tuiles de sol, ciment-amiante et conduits. Seul un test de laboratoire peut confirmer la présence d'amiante. Ne manipulez jamais des matériaux suspects vous-même.", topics: ["decontamination", "amiante", "inspection"] },
];

/** Get FAQs relevant to a specific topic */
export const getFaqsByTopic = (topic: string, limit = 5): SeoFaq[] =>
  SEO_FAQS.filter((f) => f.topics.includes(topic) || f.topics.includes("general")).slice(0, limit);

/** Get FAQs relevant to multiple topics */
export const getFaqsByTopics = (topics: string[], limit = 5): SeoFaq[] => {
  const scored = SEO_FAQS.map((faq) => ({
    faq,
    relevance: faq.topics.filter((t) => topics.includes(t)).length,
  }))
    .filter((s) => s.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);
  return scored.slice(0, limit).map((s) => s.faq);
};
