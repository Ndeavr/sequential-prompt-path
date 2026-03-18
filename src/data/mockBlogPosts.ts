export interface MockBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: "guides-renovation" | "conseils-entretien" | "vie-en-condo";
  categoryLabel: string;
  readingTime: number;
  tags: string[];
  publishedAt: string;
  featured?: boolean;
}

export const MOCK_BLOG_POSTS: MockBlogPost[] = [
  {
    id: "bp1", title: "Pourquoi demander 3 soumissions peut coûter plus cher", slug: "3-soumissions-cout-cache",
    excerpt: "Le réflexe de comparer 3 soumissions semble logique. Mais dans la réalité, cette approche cache des coûts que personne ne mentionne.", category: "guides-renovation", categoryLabel: "Guides rénovation",
    readingTime: 7, tags: ["soumissions", "rénovation", "économie"], publishedAt: "2026-03-10", featured: true,
  },
  {
    id: "bp2", title: "Condensation dans les fenêtres : quand s'inquiéter?", slug: "condensation-fenetres-quand-inquieter",
    excerpt: "Un peu de buée est normal. Mais quand la condensation se forme entre les vitres ou coule sur le cadre, c'est un signal d'alarme.", category: "conseils-entretien", categoryLabel: "Conseils entretien",
    readingTime: 5, tags: ["fenêtres", "condensation", "isolation"], publishedAt: "2026-03-08",
  },
  {
    id: "bp3", title: "Fissures de fondation : danger ou cosmétique?", slug: "fissures-fondation-danger-ou-cosmetique",
    excerpt: "Toutes les fissures ne se valent pas. Voici comment distinguer une fissure de retrait normal d'un problème structural.", category: "guides-renovation", categoryLabel: "Guides rénovation",
    readingTime: 8, tags: ["fondation", "structure", "inspection"], publishedAt: "2026-03-05",
  },
  {
    id: "bp4", title: "Rénover sa cuisine en 2026 : combien ça coûte vraiment?", slug: "renover-cuisine-2026-couts",
    excerpt: "Entre les armoires, les comptoirs, la plomberie et l'électricité, le budget cuisine peut vite déraper. Voici les vrais chiffres.", category: "guides-renovation", categoryLabel: "Guides rénovation",
    readingTime: 10, tags: ["cuisine", "rénovation", "budget"], publishedAt: "2026-03-01",
  },
  {
    id: "bp5", title: "Entretien de toiture : checklist avant l'hiver", slug: "entretien-toiture-checklist-hiver",
    excerpt: "Un entretien annuel bien fait peut prolonger la durée de vie de votre toiture de 10 ans. Voici exactement quoi vérifier.", category: "conseils-entretien", categoryLabel: "Conseils entretien",
    readingTime: 6, tags: ["toiture", "entretien", "hiver"], publishedAt: "2026-02-25",
  },
  {
    id: "bp6", title: "Checklist condo : préparer son printemps", slug: "checklist-condo-printemps",
    excerpt: "Le printemps est le moment idéal pour inspecter les parties communes et votre unité. Voici la liste complète.", category: "vie-en-condo", categoryLabel: "Vie en condo",
    readingTime: 5, tags: ["condo", "printemps", "entretien"], publishedAt: "2026-02-20",
  },
  {
    id: "bp7", title: "Comment bien comparer une soumission de rénovation", slug: "comparer-soumission-renovation",
    excerpt: "Deux soumissions au même prix peuvent cacher des réalités très différentes. Voici les 8 points à vérifier.", category: "guides-renovation", categoryLabel: "Guides rénovation",
    readingTime: 7, tags: ["soumissions", "comparaison", "rénovation"], publishedAt: "2026-02-15",
  },
  {
    id: "bp8", title: "Quand remplacer sa thermopompe?", slug: "quand-remplacer-thermopompe",
    excerpt: "Votre thermopompe a plus de 10 ans? Voici les signes qui indiquent qu'il est temps de la remplacer.", category: "conseils-entretien", categoryLabel: "Conseils entretien",
    readingTime: 6, tags: ["thermopompe", "chauffage", "remplacement"], publishedAt: "2026-02-10",
  },
  {
    id: "bp9", title: "Infiltration d'eau au sous-sol : agir vite", slug: "infiltration-eau-sous-sol",
    excerpt: "Une infiltration au sous-sol peut causer des dommages majeurs en quelques heures. Voici quoi faire immédiatement.", category: "guides-renovation", categoryLabel: "Guides rénovation",
    readingTime: 8, tags: ["infiltration", "sous-sol", "urgence"], publishedAt: "2026-02-05",
  },
  {
    id: "bp10", title: "10 erreurs fréquentes avant une rénovation", slug: "10-erreurs-avant-renovation",
    excerpt: "Des permis oubliés aux entrepreneurs non vérifiés, ces erreurs classiques coûtent cher aux propriétaires.", category: "guides-renovation", categoryLabel: "Guides rénovation",
    readingTime: 9, tags: ["rénovation", "erreurs", "préparation"], publishedAt: "2026-01-30",
  },
  {
    id: "bp11", title: "Obligations du copropriétaire : ce que vous devez savoir", slug: "obligations-coproprietaire",
    excerpt: "Fonds de prévoyance, entretien, assurances : un tour complet des obligations légales en copropriété au Québec.", category: "vie-en-condo", categoryLabel: "Vie en condo",
    readingTime: 7, tags: ["condo", "obligations", "loi"], publishedAt: "2026-01-25",
  },
  {
    id: "bp12", title: "Préparer sa maison pour l'automne : guide complet", slug: "preparer-maison-automne",
    excerpt: "De l'inspection de la toiture au nettoyage des gouttières, voici tout ce qu'il faut faire avant le premier gel.", category: "conseils-entretien", categoryLabel: "Conseils entretien",
    readingTime: 8, tags: ["automne", "entretien", "préparation"], publishedAt: "2026-01-20",
  },
];
