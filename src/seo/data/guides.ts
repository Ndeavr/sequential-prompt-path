/**
 * UNPRO — SEO Guide Data
 * Structured guide content for informational SEO pages.
 */

export interface SeoGuide {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  sections: { heading: string; content: string }[];
  faqs: { question: string; answer: string }[];
  relatedServices: string[];
  relatedProblems: string[];
  ctaText: string;
}

export const SEO_GUIDES: SeoGuide[] = [
  {
    slug: "comment-choisir-couvreur",
    title: "Comment choisir un couvreur au Québec",
    metaTitle: "Comment choisir un couvreur au Québec | Guide UNPRO",
    metaDescription: "Guide complet pour choisir un couvreur fiable au Québec. Vérifications essentielles, questions à poser, pièges à éviter et comment comparer les soumissions.",
    intro: "Choisir un couvreur est une décision importante qui affecte la protection de votre maison pour les 20 à 30 prochaines années. Ce guide vous aide à faire un choix éclairé en vous donnant les outils pour évaluer, comparer et sélectionner le bon professionnel.",
    sections: [
      {
        heading: "Vérifiez les licences et assurances",
        content: "Au Québec, tout entrepreneur en construction doit détenir une licence de la RBQ (Régie du bâtiment du Québec). Vérifiez le numéro de licence directement sur le site de la RBQ. Assurez-vous aussi que l'entrepreneur possède une assurance responsabilité civile valide. Demandez une preuve écrite avant de signer quoi que ce soit.",
      },
      {
        heading: "Exigez une soumission écrite et détaillée",
        content: "Une soumission verbale ou vague ne vous protège pas. Exigez un document écrit qui précise le type de matériaux, la superficie, les travaux préparatoires, la garantie offerte, le calendrier prévu et le prix total ventilé. Un entrepreneur sérieux fournit ce niveau de détail sans hésiter — c'est un meilleur indicateur de fiabilité que le simple fait d'empiler des prix concurrents.",
      },

      {
        heading: "Évaluez l'expérience et la réputation",
        content: "Recherchez des avis en ligne, demandez des références de projets similaires et vérifiez depuis combien de temps l'entreprise est active. Un couvreur établi depuis plusieurs années avec de bonnes évaluations est généralement un choix plus sûr qu'un nouvel arrivant offrant le prix le plus bas.",
      },
      {
        heading: "Comprenez la garantie",
        content: "Au Québec, la garantie légale sur les travaux de toiture est de 5 ans. Certains entrepreneurs offrent des garanties prolongées. Assurez-vous de comprendre ce que couvre la garantie exactement : matériaux, main-d'œuvre, étanchéité. Obtenez la garantie par écrit dans le contrat.",
      },
      {
        heading: "Méfiez-vous des signaux d'alarme",
        content: "Évitez les entrepreneurs qui : demandent un paiement complet avant les travaux, n'ont pas de licence RBQ, refusent de fournir un contrat écrit, proposent un prix anormalement bas, ou font du porte-à-porte après une tempête. Ces comportements sont des indicateurs de risque.",
      },
    ],
    faqs: [
      { question: "Combien coûte un toit neuf au Québec ?", answer: "Le coût moyen varie entre 5 000 $ et 15 000 $ pour une maison standard, selon la superficie, le type de bardeaux et la complexité du toit. Les toitures plates en membrane peuvent coûter davantage." },
      { question: "Quelle est la durée de vie d'une toiture en bardeaux ?", answer: "Les bardeaux d'asphalte standard durent entre 15 et 25 ans au Québec. Les bardeaux architecturaux haut de gamme peuvent durer jusqu'à 30 ans avec un entretien approprié." },
      { question: "Faut-il un permis pour refaire un toit ?", answer: "Dans la plupart des municipalités québécoises, un permis de construction est requis pour un remplacement complet de toiture. Vérifiez auprès de votre municipalité." },
    ],
    relatedServices: ["couvreur", "isolation-entretoit"],
    relatedProblems: ["infiltration-eau-toit", "barrage-glace"],
    ctaText: "Comparez les couvreurs vérifiés près de chez vous",
  },
  {
    slug: "verifier-soumission-isolation",
    title: "Que vérifier dans une soumission d'isolation",
    metaTitle: "Que vérifier dans une soumission d'isolation | Guide UNPRO",
    metaDescription: "Apprenez à lire et comparer les soumissions d'isolation. Éléments essentiels, pièges courants et comment s'assurer d'obtenir le meilleur rapport qualité-prix.",
    intro: "Recevoir des soumissions d'isolation peut être déroutant. Entre les types d'isolants, les valeurs R et les techniques d'application, il est facile de se perdre. Ce guide vous aide à comprendre chaque élément d'une soumission pour faire un choix éclairé.",
    sections: [
      {
        heading: "Vérifiez la valeur R proposée",
        content: "La valeur R mesure la résistance thermique de l'isolant. Au Québec, le Code du bâtiment recommande R-41 minimum pour les entretoits dans les nouvelles constructions. Assurez-vous que la soumission indique clairement la valeur R finale visée et pas seulement l'épaisseur d'isolant.",
      },
      {
        heading: "Comparez les types d'isolants",
        content: "Les principaux isolants utilisés au Québec sont : la cellulose soufflée (bon rapport qualité-prix), la laine minérale (résistante au feu), le polyuréthane giclé (meilleure performance par pouce). Chaque type a ses avantages selon votre situation. La soumission devrait justifier le choix proposé.",
      },
      {
        heading: "Examinez les travaux préparatoires inclus",
        content: "Une bonne soumission d'isolation devrait inclure : le scellement des fuites d'air, la protection des luminaires encastrés, la vérification de la ventilation, et le retrait de l'ancien isolant si nécessaire. Ces travaux sont essentiels à la performance finale.",
      },
    ],
    faqs: [
      { question: "Combien coûte l'isolation d'un entretoit ?", answer: "Pour une maison standard, comptez entre 2 000 $ et 5 000 $ pour de la cellulose soufflée. Le polyuréthane giclé coûte généralement plus cher mais offre une meilleure performance par pouce." },
      { question: "L'isolation est-elle admissible à des subventions ?", answer: "Oui, plusieurs programmes gouvernementaux offrent des subventions pour l'isolation résidentielle au Québec, notamment Rénoclimat et le programme fédéral de la SCHL." },
    ],
    relatedServices: ["isolation-entretoit"],
    relatedProblems: ["moisissure-grenier", "barrage-glace"],
    ctaText: "Analysez votre soumission d'isolation avec UNPRO",
  },
  {
    slug: "signes-probleme-fondation",
    title: "Les signes d'un problème de fondation",
    metaTitle: "Signes d'un problème de fondation | Guide UNPRO",
    metaDescription: "Apprenez à reconnaître les signes de problèmes de fondation : fissures, infiltrations, portes qui coincent. Quand agir et comment choisir un entrepreneur.",
    intro: "La fondation est littéralement la base de votre maison. Reconnaître les premiers signes d'un problème de fondation peut vous éviter des réparations majeures et coûteuses. Ce guide vous aide à distinguer les situations normales des vrais problèmes.",
    sections: [
      {
        heading: "Fissures : normales ou préoccupantes ?",
        content: "Les microfissures verticales (moins de 3 mm) sont souvent normales et dues au retrait du béton. Les fissures horizontales, en escalier ou qui s'élargissent avec le temps sont plus préoccupantes et nécessitent une évaluation professionnelle. Mesurez et photographiez les fissures pour suivre leur évolution.",
      },
      {
        heading: "Signes intérieurs à surveiller",
        content: "À l'intérieur, surveillez : les portes et fenêtres qui coincent soudainement, les planchers inégaux, les fissures dans le plâtre ou les joints de carrelage, et les écarts entre les murs et le plafond. Ces signes peuvent indiquer un mouvement de la fondation.",
      },
      {
        heading: "Quand faire appel à un professionnel",
        content: "Consultez un ingénieur en structure si : les fissures dépassent 5 mm de largeur, les fissures sont horizontales, il y a des infiltrations d'eau récurrentes, les planchers sont visiblement inclinés, ou si vous observez des changements rapides. Un diagnostic professionnel coûte entre 500 $ et 1 500 $ mais peut vous éviter des erreurs coûteuses.",
      },
    ],
    faqs: [
      { question: "Combien coûte une réparation de fondation ?", answer: "Les réparations mineures (injection de fissure) coûtent entre 500 $ et 2 000 $. Les réparations majeures (pieutage, remplacement partiel) peuvent dépasser 20 000 $." },
      { question: "Est-ce couvert par les assurances ?", answer: "Les assurances habitation ne couvrent généralement pas les problèmes de fondation liés à l'usure normale ou au tassement du sol. Vérifiez votre police pour les couvertures spécifiques." },
    ],
    relatedServices: ["drain-francais"],
    relatedProblems: ["fissure-fondation", "infiltration-sous-sol"],
    ctaText: "Trouvez un spécialiste en fondation vérifié",
  },
  {
    slug: "entretien-drain-francais",
    title: "Entretien du drain français : guide complet pour le Québec",
    metaTitle: "Entretien du drain français au Québec | Guide UNPRO",
    metaDescription:
      "Signes d'un drain français bouché, fréquence de nettoyage, coûts au Québec et gestes préventifs pour éviter l'infiltration au sous-sol. Guide UNPRO.",
    intro:
      "Le drain français est la première ligne de défense de votre fondation contre l'eau. Au Québec, les cycles de gel-dégel, l'argile et l'ocre ferreuse l'obstruent plus vite qu'ailleurs. Ce guide explique comment reconnaître un drain qui faiblit, à quelle fréquence l'entretenir et ce qu'un entretien coûte réellement.",
    sections: [
      {
        heading: "À quoi sert un drain français",
        content:
          "Installé au pied de la fondation, le drain français capte l'eau du sol et la dirige vers un puisard ou l'égout pluvial. Tant qu'il fonctionne, la pression hydrostatique reste faible contre vos murs de fondation. Dès qu'il s'obstrue, l'eau stagne, la pression augmente et cherche la moindre fissure pour entrer au sous-sol.",
      },
      {
        heading: "Les signes qu'un drain français est bouché",
        content:
          "Surveillez : un sous-sol humide ou une odeur de moisi persistante après la pluie, des efflorescences blanchâtres sur le béton, de l'eau qui perle au joint entre le plancher et le mur, un puisard qui se déclenche rarement malgré de fortes pluies, ou un terrain détrempé le long de la fondation. Une infiltration qui revient au même endroit deux printemps de suite est un signal fort.",
      },
      {
        heading: "L'ocre ferreuse : le facteur québécois",
        content:
          "Dans plusieurs régions du Québec, une bactérie réagit avec le fer présent dans le sol et forme un dépôt gélatineux orangé qui colmate le drain. Un drain touché par l'ocre ferreuse peut s'obstruer en 5 à 10 ans plutôt qu'en 30. Si vous voyez un résidu orange dans le puisard, faites inspecter le drain sans attendre.",
      },
      {
        heading: "Fréquence d'entretien recommandée",
        content:
          "Faites inspecter le drain par caméra tous les 5 ans en conditions normales, et tous les 2 ans en présence d'ocre ferreuse ou d'un sol argileux. Un nettoyage à haute pression est généralement requis lorsque l'inspection montre plus de 30 % d'obstruction. Gardez le rapport d'inspection : il rassure les acheteurs à la revente.",
      },
      {
        heading: "Coûts typiques au Québec",
        content:
          "Une inspection par caméra coûte généralement entre 300 $ et 600 $. Un nettoyage à haute pression se situe entre 800 $ et 2 000 $ selon la longueur et le degré d'obstruction. Le remplacement complet d'un drain, qui exige l'excavation du périmètre, dépasse souvent 15 000 $ — d'où l'intérêt d'un entretien préventif.",
      },
      {
        heading: "Gestes préventifs qui prolongent la vie du drain",
        content:
          "Prolongez les descentes de gouttière à au moins 1,5 m de la fondation, maintenez une pente positive du terrain vers l'extérieur, évitez de planter des arbres à racines agressives près de la maison, testez le puisard chaque printemps et déneigez les sorties de drain. Ces gestes réduisent directement la charge d'eau que le drain doit évacuer.",
      },
    ],
    faqs: [
      {
        question: "À quelle fréquence nettoyer un drain français ?",
        answer:
          "Tous les 5 ans en conditions normales, et tous les 2 ans si votre secteur est touché par l'ocre ferreuse ou si le sol est argileux. L'inspection par caméra détermine si un nettoyage est réellement nécessaire.",
      },
      {
        question: "Combien coûte le nettoyage d'un drain français au Québec ?",
        answer:
          "Comptez généralement de 800 $ à 2 000 $ pour un nettoyage à haute pression, et de 300 $ à 600 $ pour une inspection par caméra seule. Le prix varie selon la longueur du drain et le degré d'obstruction.",
      },
      {
        question: "Peut-on nettoyer un drain français soi-même ?",
        answer:
          "Non. Le nettoyage exige un jet à haute pression et une caméra d'inspection ; un équipement mal utilisé peut perforer un drain en PVC ou déplacer les joints. L'entretien préventif du terrain, lui, se fait très bien soi-même.",
      },
      {
        question: "Quelle est la durée de vie d'un drain français ?",
        answer:
          "De 25 à 40 ans pour un drain bien entretenu, mais de 5 à 10 ans seulement lorsque l'ocre ferreuse est présente et qu'aucun entretien n'est fait.",
      },
      {
        question: "Mon sous-sol est humide : est-ce forcément le drain ?",
        answer:
          "Pas nécessairement. Une humidité élevée peut aussi venir d'une ventilation insuffisante ou de la condensation. Une infiltration localisée et récurrente au bas des murs pointe par contre fortement vers le drain.",
      },
    ],
    relatedServices: ["drain-francais", "impermeabilisation-fondation", "sous-sol"],
    relatedProblems: ["drain-francais-bloque", "infiltration-sous-sol", "fissure-fondation"],
    ctaText: "Faites évaluer l'état de votre drain français",
  },
];


export const getGuideBySlug = (slug: string): SeoGuide | undefined =>
  SEO_GUIDES.find((g) => g.slug === slug);
