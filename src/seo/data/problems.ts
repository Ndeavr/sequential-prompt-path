/**
 * UNPRO — SEO Problem Data
 * Structured problem metadata for programmatic SEO pages.
 */

export interface SeoProblem {
  slug: string;
  name: string;
  shortDescription: string;
  symptoms: string[];
  commonCauses: string[];
  risks: string[];
  whatToCheck: string[];
  urgency: "low" | "medium" | "high" | "critical";
  contractorTypes: string[];
  relatedProblems: string[];
  relatedServices: string[];
}

export const SEO_PROBLEMS: SeoProblem[] = [
  {
    slug: "infiltration-eau-toit",
    name: "Infiltration d'eau par le toit",
    shortDescription: "Les infiltrations par le toit sont parmi les problèmes les plus dommageables pour une maison. Elles peuvent compromettre la structure, l'isolant et la qualité de l'air intérieur.",
    symptoms: [
      "Taches brunâtres au plafond",
      "Peinture qui cloque ou pèle",
      "Gouttes d'eau visibles lors de fortes pluies",
      "Odeur de moisi au grenier",
      "Bois noirci ou gonflé dans l'entretoit",
    ],
    commonCauses: [
      "Bardeaux endommagés ou vieillissants",
      "Solin mal scellé autour des cheminées ou évents",
      "Barrages de glace en hiver",
      "Accumulation de débris dans les gouttières",
      "Ventilation d'entretoit insuffisante",
    ],
    risks: [
      "Moisissure structurelle",
      "Pourriture du bois de charpente",
      "Dommages à l'isolant",
      "Court-circuit électrique",
      "Effondrement de plafond dans les cas graves",
    ],
    whatToCheck: [
      "Inspectez visuellement les bardeaux depuis le sol",
      "Vérifiez l'entretoit pour des traces d'eau",
      "Examinez les solins autour des pénétrations",
      "Vérifiez l'état des gouttières",
      "Notez la date du dernier remplacement de toiture",
    ],
    urgency: "high",
    contractorTypes: ["couvreur", "inspection"],
    relatedProblems: ["moisissure-grenier", "barrage-glace"],
    relatedServices: ["couvreur", "isolation-entretoit"],
  },
  {
    slug: "moisissure-grenier",
    name: "Moisissure au grenier",
    shortDescription: "La moisissure au grenier est souvent le signe d'un problème de ventilation ou d'isolation. Non traitée, elle peut affecter la qualité de l'air de toute la maison.",
    symptoms: [
      "Taches noires ou vertes sur le contreplaqué",
      "Odeur de moisi persistante",
      "Clous rouillés dépassant du contreplaqué",
      "Condensation visible en hiver",
      "Isolant humide ou écrasé",
    ],
    commonCauses: [
      "Ventilation d'entretoit insuffisante",
      "Évents de salle de bain ou cuisine dirigés dans l'entretoit",
      "Pare-vapeur absent ou mal installé",
      "Fuites de toiture non détectées",
      "Isolation excessive sans ventilation compensatoire",
    ],
    risks: [
      "Problèmes respiratoires pour les occupants",
      "Détérioration de la structure du toit",
      "Contamination de l'isolant",
      "Diminution de la valeur de la propriété",
    ],
    whatToCheck: [
      "Inspectez visuellement le contreplaqué du toit",
      "Vérifiez que les évents sont dégagés",
      "Confirmez que les conduits de ventilation sortent par le toit",
      "Mesurez l'épaisseur de l'isolant",
    ],
    urgency: "high",
    contractorTypes: ["isolation", "ventilation", "inspection"],
    relatedProblems: ["infiltration-eau-toit", "condensation-entretoit"],
    relatedServices: ["isolation-entretoit", "ventilation-entretoit"],
  },
  {
    slug: "fissure-fondation",
    name: "Fissure de fondation",
    shortDescription: "Les fissures de fondation peuvent être bénignes ou signaler un problème structurel sérieux. L'évaluation par un professionnel est essentielle.",
    symptoms: [
      "Fissures visibles sur les murs du sous-sol",
      "Infiltration d'eau le long des fissures",
      "Portes ou fenêtres qui coincent",
      "Planchers inégaux",
      "Efflorescence blanche sur le béton",
    ],
    commonCauses: [
      "Tassement naturel du sol",
      "Cycles gel-dégel",
      "Pression hydrostatique latérale",
      "Drainage insuffisant autour de la fondation",
      "Retrait du béton lors du séchage initial",
    ],
    risks: [
      "Infiltrations d'eau chroniques",
      "Instabilité structurelle progressive",
      "Moisissure au sous-sol",
      "Perte de valeur importante de la propriété",
    ],
    whatToCheck: [
      "Mesurez la largeur des fissures (> 3mm = préoccupant)",
      "Observez si les fissures s'élargissent avec le temps",
      "Vérifiez si les fissures sont horizontales (plus grave) ou verticales",
      "Cherchez des signes d'eau autour des fissures",
    ],
    urgency: "high",
    contractorTypes: ["fondation", "inspection"],
    relatedProblems: ["infiltration-sous-sol"],
    relatedServices: ["drain-francais", "impermeabilisation-fondation"],
  },
  {
    slug: "infiltration-sous-sol",
    name: "Infiltration d'eau au sous-sol",
    shortDescription: "L'eau au sous-sol peut provenir de multiples sources. Identifier la cause exacte est crucial pour choisir la bonne solution et éviter des travaux inutiles.",
    symptoms: [
      "Eau stagnante ou traces d'eau sur le plancher",
      "Murs humides ou suintants",
      "Odeur de moisi au sous-sol",
      "Efflorescence sur les murs de béton",
      "Tapis ou finitions endommagés par l'humidité",
    ],
    commonCauses: [
      "Drain français bloqué ou vieillissant",
      "Fissures dans la fondation",
      "Mauvaise pente du terrain autour de la maison",
      "Gouttières déficientes ou absentes",
      "Nappe phréatique élevée",
    ],
    risks: [
      "Moisissure et problèmes de santé",
      "Dommages aux biens entreposés",
      "Détérioration des finitions du sous-sol",
      "Problèmes de fondation à long terme",
    ],
    whatToCheck: [
      "Identifiez le point d'entrée de l'eau",
      "Vérifiez la pente du terrain autour de la maison",
      "Inspectez les gouttières et descentes",
      "Demandez l'âge du drain français existant",
    ],
    urgency: "high",
    contractorTypes: ["fondation", "drain", "inspection"],
    relatedProblems: ["fissure-fondation", "moisissure-grenier"],
    relatedServices: ["drain-francais", "plomberie"],
  },
  {
    slug: "barrage-glace",
    name: "Barrage de glace sur le toit",
    shortDescription: "Les barrages de glace se forment quand la chaleur s'échappe par le toit, faisant fondre la neige qui regèle en bordure. Ce phénomène typiquement québécois peut causer des dommages importants.",
    symptoms: [
      "Accumulation de glace en bordure de toit",
      "Glaçons importants aux gouttières",
      "Taches d'eau au plafond en hiver",
      "Peinture qui pèle sur les soffites",
    ],
    commonCauses: [
      "Isolation insuffisante de l'entretoit",
      "Fuite de chaleur par les luminaires encastrés",
      "Ventilation d'entretoit déficiente",
      "Ponts thermiques dans la structure du toit",
    ],
    risks: [
      "Infiltrations d'eau sous les bardeaux",
      "Dommages aux gouttières et fascias",
      "Moisissure dans l'entretoit",
      "Dommages aux murs extérieurs",
    ],
    whatToCheck: [
      "Mesurez l'épaisseur d'isolant dans l'entretoit",
      "Vérifiez la ventilation des soffites",
      "Cherchez les sources de chaleur dans l'entretoit",
      "Examinez l'état des gouttières après l'hiver",
    ],
    urgency: "medium",
    contractorTypes: ["isolation", "couvreur"],
    relatedProblems: ["infiltration-eau-toit", "moisissure-grenier"],
    relatedServices: ["isolation-entretoit", "couvreur"],
  },
  {
    slug: "fuite-plomberie",
    name: "Fuite de plomberie",
    shortDescription: "Une fuite de plomberie, même mineure, peut causer des dégâts d'eau considérables si elle n'est pas traitée rapidement.",
    symptoms: [
      "Taches d'eau sur les murs ou plafonds",
      "Son d'eau qui coule sans robinet ouvert",
      "Compteur d'eau qui tourne sans utilisation",
      "Moisissure autour des tuyaux",
      "Augmentation inexpliquée de la facture d'eau",
    ],
    commonCauses: [
      "Joints usés ou corrodés",
      "Tuyaux gelés et fissurés",
      "Pression d'eau excessive",
      "Tuyauterie vieillissante (fonte, galvanisé)",
    ],
    risks: [
      "Dégâts d'eau majeurs",
      "Moisissure dans les murs",
      "Dommages structurels",
      "Factures d'eau élevées",
    ],
    whatToCheck: [
      "Inspectez visuellement les tuyaux accessibles",
      "Surveillez le compteur d'eau",
      "Vérifiez sous les éviers et autour des toilettes",
      "Notez l'âge de la plomberie",
    ],
    urgency: "critical",
    contractorTypes: ["plombier"],
    relatedProblems: ["infiltration-sous-sol"],
    relatedServices: ["plomberie", "renovation-salle-de-bain"],
  },
];

export const getProblemBySlug = (slug: string): SeoProblem | undefined =>
  SEO_PROBLEMS.find((p) => p.slug === slug);
