/**
 * UNPRO — Programmatic SEO Generation Service
 * Generates slug combinations for profession+ville, specialty+ville, problem+ville.
 * Used by the seed edge function and admin tools.
 */

export interface SeoPageSeed {
  slug: string;
  page_type: string;
  title: string;
  h1: string;
  meta_description: string;
  body_md: string;
  faq_json: Array<{ question: string; answer: string }>;
  schema_json: Record<string, unknown>;
  intent: string;
  profession?: string;
  specialty?: string;
  city: string;
  internal_links: string[];
}

// ─── Data pools ───

const CITIES = [
  "montreal", "laval", "longueuil", "quebec", "gatineau", "sherbrooke",
  "trois-rivieres", "levis", "terrebonne", "saint-jean-sur-richelieu",
  "brossard", "repentigny", "drummondville", "granby", "saint-hyacinthe",
];

const CITY_LABELS: Record<string, string> = {
  "montreal": "Montréal", "laval": "Laval", "longueuil": "Longueuil",
  "quebec": "Québec", "gatineau": "Gatineau", "sherbrooke": "Sherbrooke",
  "trois-rivieres": "Trois-Rivières", "levis": "Lévis",
  "terrebonne": "Terrebonne", "saint-jean-sur-richelieu": "Saint-Jean-sur-Richelieu",
  "brossard": "Brossard", "repentigny": "Repentigny",
  "drummondville": "Drummondville", "granby": "Granby",
  "saint-hyacinthe": "Saint-Hyacinthe",
};

const PROFESSIONS = [
  { slug: "couvreur", label: "Couvreur", desc: "spécialiste en toiture" },
  { slug: "plombier", label: "Plombier", desc: "expert en plomberie" },
  { slug: "electricien", label: "Électricien", desc: "maître électricien" },
  { slug: "entrepreneur-general", label: "Entrepreneur général", desc: "entrepreneur en rénovation" },
  { slug: "peintre", label: "Peintre", desc: "peintre résidentiel" },
  { slug: "menuisier", label: "Menuisier", desc: "artisan menuisier" },
  { slug: "maconnerie", label: "Maçon", desc: "spécialiste en maçonnerie" },
  { slug: "isolation", label: "Expert en isolation", desc: "isolateur certifié" },
  { slug: "courtier-immobilier", label: "Courtier immobilier", desc: "courtier certifié" },
];

const PROBLEMS = [
  { slug: "infiltration-eau", label: "Infiltration d'eau", urgency: "high" },
  { slug: "toiture-usee", label: "Toiture usée", urgency: "high" },
  { slug: "fissure-fondation", label: "Fissure de fondation", urgency: "high" },
  { slug: "moisissure", label: "Moisissure", urgency: "high" },
  { slug: "perte-chaleur", label: "Perte de chaleur", urgency: "medium" },
  { slug: "condensation-fenetre", label: "Condensation aux fenêtres", urgency: "medium" },
  { slug: "drain-francais", label: "Drain français défaillant", urgency: "high" },
  { slug: "panneau-electrique-ancien", label: "Panneau électrique ancien", urgency: "medium" },
  { slug: "plancher-endommage", label: "Plancher endommagé", urgency: "low" },
  { slug: "humidite-sous-sol", label: "Humidité au sous-sol", urgency: "high" },
];

// ─── Generators ───

function generateProfessionCityPage(prof: typeof PROFESSIONS[0], citySlug: string): SeoPageSeed {
  const cityLabel = CITY_LABELS[citySlug] || citySlug;
  const slug = `${prof.slug}-${citySlug}`;
  return {
    slug,
    page_type: "profession_city",
    title: `${prof.label} à ${cityLabel} — Vérifié UNPRO`,
    h1: `Trouver un ${prof.label.toLowerCase()} vérifié à ${cityLabel}`,
    meta_description: `Comparez les meilleurs ${prof.label.toLowerCase()}s à ${cityLabel}. Profils vérifiés, score AIPP, avis authentiques. Obtenez votre soumission gratuite.`,
    body_md: `## ${prof.label} à ${cityLabel}\n\nVous cherchez un ${prof.desc} fiable à ${cityLabel}? UNPRO vous met en contact avec des professionnels vérifiés dans votre secteur.\n\n### Pourquoi choisir un professionnel vérifié?\n\n- **Licence validée** auprès de la RBQ\n- **Score AIPP** mesurant la performance réelle\n- **Avis authentiques** de propriétaires vérifiés\n- **Assurance responsabilité** confirmée\n\n### Comment ça marche\n\n1. Décrivez votre projet en 2 minutes\n2. Recevez des profils matchés par IA\n3. Comparez et choisissez votre professionnel`,
    faq_json: [
      { question: `Comment trouver un bon ${prof.label.toLowerCase()} à ${cityLabel}?`, answer: `Utilisez UNPRO pour comparer des ${prof.label.toLowerCase()}s vérifiés à ${cityLabel}. Notre score AIPP mesure la performance réelle de chaque professionnel.` },
      { question: `Combien coûte un ${prof.label.toLowerCase()} à ${cityLabel}?`, answer: `Les tarifs varient selon le projet. Obtenez une estimation gratuite en décrivant votre besoin sur UNPRO.` },
      { question: `Le ${prof.label.toLowerCase()} est-il assuré?`, answer: `Tous les professionnels sur UNPRO ont une assurance responsabilité vérifiée et une licence RBQ validée.` },
    ],
    schema_json: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${prof.label} à ${cityLabel}`,
      areaServed: { "@type": "City", name: cityLabel },
      provider: { "@type": "Organization", name: "UNPRO" },
    },
    intent: "find_professional",
    profession: prof.slug,
    city: citySlug,
    internal_links: [
      `/profession/${prof.slug}`,
      `/ville/${citySlug}`,
      `/services`,
    ],
  };
}

function generateProblemCityPage(problem: typeof PROBLEMS[0], citySlug: string): SeoPageSeed {
  const cityLabel = CITY_LABELS[citySlug] || citySlug;
  const slug = `${problem.slug}-${citySlug}`;
  return {
    slug,
    page_type: "problem_city",
    title: `${problem.label} à ${cityLabel} — Solutions et coûts | UNPRO`,
    h1: `${problem.label} à ${cityLabel} : causes, solutions et professionnels`,
    meta_description: `${problem.label} à ${cityLabel}? Découvrez les causes, solutions, coûts estimés et professionnels vérifiés pour résoudre ce problème rapidement.`,
    body_md: `## ${problem.label} à ${cityLabel}\n\nProblème fréquent dans les propriétés de ${cityLabel}, ${problem.label.toLowerCase()} peut causer des dommages importants si non traité.\n\n### Signes à surveiller\n\n- Taches d'humidité ou décoloration\n- Odeurs persistantes\n- Dégradation visible des matériaux\n\n### Solutions recommandées\n\nSelon la gravité, un professionnel vérifié UNPRO peut intervenir pour diagnostiquer et corriger le problème.\n\n### Coût estimé\n\nLe coût varie selon l'étendue des travaux. Obtenez une estimation personnalisée en décrivant votre situation.`,
    faq_json: [
      { question: `Que faire en cas de ${problem.label.toLowerCase()} à ${cityLabel}?`, answer: `Contactez un professionnel vérifié UNPRO pour un diagnostic. Un traitement rapide prévient les dommages plus coûteux.` },
      { question: `Combien coûte la réparation?`, answer: `Les coûts varient de quelques centaines à plusieurs milliers de dollars selon la gravité. UNPRO vous aide à obtenir des soumissions comparables.` },
      { question: `Est-ce urgent?`, answer: problem.urgency === "high" ? "Oui, ce problème nécessite une attention rapide pour éviter des dommages structurels." : "Ce problème peut être planifié, mais ne doit pas être ignoré à long terme." },
    ],
    schema_json: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: `Que faire en cas de ${problem.label.toLowerCase()}?`, acceptedAnswer: { "@type": "Answer", text: `Contactez un professionnel vérifié pour un diagnostic rapide.` } },
      ],
    },
    intent: "solve_problem",
    specialty: problem.slug,
    city: citySlug,
    internal_links: [
      `/probleme/${problem.slug}`,
      `/ville/${citySlug}`,
      `/services`,
    ],
  };
}

// ─── Main generator ───

export function generateAllSeoPages(): SeoPageSeed[] {
  const pages: SeoPageSeed[] = [];

  // Profession × City
  for (const prof of PROFESSIONS) {
    for (const city of CITIES) {
      pages.push(generateProfessionCityPage(prof, city));
    }
  }

  // Problem × City
  for (const problem of PROBLEMS) {
    for (const city of CITIES) {
      pages.push(generateProblemCityPage(problem, city));
    }
  }

  return pages;
}

export { CITIES, CITY_LABELS, PROFESSIONS, PROBLEMS };
