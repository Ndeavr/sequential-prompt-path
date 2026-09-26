/**
 * UNPRO — Modèles de FAQ par domaine (métier) de l'entrepreneur.
 *
 * Aucune FAQ générique : les questions sont choisies selon le métier réellement
 * déclaré ou détecté. Les réponses sont des brouillons à compléter : UNPRO
 * n'invente jamais une garantie, un délai, un prix ou une certification.
 */

export type TradeFaqSeed = {
  category: string;
  question: string;
  /** Brouillon d'orientation — l'entrepreneur écrit sa vraie réponse. */
  draft: string;
};

type TradeDomain = {
  key: string;
  /** Libellé affiché du domaine. */
  label: string;
  /** Mots-clés de détection (sans accent, minuscules). */
  match: string[];
  faqs: TradeFaqSeed[];
};

const DOMAINS: TradeDomain[] = [
  {
    key: "isolation",
    label: "isolation",
    match: ["isolation", "isolant", "uretane", "urethane", "cellulose", "entretoit", "efficacite energetique"],
    faqs: [
      { category: "services", question: "Quels types d'isolation installez-vous (uréthane giclé, cellulose, laine)?", draft: "Précisez les types d'isolant que vous posez réellement et dans quels cas vous les recommandez." },
      { category: "entretoit", question: "Comment savoir si l'isolation de mon entretoit est insuffisante?", draft: "Décrivez les signes que vous observez chez vos clients : glace au bord du toit, plafond froid, factures élevées." },
      { category: "subventions", question: "Vos travaux sont-ils admissibles aux programmes de subvention en efficacité énergétique?", draft: "Indiquez seulement les programmes que vous connaissez et accompagnez réellement, sans promettre un montant." },
      { category: "ventilation", question: "L'isolation change-t-elle la ventilation de l'entretoit?", draft: "Expliquez comment vous protégez la ventilation (déflecteurs, évents) lors de vos travaux." },
      { category: "materiaux", question: "Quelle valeur R recommandez-vous pour une maison au Québec?", draft: "Donnez les valeurs que vous appliquez selon la partie du bâtiment et le code en vigueur." },
      { category: "delais", question: "Combien de temps prennent des travaux d'isolation d'entretoit?", draft: "Indiquez votre durée habituelle selon la superficie." },
      { category: "garanties", question: "Quelle garantie offrez-vous sur l'isolation posée?", draft: "Écrivez la garantie que vous offrez vraiment, main-d'œuvre et matériaux." },
      { category: "humidite", question: "Que faites-vous si vous trouvez de la moisissure ou un dégât d'eau?", draft: "Expliquez votre procédure avant de poser un nouvel isolant." },
    ],
  },
  {
    key: "toiture",
    label: "toiture",
    match: ["toiture", "toit", "couvreur", "bardeau", "membrane", "elastomere", "tpo"],
    faqs: [
      { category: "services", question: "Quels types de toitures installez-vous?", draft: "Listez les revêtements que vous posez réellement (bardeau, membrane élastomère, tôle)." },
      { category: "diagnostic", question: "Comment savoir si ma toiture doit être refaite ou seulement réparée?", draft: "Décrivez ce que vous vérifiez lors de l'inspection." },
      { category: "delais", question: "Quel est le délai moyen pour une réfection de toiture?", draft: "Indiquez votre durée habituelle selon la superficie et la pente." },
      { category: "garanties", question: "Quelle garantie offrez-vous sur la main-d'œuvre?", draft: "Inscrivez votre garantie réelle et celle du fabricant." },
      { category: "saison", question: "Peut-on refaire une toiture en hiver au Québec?", draft: "Expliquez vos conditions de pose en saison froide." },
      { category: "urgences", question: "Intervenez-vous pour une fuite urgente?", draft: "Précisez vos délais d'intervention réels." },
      { category: "assurance", question: "Aidez-vous avec une réclamation d'assurance après un dégât?", draft: "Expliquez le soutien que vous offrez (photos, rapport, estimation)." },
      { category: "ventilation", question: "Ajustez-vous la ventilation du toit lors des travaux?", draft: "Décrivez les évents et maximums que vous installez." },
    ],
  },
  {
    key: "lavage-vitres",
    label: "lavage de vitres",
    match: ["vitre", "vitres", "fenetres lavage", "lavage de vitres", "nettoyage de vitres", "laveur"],
    faqs: [
      { category: "frequence", question: "À quelle fréquence faut-il laver ses vitres?", draft: "Donnez la fréquence que vous recommandez selon l'emplacement (rue passante, bord de l'eau, campagne)." },
      { category: "hauteur", question: "Jusqu'à quelle hauteur pouvez-vous laver des vitres?", draft: "Indiquez vos équipements réels (perche à eau pure, échelle, nacelle) et la hauteur maximale." },
      { category: "assurance", question: "Êtes-vous assuré pour le travail en hauteur?", draft: "Mentionnez votre couverture d'assurance réelle, sans exagérer les montants." },
      { category: "saison", question: "Lavez-vous les vitres en hiver?", draft: "Précisez à partir de quelle température vous travaillez." },
      { category: "services", question: "Lavez-vous aussi l'intérieur, les moustiquaires et les cadres?", draft: "Dites ce qui est inclus et ce qui est en supplément." },
      { category: "prix", question: "Comment calculez-vous le prix d'un lavage de vitres?", draft: "Expliquez votre méthode : nombre d'ouvertures, étages, accès." },
      { category: "produits", question: "Vos produits sont-ils sécuritaires pour les plantes et les animaux?", draft: "Nommez le type de produits que vous utilisez vraiment." },
      { category: "delais", question: "Combien de temps dure une visite type?", draft: "Donnez votre durée habituelle pour une maison unifamiliale." },
    ],
  },
  {
    key: "plomberie",
    label: "plomberie",
    match: ["plomb", "plomberie", "plombier", "drain", "chauffe-eau", "tuyau"],
    faqs: [
      { category: "urgences", question: "Intervenez-vous en urgence pour un dégât d'eau?", draft: "Indiquez vos vraies heures et délais d'intervention." },
      { category: "services", question: "Faites-vous le débouchage et l'inspection par caméra des drains?", draft: "Listez les services que vous offrez réellement." },
      { category: "chauffe-eau", question: "Quand faut-il remplacer un chauffe-eau?", draft: "Donnez les signes et la durée de vie typique que vous observez." },
      { category: "conformite", question: "Vos travaux sont-ils conformes au code de plomberie du Québec?", draft: "Expliquez vos permis et licences réels." },
      { category: "prix", question: "Comment facturez-vous : au taux horaire ou au forfait?", draft: "Décrivez votre méthode de facturation réelle." },
      { category: "prevention", question: "Comment prévenir le gel des tuyaux en hiver?", draft: "Donnez vos conseils d'entretien saisonnier." },
      { category: "garanties", question: "Quelle garantie couvre vos réparations?", draft: "Indiquez votre garantie réelle sur main-d'œuvre et pièces." },
      { category: "delais", question: "Quel est votre délai pour un rendez-vous non urgent?", draft: "Donnez votre délai habituel." },
    ],
  },
  {
    key: "electricite",
    label: "électricité",
    match: ["electr", "électr", "maitre electricien", "panneau", "borne de recharge"],
    faqs: [
      { category: "services", question: "Installez-vous des bornes de recharge pour véhicule électrique?", draft: "Précisez les modèles et l'ampérage que vous installez." },
      { category: "panneau", question: "Quand faut-il changer son panneau électrique?", draft: "Décrivez les signes que vous constatez (100 A insuffisant, panneau à fusibles)." },
      { category: "conformite", question: "Vos travaux passent-ils l'inspection?", draft: "Expliquez votre licence, votre permis et la procédure d'inspection." },
      { category: "urgences", question: "Intervenez-vous en cas de panne ou d'odeur de brûlé?", draft: "Indiquez vos délais réels." },
      { category: "prix", question: "Comment estimez-vous un projet électrique?", draft: "Expliquez votre méthode : visite, plan, devis écrit." },
      { category: "delais", question: "Combien de temps pour une mise à niveau de panneau?", draft: "Donnez votre durée habituelle et le rôle du distributeur d'électricité." },
      { category: "securite", question: "Vérifiez-vous les détecteurs et la mise à la terre?", draft: "Dites ce que vous inspectez systématiquement." },
    ],
  },
  {
    key: "pavage",
    label: "pavage et asphalte",
    match: ["pavage", "asphalte", "pave", "pavé", "entree de cour", "scellant"],
    faqs: [
      { category: "services", question: "Faites-vous l'asphalte, le pavé uni ou les deux?", draft: "Précisez ce que vous réalisez réellement." },
      { category: "saison", question: "Quelle est la meilleure période pour paver au Québec?", draft: "Donnez votre saison de travaux et les contraintes de température." },
      { category: "durabilite", question: "Combien de temps dure une entrée d'asphalte?", draft: "Donnez la durée que vous observez et ce qui l'influence." },
      { category: "entretien", question: "Faut-il appliquer un scellant, et à quelle fréquence?", draft: "Expliquez votre recommandation réelle." },
      { category: "drainage", question: "Comment gérez-vous la pente et le drainage?", draft: "Décrivez votre préparation de fondation." },
      { category: "delais", question: "Combien de temps avant de rouler sur la nouvelle surface?", draft: "Indiquez vos délais de durcissement." },
      { category: "garanties", question: "Quelle garantie offrez-vous sur les travaux?", draft: "Écrivez votre garantie réelle." },
    ],
  },
  {
    key: "deneigement",
    label: "déneigement",
    match: ["deneigement", "déneigement", "neige", "souffleuse", "deglacage"],
    faqs: [
      { category: "contrat", question: "Vos contrats couvrent-ils toute la saison?", draft: "Précisez les dates réelles de votre saison." },
      { category: "delais", question: "En combien de temps passez-vous après une tempête?", draft: "Donnez votre délai réel selon l'accumulation." },
      { category: "services", question: "Déglacez-vous les entrées et les escaliers?", draft: "Indiquez ce qui est inclus et ce qui est en supplément." },
      { category: "dommages", question: "Que se passe-t-il en cas de dommage au terrain ou au pavé?", draft: "Expliquez votre couverture et votre procédure." },
      { category: "prix", question: "Comment est calculé le prix d'un contrat de déneigement?", draft: "Expliquez vos critères : longueur d'entrée, accès, type de véhicule." },
      { category: "urgences", question: "Offrez-vous un déneigement d'urgence hors contrat?", draft: "Dites si oui ou non et à quelles conditions." },
    ],
  },
  {
    key: "cvc",
    label: "chauffage, ventilation et climatisation",
    match: ["thermopompe", "climatisation", "chauffage", "cvc", "hvac", "ventilation", "echangeur d'air"],
    faqs: [
      { category: "services", question: "Quelles marques de thermopompes installez-vous?", draft: "Nommez uniquement les marques que vous installez et entretenez vraiment." },
      { category: "efficacite", question: "Une thermopompe suffit-elle l'hiver au Québec?", draft: "Expliquez votre recommandation selon le type de maison et le chauffage d'appoint." },
      { category: "subventions", question: "Vos installations sont-elles admissibles à une subvention?", draft: "Mentionnez seulement les programmes que vous accompagnez réellement." },
      { category: "entretien", question: "À quelle fréquence faut-il entretenir l'appareil?", draft: "Donnez votre fréquence recommandée et ce que l'entretien inclut." },
      { category: "delais", question: "Quel est le délai d'installation?", draft: "Indiquez vos délais réels selon la saison." },
      { category: "garanties", question: "Quelle garantie couvre l'appareil et l'installation?", draft: "Séparez la garantie du fabricant et la vôtre." },
    ],
  },
  {
    key: "renovation",
    label: "rénovation",
    match: ["renovation", "rénovation", "cuisine", "salle de bain", "sous-sol", "entrepreneur general", "construction"],
    faqs: [
      { category: "services", question: "Quels types de projets de rénovation réalisez-vous?", draft: "Listez vos projets réels et leur envergure typique." },
      { category: "delais", question: "Combien de temps dure un projet type?", draft: "Donnez vos durées observées par type de projet." },
      { category: "prix", question: "Comment établissez-vous un budget de projet?", draft: "Expliquez votre processus de devis et ce qui fait varier le prix." },
      { category: "conformite", question: "Gérez-vous les permis municipaux et les plans?", draft: "Dites ce que vous prenez en charge." },
      { category: "chantier", question: "Comment protégez-vous la maison pendant les travaux?", draft: "Décrivez vos mesures de propreté et de protection." },
      { category: "garanties", question: "Quelle garantie offrez-vous sur les travaux?", draft: "Indiquez votre garantie réelle et votre plan de garantie si applicable." },
    ],
  },
  {
    key: "paysagement",
    label: "aménagement paysager",
    match: ["paysag", "amenagement", "gazon", "pelouse", "arbre", "haie", "terrassement"],
    faqs: [
      { category: "services", question: "Quels aménagements réalisez-vous?", draft: "Listez vos services réels : muret, tourbe, plantation, terrassement." },
      { category: "saison", question: "Quelle est la meilleure saison pour votre type de travaux?", draft: "Donnez vos périodes réelles de réalisation." },
      { category: "entretien", question: "Offrez-vous l'entretien après l'aménagement?", draft: "Dites si vous offrez un suivi et à quelles conditions." },
      { category: "delais", question: "Quel est le délai actuel pour un nouveau projet?", draft: "Indiquez votre carnet réel." },
      { category: "garanties", question: "Les végétaux sont-ils garantis?", draft: "Écrivez votre garantie réelle sur les plantations." },
      { category: "prix", question: "Comment estimez-vous un projet d'aménagement?", draft: "Expliquez votre méthode d'estimation." },
    ],
  },
];

/** FAQ construite à partir du métier déclaré quand aucun domaine n'est reconnu. */
function fallbackFaqs(tradeLabel: string): TradeFaqSeed[] {
  const t = tradeLabel.toLowerCase();
  return [
    { category: "services", question: `Quels services en ${t} offrez-vous exactement?`, draft: "Listez vos services réels, sans en ajouter." },
    { category: "territoire", question: `Dans quelles villes intervenez-vous en ${t}?`, draft: "Nommez vos villes réellement desservies." },
    { category: "delais", question: `Quel est votre délai actuel pour un projet en ${t}?`, draft: "Donnez votre délai réel." },
    { category: "prix", question: `Comment établissez-vous le prix d'un projet en ${t}?`, draft: "Expliquez votre méthode d'estimation." },
    { category: "garanties", question: `Quelle garantie offrez-vous sur vos travaux en ${t}?`, draft: "Inscrivez votre garantie réelle." },
    { category: "conformite", question: `Quelles licences et assurances détenez-vous pour la ${t}?`, draft: "Indiquez vos licences réelles (RBQ, assurances)." },
  ];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveTradeDomain(tradeLabel?: string | null): { key: string; label: string } | null {
  if (!tradeLabel?.trim()) return null;
  const n = normalize(tradeLabel);
  const found = DOMAINS.find((d) => d.match.some((m) => n.includes(normalize(m))));
  return found ? { key: found.key, label: found.label } : null;
}

/**
 * Retourne les FAQ du domaine, en excluant celles déjà présentes.
 * `limit` permet de générer par petites vagues.
 */
export function buildTradeFaqs(
  tradeLabel: string | null | undefined,
  options: { exclude?: string[]; limit?: number } = {},
): TradeFaqSeed[] {
  const { exclude = [], limit = 5 } = options;
  const domain = tradeLabel ? DOMAINS.find((d) => d.match.some((m) => normalize(tradeLabel).includes(normalize(m)))) : null;
  const pool = domain ? domain.faqs : tradeLabel ? fallbackFaqs(tradeLabel) : [];
  const taken = new Set(exclude.map((q) => normalize(q)));
  return pool.filter((f) => !taken.has(normalize(f.question))).slice(0, limit);
}
