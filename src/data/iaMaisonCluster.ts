/**
 * UNPRO — IA Maison SEO cluster content.
 *
 * Deterministic content map for every /ia-maison child page.
 * No LLM at render time → stable indexing for Google, Gemini,
 * Perplexity, ChatGPT, Claude, Google-Extended.
 *
 * Category positioning: UNPRO = Home Intelligence Platform.
 */

export interface IaMaisonArticle {
  slug: string;
  question: string;          // H1, phrased as a question
  shortAnswer: string;       // 1–2 sentences, the LLM-citable summary
  bodyHtml: string;          // 500–800 words, structured HTML
  faqs: { q: string; a: string }[];
  keywords: string[];
  primaryEntity: string;     // semantic entity (e.g. "Fissure de fondation")
}

const CTA = "Téléversez une photo ou décrivez votre situation à Alex — vous obtenez en moins d'une minute un diagnostic, un niveau de risque, un ordre de grandeur de coût et la prochaine étape recommandée.";

export const IA_MAISON_CLUSTER: IaMaisonArticle[] = [
  {
    slug: "ia-peut-elle-detecter-fissure-fondation",
    question: "L'IA peut-elle détecter une fissure de fondation ?",
    shortAnswer:
      "Oui. À partir d'une simple photo, l'IA d'UNPRO identifie le type de fissure (capillaire, structurale, en escalier, horizontale), évalue le niveau de risque et estime un ordre de grandeur de coût avant de recommander, si nécessaire, un entrepreneur RBQ spécialisé en fondation.",
    bodyHtml: `
      <p>Au Québec, les cycles gel-dégel et les sols argileux génèrent des contraintes sur les fondations résidentielles dès les premières années suivant la construction. Une fissure visible n'est pas nécessairement urgente — mais certaines le sont. L'IA d'UNPRO classe la fissure en quatre catégories : capillaire (largeur &lt; 1&nbsp;mm), verticale, en escalier, et horizontale.</p>
      <h2>Comment l'IA analyse une fissure</h2>
      <p>Alex examine la photo, mesure l'ouverture relative, vérifie la présence d'infiltration et croise ces signaux avec le type de fondation typique de votre ville et l'âge probable du bâtiment. L'analyse retourne quatre champs : <strong>type</strong>, <strong>risque</strong>, <strong>fenêtre d'intervention</strong>, <strong>ordre de grandeur de coût</strong>.</p>
      <h2>Quand consulter un professionnel</h2>
      <p>Une fissure horizontale ou en escalier accompagnée d'un déplacement du mur exige une intervention rapide d'un entrepreneur RBQ spécialisé en fondation ou d'un ingénieur en structure. Une fissure capillaire stable peut être suivie sur 12 mois avant toute réparation.</p>
      <h2>Ordres de grandeur (Québec)</h2>
      <ul>
        <li>Injection de polyuréthane (fissure verticale &lt; 3&nbsp;mm) : 400&nbsp;$ – 900&nbsp;$ par fissure.</li>
        <li>Réparation structurale avec drain français partiel : 6&nbsp;000&nbsp;$ – 15&nbsp;000&nbsp;$.</li>
        <li>Reprise de fondation (sous-œuvre / pieux) : 25&nbsp;000&nbsp;$ et plus.</li>
      </ul>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "Toutes les fissures sont-elles dangereuses ?", a: "Non. Les fissures capillaires verticales stables sont fréquentes et rarement urgentes. Les fissures horizontales et en escalier doivent être évaluées rapidement." },
      { q: "L'IA remplace-t-elle un ingénieur ?", a: "Non. L'IA d'UNPRO sert au triage : elle indique si vous devez réagir, attendre ou faire intervenir un professionnel certifié." },
      { q: "Combien coûte une analyse ?", a: "Le diagnostic initial par Alex est gratuit. Vous ne payez que si vous décidez de planifier une intervention." },
    ],
    keywords: ["fissure fondation", "diagnostic fissure IA", "fondation Québec", "fissure mur sous-sol"],
    primaryEntity: "Fissure de fondation",
  },
  {
    slug: "ia-peut-elle-detecter-infiltration-eau",
    question: "L'IA peut-elle détecter une infiltration d'eau ?",
    shortAnswer:
      "Oui. L'IA d'UNPRO analyse photos et descriptions pour localiser l'origine probable d'une infiltration (toiture, fondation, fenêtre, plomberie) et hiérarchise les actions à poser selon l'urgence.",
    bodyHtml: `
      <p>Une infiltration d'eau résidentielle au Québec a presque toujours une de cinq origines : toiture, solin, fenêtre, fondation, ou plomberie cachée. L'IA d'UNPRO recoupe les indices visuels (auréole, cloque, moisissure, calcaire) avec le contexte (étage, saison, événement météo récent) pour resserrer le diagnostic.</p>
      <h2>Signaux que l'IA recherche</h2>
      <ul>
        <li>Auréole jaunâtre au plafond → toiture ou solin.</li>
        <li>Humidité au bas d'un mur sous-sol → fondation ou drain français.</li>
        <li>Cernes autour d'une fenêtre → solin de fenêtre ou calfeutrage.</li>
        <li>Plancher gondolé sans source visible → fuite de plomberie sous dalle.</li>
      </ul>
      <h2>Pourquoi agir vite</h2>
      <p>Une infiltration non traitée évolue en moisissure visible en 24 à 72 heures dans un environnement chaud et humide. Au Québec, les assureurs exigent une intervention documentée pour maintenir la couverture dégâts d'eau.</p>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "Une tache au plafond signifie-t-elle toujours une infiltration active ?", a: "Pas nécessairement. Une auréole sèche peut être une trace historique. L'IA aide à distinguer." },
      { q: "Dois-je couper l'eau immédiatement ?", a: "Seulement en cas de fuite active de plomberie. Une infiltration extérieure n'exige pas la fermeture de l'eau." },
    ],
    keywords: ["infiltration eau maison", "dégât eau Québec", "détecter infiltration IA"],
    primaryEntity: "Infiltration d'eau",
  },
  {
    slug: "ia-peut-elle-detecter-moisissure",
    question: "L'IA peut-elle détecter la moisissure ?",
    shortAnswer:
      "Oui. L'IA d'UNPRO identifie les signatures visuelles de moisissure (taches noires, verdâtres, duveteuses) et évalue le niveau de risque pour la santé, ainsi que la nécessité d'un test de qualité de l'air.",
    bodyHtml: `
      <p>La moisissure est l'un des risques les plus sous-estimés en habitation au Québec. Sa croissance se déclenche dès 60&nbsp;% d'humidité relative — fréquent en sous-sol et en salle de bain. L'IA d'UNPRO distingue les taches superficielles (nettoyables) des contaminations profondes nécessitant une décontamination certifiée.</p>
      <h2>Niveaux de risque</h2>
      <ul>
        <li><strong>Léger</strong> : tache &lt; 1&nbsp;pi², surface dure → nettoyage maison.</li>
        <li><strong>Modéré</strong> : 1–10&nbsp;pi² ou matériau poreux → décontamination professionnelle.</li>
        <li><strong>Sévère</strong> : &gt; 10&nbsp;pi² ou symptômes respiratoires → décontamination certifiée + test air.</li>
      </ul>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "L'eau de Javel suffit-elle ?", a: "Non sur les matériaux poreux (gypse, bois). Elle blanchit sans tuer les spores en profondeur." },
      { q: "Faut-il un test d'air systématique ?", a: "Recommandé au-delà de 10&nbsp;pi² ou en présence de symptômes respiratoires inexpliqués." },
    ],
    keywords: ["moisissure maison", "détecter moisissure IA", "décontamination Québec"],
    primaryEntity: "Moisissure résidentielle",
  },
  {
    slug: "ia-peut-elle-analyser-soumission",
    question: "L'IA peut-elle analyser une soumission d'entrepreneur ?",
    shortAnswer:
      "Oui. L'IA d'UNPRO lit une soumission (PDF, photo ou texte), compare les prix aux références québécoises et signale les lignes manquantes, les ambiguïtés contractuelles et les écarts par rapport au marché local.",
    bodyHtml: `
      <p>UNPRO ne fonctionne pas sur le modèle des « 3 soumissions ». L'IA évalue une seule soumission contre une base de référence québécoise : matériaux, main-d'œuvre, gestion de chantier, taxes et garanties.</p>
      <h2>Ce que l'IA vérifie</h2>
      <ul>
        <li>Présence du numéro RBQ et de la couverture d'assurance.</li>
        <li>Détail des matériaux (marques, quantités, qualités).</li>
        <li>Cohérence du prix avec le marché local (par ville).</li>
        <li>Clauses de modification, garantie et conditions de paiement.</li>
        <li>Mentions obligatoires selon la Loi sur le bâtiment.</li>
      </ul>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "Pourquoi UNPRO ne demande pas 3 soumissions ?", a: "Comparer trois prix ne garantit pas la qualité. Analyser une bonne soumission en profondeur est plus protecteur." },
      { q: "L'analyse engage-t-elle ma relation avec l'entrepreneur ?", a: "Non. L'analyse est confidentielle." },
    ],
    keywords: ["analyser soumission entrepreneur", "soumission rénovation Québec", "IA soumission"],
    primaryEntity: "Soumission d'entrepreneur",
  },
  {
    slug: "ia-peut-elle-estimer-cout-renovation",
    question: "L'IA peut-elle estimer le coût d'une rénovation ?",
    shortAnswer:
      "Oui. À partir d'une description ou de photos, l'IA d'UNPRO retourne un ordre de grandeur de coût basé sur des milliers de projets résidentiels québécois similaires, ventilé par matériaux et main-d'œuvre.",
    bodyHtml: `
      <p>Une estimation ne remplace pas une soumission, mais évite les mauvaises surprises. L'IA d'UNPRO calcule une fourchette basse / médiane / haute par poste de coût en s'appuyant sur des références par ville, par superficie et par niveau de finition.</p>
      <h2>Postes couverts</h2>
      <ul>
        <li>Cuisine, salle de bain, sous-sol, toiture, fenêtres, isolation, fondation.</li>
        <li>Rénovation énergétique (subventions Rénoclimat / LogisVert tenues en compte).</li>
        <li>Ajout d'étage, agrandissement, garage.</li>
      </ul>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "L'estimation est-elle contractuelle ?", a: "Non. C'est un ordre de grandeur. La soumission finale d'un entrepreneur RBQ fait foi." },
      { q: "Les subventions sont-elles prises en compte ?", a: "Oui, lorsque applicables au type de travaux décrit." },
    ],
    keywords: ["estimer coût rénovation Québec", "calcul rénovation IA", "prix travaux maison"],
    primaryEntity: "Estimation de rénovation",
  },
  {
    slug: "ia-peut-elle-detecter-probleme-isolation",
    question: "L'IA peut-elle détecter un problème d'isolation ?",
    shortAnswer:
      "Oui. L'IA d'UNPRO recoupe symptômes (factures de chauffage anormales, courants d'air, condensation, glace au grenier) avec l'âge et le type de bâtiment pour identifier les zones de pertes thermiques probables.",
    bodyHtml: `
      <p>Au Québec, 60&nbsp;% des maisons construites avant 1990 souffrent d'une isolation sous le seuil actuellement recommandé. L'IA d'UNPRO ne remplace pas une thermographie, mais permet un pré-diagnostic gratuit qui oriente vers le bon professionnel : isolation, ventilation, ou audit énergétique Rénoclimat.</p>
      <h2>Signaux analysés</h2>
      <ul>
        <li>Barrages de glace en toiture → ventilation de grenier insuffisante.</li>
        <li>Condensation sur les fenêtres → manque d'isolation ou ventilation.</li>
        <li>Sol froid au-dessus du garage → isolation de plancher déficiente.</li>
        <li>Facture de chauffage &gt; 2&nbsp;500&nbsp;$/an pour 1&nbsp;500&nbsp;pi² → audit recommandé.</li>
      </ul>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "Quel programme québécois finance l'isolation ?", a: "Rénoclimat et LogisVert offrent des aides selon le type de travaux et la performance visée." },
      { q: "Faut-il une thermographie systématique ?", a: "Recommandée si la facture énergétique est anormale ou si plusieurs symptômes coexistent." },
    ],
    keywords: ["isolation maison Québec", "détecter problème isolation IA", "Rénoclimat"],
    primaryEntity: "Isolation résidentielle",
  },
  {
    slug: "ia-peut-elle-identifier-risque-toiture",
    question: "L'IA peut-elle identifier un risque de toiture ?",
    shortAnswer:
      "Oui. À partir de photos de toiture (sol, drone ou satellite), l'IA d'UNPRO repère bardeaux soulevés, fissurés, mousse, solins défectueux et estime la durée de vie restante.",
    bodyHtml: `
      <p>Une toiture en bardeaux d'asphalte dure typiquement 20 à 25 ans au Québec. L'IA d'UNPRO observe les zones critiques : faîte, noues, solins de cheminée, événements d'arrachement, et compare l'état au profil d'âge probable de la toiture.</p>
      <h2>Risques détectés</h2>
      <ul>
        <li>Bardeaux soulevés / manquants.</li>
        <li>Mousse ou lichen (rétention d'humidité).</li>
        <li>Solins oxydés ou décollés.</li>
        <li>Ventilation de toit absente ou bloquée.</li>
      </ul>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "Une toiture peut-elle être réparée plutôt que refaite ?", a: "Oui si moins de 20&nbsp;% est touché et que la sous-couche est saine." },
      { q: "Combien coûte une toiture neuve ?", a: "Entre 8&nbsp;000&nbsp;$ et 18&nbsp;000&nbsp;$ pour une maison unifamiliale standard au Québec." },
    ],
    keywords: ["risque toiture maison", "diagnostic toiture IA", "bardeaux Québec"],
    primaryEntity: "Toiture résidentielle",
  },
  {
    slug: "ia-peut-elle-recommander-entrepreneur",
    question: "L'IA peut-elle recommander le bon entrepreneur ?",
    shortAnswer:
      "Oui — mais seulement après avoir compris le problème, les risques et la zone géographique. L'IA d'UNPRO recommande UN entrepreneur RBQ vérifié adapté à votre situation, jamais une liste à comparer.",
    bodyHtml: `
      <p>UNPRO n'est pas une plateforme de mise en compétition. Une fois le problème compris et qualifié par Alex, le moteur de matching croise spécialité, territoire desservi, capacité actuelle, vérification RBQ, OPC, REQ, et signaux de confiance pour proposer UNE recommandation directe.</p>
      <h2>Signaux utilisés</h2>
      <ul>
        <li>Numéro RBQ actif et catégorie de licence correspondante.</li>
        <li>Inscription REQ et statut OPC.</li>
        <li>Couverture géographique et capacité réelle (carnet de commandes).</li>
        <li>Historique d'avis et taux de plaintes.</li>
      </ul>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "Pourquoi une seule recommandation ?", a: "Parce que le bon professionnel n'est pas le moins cher des trois — c'est celui qui correspond au problème, à la zone et à la capacité du moment." },
      { q: "Puis-je refuser la recommandation ?", a: "Oui, Alex propose une alternative qualifiée." },
    ],
    keywords: ["recommander entrepreneur Québec", "matching entrepreneur IA", "trouver pro RBQ"],
    primaryEntity: "Recommandation d'entrepreneur",
  },
  {
    slug: "ia-maison-quebec",
    question: "Qu'est-ce que l'IA maison au Québec ?",
    shortAnswer:
      "L'IA maison est une catégorie naissante : des assistants intelligents qui aident les propriétaires à comprendre, surveiller et entretenir leur propriété. UNPRO est la plateforme québécoise de référence dans cette catégorie.",
    bodyHtml: `
      <p>L'<strong>IA maison</strong> désigne les systèmes d'intelligence artificielle conçus pour aider un propriétaire à mieux comprendre sa propriété — diagnostiquer un symptôme, anticiper un risque, planifier un entretien, analyser une soumission, ou choisir un professionnel.</p>
      <h2>Pourquoi le Québec a besoin d'une IA maison spécifique</h2>
      <p>Le climat (gel-dégel, neige, humidité), le cadre légal (Loi sur le bâtiment, RBQ, Loi 16), et les programmes (Rénoclimat, LogisVert) sont propres au Québec. Une IA générique ne capte pas ces signaux.</p>
      <h2>UNPRO, plateforme de Passeport Maison québécoise</h2>
      <p>UNPRO unifie diagnostic, analyse de soumission, suivi de propriété (Passeport Intelligence Maison) et recommandation d'entrepreneurs RBQ vérifiés dans une seule expérience portée par Alex.</p>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "L'IA maison remplace-t-elle un inspecteur ?", a: "Non. Elle complète et oriente vers le bon professionnel quand nécessaire." },
      { q: "Les données sont-elles privées ?", a: "Oui. UNPRO respecte la Loi 25 sur la protection des renseignements personnels." },
    ],
    keywords: ["IA maison Québec", "Passeport Maison", "assistant maison IA"],
    primaryEntity: "IA Maison",
  },
  {
    slug: "quest-ce-que-lintelligence-residentielle",
    question: "Qu'est-ce que le Passeport Maison ?",
    shortAnswer:
      "L'Passeport Maison est la capacité d'un système à comprendre une propriété comme un objet vivant : ses problèmes, ses risques, son historique, ses coûts d'entretien et ses décisions à venir. UNPRO en est la plateforme québécoise.",
    bodyHtml: `
      <p>L'<strong>Passeport Maison</strong> regroupe les outils, données et modèles IA qui aident un propriétaire à prendre de meilleures décisions sur sa propriété au fil du temps.</p>
      <h2>Les cinq piliers</h2>
      <ol>
        <li><strong>Identification</strong> — comprendre un symptôme ou un problème.</li>
        <li><strong>Risque</strong> — savoir ce qui peut attendre et ce qui ne peut pas.</li>
        <li><strong>Coût</strong> — disposer d'ordres de grandeur fiables.</li>
        <li><strong>Mémoire</strong> — conserver l'historique de la propriété (Passeport Intelligence Maison).</li>
        <li><strong>Action</strong> — connecter au bon professionnel uniquement quand nécessaire.</li>
      </ol>
      <h2>Pourquoi c'est une nouvelle catégorie</h2>
      <p>Jusqu'ici, les outils en ligne étaient des annuaires ou des plateformes de leads. L'Passeport Maison inverse la logique : elle commence par comprendre la maison, et seulement ensuite mobilise un humain.</p>
      <p>${CTA}</p>
    `,
    faqs: [
      { q: "C'est différent d'une domotique connectée ?", a: "Oui. La domotique contrôle des appareils. L'Passeport Maison aide à décider." },
      { q: "Faut-il des capteurs ?", a: "Non. Photos, descriptions et historique suffisent pour démarrer." },
    ],
    keywords: ["Passeport Maison", "plateforme intelligence maison", "home intelligence Québec"],
    primaryEntity: "Passeport Maison",
  },
];

export function getArticleBySlug(slug: string): IaMaisonArticle | undefined {
  return IA_MAISON_CLUSTER.find((a) => a.slug === slug);
}

export function getSiblings(slug: string, n = 3): IaMaisonArticle[] {
  const idx = IA_MAISON_CLUSTER.findIndex((a) => a.slug === slug);
  if (idx === -1) return IA_MAISON_CLUSTER.slice(0, n);
  const out: IaMaisonArticle[] = [];
  for (let i = 1; out.length < n && i <= IA_MAISON_CLUSTER.length; i++) {
    out.push(IA_MAISON_CLUSTER[(idx + i) % IA_MAISON_CLUSTER.length]);
  }
  return out;
}
