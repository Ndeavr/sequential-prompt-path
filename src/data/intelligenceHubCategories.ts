/**
 * UNPRO — Intelligence Hub Categories
 * Powers the Intelligence Hub footer column and /intelligence hub page.
 * Each category links into an existing SEO surface when available,
 * otherwise to the /intelligence hub.
 */

export interface IntelligenceCategory {
  label: string;
  slug: string;
  href: string;
  blurb: string;
}

export const INTELLIGENCE_HUB_CATEGORIES: IntelligenceCategory[] = [
  { label: "Toiture",                slug: "toiture",                href: "/probleme/toiture",                blurb: "Infiltrations, bardeaux, membranes, ventilation de toit." },
  { label: "Isolation",              slug: "isolation",              href: "/probleme/isolation",              blurb: "Grenier, murs, sous-sol — confort et coûts énergétiques." },
  { label: "Ventilation",            slug: "ventilation",            href: "/probleme/ventilation",            blurb: "Humidité, qualité d'air, échangeurs d'air." },
  { label: "Électricité",            slug: "electricite",            href: "/probleme/electricite",            blurb: "Panneau, mise à niveau, normes RBQ et CMEQ." },
  { label: "Plomberie",              slug: "plomberie",              href: "/probleme/plomberie",              blurb: "Tuyaux, dégâts d'eau, conformité." },
  { label: "Chauffage",              slug: "chauffage",              href: "/probleme/chauffage",              blurb: "Fournaises, thermopompes, conversion énergétique." },
  { label: "Climatisation",          slug: "climatisation",          href: "/probleme/climatisation",          blurb: "Thermopompe centrale, murale, entretien." },
  { label: "Portes et fenêtres",     slug: "portes-fenetres",        href: "/probleme/portes-fenetres",        blurb: "Étanchéité, performance énergétique, subventions." },
  { label: "Fondation",              slug: "fondation",              href: "/probleme/fondation",              blurb: "Fissures, imperméabilisation, drain français." },
  { label: "Drain français",         slug: "drain-francais",         href: "/probleme/drain-francais",         blurb: "Infiltration, refoulement, remplacement." },
  { label: "Moisissure",             slug: "moisissure",             href: "/probleme/moisissure",             blurb: "Diagnostic, salubrité, décontamination." },
  { label: "Amiante",                slug: "amiante",                href: "/probleme/amiante",                blurb: "Détection, retrait sécuritaire, conformité." },
  { label: "Gestion de copropriété", slug: "gestion-copropriete",    href: "/condo",                           blurb: "Loi 16, fonds de prévoyance, entretien préventif." },
  { label: "Inspection préachat",    slug: "inspection-preachat",    href: "/probleme/inspection-preachat",    blurb: "Vérifier la santé d'une propriété avant l'achat." },
];
