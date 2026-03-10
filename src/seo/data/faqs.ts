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
  {
    question: "Comment vérifier si un entrepreneur est licencié au Québec ?",
    answer: "Vous pouvez vérifier la licence d'un entrepreneur sur le site de la RBQ (Régie du bâtiment du Québec) en entrant son numéro de licence ou le nom de son entreprise. UNPRO vérifie automatiquement les licences des entrepreneurs inscrits sur la plateforme.",
    topics: ["general", "verification", "couvreur", "isolation", "plomberie"],
  },
  {
    question: "Combien de soumissions devrais-je obtenir ?",
    answer: "Nous recommandons d'obtenir au minimum 3 soumissions détaillées avant de prendre une décision. Cela vous permet de comparer les prix, les approches et les garanties. UNPRO peut vous aider à analyser et comparer vos soumissions.",
    topics: ["general", "soumission"],
  },
  {
    question: "Est-ce que UNPRO est gratuit pour les propriétaires ?",
    answer: "Oui, l'utilisation de base d'UNPRO est gratuite pour les propriétaires. Vous pouvez rechercher des entrepreneurs, téléverser des soumissions pour analyse et demander des rendez-vous sans frais.",
    topics: ["general", "plateforme"],
  },
  {
    question: "Comment UNPRO vérifie-t-il les entrepreneurs ?",
    answer: "UNPRO utilise un système de vérification multi-niveaux incluant la validation de la licence RBQ, la vérification des assurances, l'analyse des avis clients et un score de fiabilité propriétaire (score AIPP). Seuls les entrepreneurs vérifiés apparaissent dans les résultats de recherche.",
    topics: ["general", "verification", "aipp"],
  },
  {
    question: "Quelles subventions sont disponibles pour la rénovation au Québec ?",
    answer: "Plusieurs programmes sont disponibles : Rénoclimat (efficacité énergétique), LogisVert, le programme de la SCHL pour l'efficacité énergétique, et divers programmes municipaux. Les montants et conditions varient. Consultez un conseiller en énergie pour maximiser vos subventions.",
    topics: ["general", "isolation", "renovation", "energie"],
  },
  {
    question: "Quand est le meilleur moment pour refaire un toit au Québec ?",
    answer: "La saison idéale pour les travaux de toiture au Québec est de mai à octobre, avec une période optimale entre juin et septembre. Les bardeaux adhèrent mieux par temps chaud (au-dessus de 10°C). En hiver, seules les réparations urgentes devraient être effectuées.",
    topics: ["couvreur", "toiture", "saisonnier"],
  },
  {
    question: "Quelle est la différence entre isolation soufflée et giclée ?",
    answer: "L'isolation soufflée (cellulose ou laine) est déposée en vrac et est plus abordable. L'isolation giclée (polyuréthane) est pulvérisée et offre une meilleure performance par pouce et agit comme pare-air. Le choix dépend de votre budget, de l'espace disponible et de la performance recherchée.",
    topics: ["isolation", "entretoit"],
  },
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
