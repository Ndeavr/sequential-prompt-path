export const SAVINGS_MODEL = {
  startYear: 2027, endYear: 2036, years: 10,
  averageBusinesses: 4000, initialActivationGoal: 3000,
  annualNetSavings: 2500, entrepreneurShare: 0.6, homeownerShare: 0.4,
  measuredSavings: null,
} as const;

export function calculateCombinedSavings(businesses: number = SAVINGS_MODEL.averageBusinesses, annual: number = SAVINGS_MODEL.annualNetSavings, years: number = SAVINGS_MODEL.years) {
  const generated = businesses * annual * years;
  return { businessYears: businesses * years, generated, entrepreneur: generated * SAVINGS_MODEL.entrepreneurShare, homeowner: generated * SAVINGS_MODEL.homeownerShare, monthly: annual / 12 };
}

export const CAMPAIGN_PATHS = {
  fr: { vision: '/vision', article: '/articles/economiser-ensemble', press: '/communique' },
  en: { vision: '/en/vision', article: '/en/articles/saving-together', press: '/en/press-release' },
} as const;

export const CAMPAIGN_COPY = {
  fr: {
    headline: '100 millions $ — Et si on économisait ensemble?',
    intro: 'Grâce à l’intelligence artificielle d’UNPRO, nous voulons réduire les dépenses de publicité, les suivis et les déplacements inutiles, pour que les entrepreneurs et les propriétaires économisent.',
    approach: 'Notre démarche : mesurer les économies réalisées grâce à l’intelligence artificielle d’UNPRO et ajuster nos projections à partir des résultats observés.',
    disclaimer: 'Objectif combiné de 100 millions de dollars canadiens sur 2027–2036. Scénario de planification, pas des économies mesurées ni une prévision validée.',
    entrepreneurTitle: 'Entrepreneurs : moins de dépenses.',
    entrepreneurBody: 'Notre objectif : réduire les dépenses d’acquisition et de publicité, les tâches administratives répétitives et les déplacements inutiles. Dans ce scénario, l’entreprise conserve 60 % des économies nettes générées, soit 1 500 $ par année.',
    homeownerTitle: 'Propriétaires : plus d’économies.',
    homeownerBody: 'Le scénario suppose que les entreprises répercutent 40 % des économies nettes dans leurs prix : 1 000 $ par entreprise et par année, répartis sur l’ensemble de leurs projets. Ce n’est pas 1 000 $ par propriétaire ou par projet, ni un rabais garanti.',
    explanation: 'Découvrez comment', articleLabel: 'Lire le rapport', pressLabel: 'Communiqué de presse',
    articleTitle: 'Économiser ensemble : ce que le scénario de 100 millions $ veut vraiment dire',
    pressTitle: 'UNPRO présente un objectif d’économies partagé entre entrepreneurs et propriétaires',
    methodTitle: 'Un modèle transparent, pas un compteur de résultats',
    unknown: 'Économies réellement mesurées : inconnues.',
    formula: '4 000 entreprises × 2 500 $ nets par année × 10 ans = 100 000 000 $',
    participation: '4 000 entreprises participantes en moyenne chaque année, soit 40 000 années-entreprises. Ce n’est pas nécessairement le même groupe pendant dix ans. L’objectif initial de 3 000 entreprises activées est distinct de cette moyenne et ne remplace pas l’objectif d’acquisition.',
    net: 'Les 2 500 $ annuels (l’équivalent arrondi de 208,33 $ par mois) sont une hypothèse d’économies générées, après déduction des coûts UNPRO. Ce montant n’est ni un tarif UNPRO, ni une promesse de rendement.',
    transfer: '60 millions $ conservés par les entrepreneurs + 40 millions $ répercutés aux propriétaires = 100 millions $ combinés. Les 40 millions $ sont une redistribution de la même économie : nous ne les ajoutons pas une deuxième fois.',
    cashTitle: 'Argent économisé et temps libéré : deux choses différentes',
    cash: 'Une réduction de publicité, de coûts administratifs ou de déplacements peut devenir une économie monétaire si une dépense réellement évitée est documentée. Du temps libéré est d’abord de la capacité disponible. Nous ne le convertissons pas en dollars sans coût évité démontré.',
    capabilityTitle: 'Mieux comprendre avant de coordonner',
    capability: 'Clara est l’assistante d’UNPRO. Notre ambition est de mieux contextualiser les besoins, de rechercher une compatibilité selon le projet, le territoire, le budget, les horaires et les façons de travailler et de communiquer, puis de faciliter la coordination. Ces objectifs ne constituent pas une garantie de recommandation, de rendez-vous ou de contrat.',
    measurement: 'Cette démarche exprime une intention. Aucun programme de mesure opérationnel ni résultat validé n’est annoncé ici. Une mesure crédible demanderait une référence comparable, des factures ou dépenses documentées, les coûts UNPRO, la part réellement répercutée dans les prix et une attribution prudente des changements.',
    riskTitle: 'Au Québec, les économies ne remplacent jamais la conformité',
    risk: 'Les licences requises, l’assurance, la qualité du travail et les besoins du bâtiment restent prioritaires. Une baisse de coût ne justifie pas de contourner les vérifications. La saisonnalité, le type de projet et la capacité des entreprises peuvent réduire les économies, jusqu’à zéro.',
    homeownerCta: 'Parler à Clara', entrepreneurCta: 'Définir mes objectifs', faqTitle: 'Les questions essentielles',
    faqs: [
      ['Les 100 millions $ ont-ils déjà été économisés?', 'Non. Il s’agit d’un objectif de planification pour 2027–2036. Les économies réelles mesurées sont inconnues.'],
      ['Qui profite des économies?', 'Le scénario attribue 60 % aux entrepreneurs et 40 % aux propriétaires par une répercussion dans les prix. Cette répartition est une hypothèse, pas un engagement contractuel.'],
      ['Chaque projet économise-t-il 1 000 $?', 'Non. Les 1 000 $ représentent la part annuelle d’une entreprise, répartie sur tous ses projets. Aucun montant par projet n’est promis.'],
      ['Comment vérifier des économies nettes?', 'Comparer des dépenses documentées à une référence pertinente, soustraire les coûts UNPRO et distinguer coûts évités, temps disponible et changements attribuables à d’autres facteurs.'],
      ['Pourquoi distinguer 3 000 et 4 000 entreprises?', '3 000 est l’objectif initial d’entreprises activées. 4 000 est la participation annuelle moyenne hypothétique sur dix ans. Ce sont deux indicateurs différents.'],
      ['Le temps libéré est-il compté comme de l’argent?', 'Pas sans une dépense réellement évitée et documentée. Une heure disponible n’est pas automatiquement une économie monétaire.'],
    ],
  },
  en: {
    headline: '$100 million — What if we saved together?',
    intro: 'Through UNPRO’s artificial intelligence, we want to reduce advertising expenses, repetitive follow-ups and unnecessary travel, so contractors and homeowners can save.',
    approach: 'Our approach: measure savings generated through UNPRO’s artificial intelligence and adjust our projections based on observed results.',
    disclaimer: 'Combined CAD $100 million objective over 2027–2036. A planning scenario, not measured savings or a validated forecast.',
    entrepreneurTitle: 'Contractors: fewer expenses.',
    entrepreneurBody: 'Our objective is to reduce acquisition and advertising expenses, repetitive administration and unnecessary travel. This scenario assumes businesses retain 60% of generated net savings, or CAD $1,500 per year.',
    homeownerTitle: 'Homeowners: more savings.',
    homeownerBody: 'The scenario assumes businesses pass 40% of net savings through their prices: CAD $1,000 per business per year across all its projects. This is not $1,000 per homeowner or project, and not a guaranteed discount.',
    explanation: 'Discover how', articleLabel: 'Read the report', pressLabel: 'Press release',
    articleTitle: 'Saving together: what the $100 million scenario really means',
    pressTitle: 'UNPRO presents a savings objective shared by contractors and homeowners',
    methodTitle: 'A transparent model, not a results counter', unknown: 'Actual measured savings: unknown.',
    formula: '4,000 businesses × CAD $2,500 net per year × 10 years = CAD $100,000,000',
    participation: 'An average of 4,000 participating businesses each year, or 40,000 business-years. These need not be the same businesses throughout the decade. The initial goal of 3,000 activated businesses is separate and does not replace the acquisition target.',
    net: 'The annual CAD $2,500 (a rounded equivalent of $208.33 per month) is assumed generated savings after UNPRO costs. It is neither a UNPRO price nor a promised return.',
    transfer: 'CAD $60 million retained by contractors + $40 million passed through to homeowners = $100 million combined. The $40 million redistributes the same savings; it is not counted a second time.',
    cashTitle: 'Cash savings and available time are different',
    cash: 'Lower advertising, administrative or travel costs can be cash savings when an actual avoided expense is documented. Freed time is available capacity first. We do not convert it to cash without a documented avoided cost.',
    capabilityTitle: 'Understand the context before coordinating',
    capability: 'Clara is UNPRO’s assistant. Our ambition is to contextualize needs, seek compatibility across the project, territory, budget, schedule, working styles and communication, then facilitate coordination. These goals do not guarantee recommendations, appointments or contracts.',
    measurement: 'This approach states an intention. No operational measurement program or validated results are announced here. Credible measurement would require a comparable baseline, documented bills or expenses, UNPRO costs, savings actually reflected in prices and careful attribution.',
    riskTitle: 'In Quebec, savings never replace compliance',
    risk: 'Required licences, insurance, work quality and building needs remain priorities. Lower costs never justify skipping verification. Seasonality, project type and business capacity may reduce savings, potentially to zero.',
    homeownerCta: 'Talk to Clara', entrepreneurCta: 'Define my goals', faqTitle: 'Essential questions',
    faqs: [
      ['Has $100 million already been saved?', 'No. This is a planning objective for 2027–2036. Actual measured savings are unknown.'],
      ['Who benefits?', 'The scenario allocates 60% to contractors and 40% to homeowners through prices. This split is an assumption, not a contractual commitment.'],
      ['Does every project save $1,000?', 'No. $1,000 is one business’s annual pass-through across all its projects. No per-project amount is promised.'],
      ['How can net savings be verified?', 'Compare documented expenses against a relevant baseline, subtract UNPRO costs and separate avoided expenses, available time and changes caused by other factors.'],
      ['Why distinguish 3,000 and 4,000 businesses?', '3,000 is the initial activated-business goal. 4,000 is the hypothetical average annual participation over ten years. They are different measures.'],
      ['Is freed time counted as cash?', 'Not without a documented expense actually avoided. An available hour is not automatically a cash saving.'],
    ],
  },
} as const;