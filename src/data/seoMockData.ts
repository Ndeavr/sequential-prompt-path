/**
 * UNPRO — SEO Mock Data
 * Cities, services, problems, professionals for programmatic pages.
 */

export interface MockCity {
  slug: string;
  name: string;
  province: string;
  population: number;
  nearby: string[];
}

export interface MockService {
  slug: string;
  name: string;
  nameEn: string;
  icon: string;
  professions: string[];
}

export interface MockProblem {
  slug: string;
  name: string;
  nameEn: string;
  category: string;
  relatedServices: string[];
  urgency: "low" | "medium" | "high";
}

export interface MockProfession {
  slug: string;
  name: string;
  nameEn: string;
  services: string[];
}

export const mockCities: MockCity[] = [
  { slug: "montreal", name: "Montréal", province: "QC", population: 1780000, nearby: ["laval", "longueuil", "brossard"] },
  { slug: "laval", name: "Laval", province: "QC", population: 438000, nearby: ["montreal", "terrebonne", "saint-eustache"] },
  { slug: "longueuil", name: "Longueuil", province: "QC", population: 253000, nearby: ["montreal", "brossard", "saint-hubert"] },
  { slug: "brossard", name: "Brossard", province: "QC", population: 90000, nearby: ["longueuil", "saint-constant", "montreal"] },
  { slug: "saint-constant", name: "Saint-Constant", province: "QC", population: 29000, nearby: ["brossard", "longueuil", "chateauguay"] },
  { slug: "terrebonne", name: "Terrebonne", province: "QC", population: 119000, nearby: ["laval", "mascouche", "repentigny"] },
];

export const mockServices: MockService[] = [
  { slug: "isolation-grenier", name: "Isolation de grenier", nameEn: "Attic Insulation", icon: "Thermometer", professions: ["isolateur", "entrepreneur-general"] },
  { slug: "toiture", name: "Toiture", nameEn: "Roofing", icon: "Home", professions: ["couvreur"] },
  { slug: "fondation", name: "Fondation", nameEn: "Foundation", icon: "Layers", professions: ["expert-fondation"] },
  { slug: "fenetres", name: "Fenêtres", nameEn: "Windows", icon: "Square", professions: ["installateur-fenetres"] },
  { slug: "chauffage", name: "Chauffage", nameEn: "Heating", icon: "Flame", professions: ["technicien-chauffage"] },
];

export const mockProblems: MockProblem[] = [
  { slug: "toiture-qui-fuit", name: "Toiture qui fuit", nameEn: "Leaking Roof", category: "toiture", relatedServices: ["toiture"], urgency: "high" },
  { slug: "condensation-fenetres", name: "Condensation fenêtres", nameEn: "Window Condensation", category: "fenetres", relatedServices: ["fenetres", "isolation-grenier"], urgency: "medium" },
  { slug: "fissure-fondation", name: "Fissure fondation", nameEn: "Foundation Crack", category: "fondation", relatedServices: ["fondation"], urgency: "high" },
  { slug: "perte-de-chaleur", name: "Perte de chaleur", nameEn: "Heat Loss", category: "isolation", relatedServices: ["isolation-grenier", "fenetres"], urgency: "medium" },
  { slug: "humidite-sous-sol", name: "Humidité sous-sol", nameEn: "Basement Moisture", category: "fondation", relatedServices: ["fondation"], urgency: "medium" },
];

export const mockProfessions: MockProfession[] = [
  { slug: "couvreur", name: "Couvreurs", nameEn: "Roofers", services: ["toiture"] },
  { slug: "isolateur", name: "Entreprises d'isolation", nameEn: "Insulation Companies", services: ["isolation-grenier"] },
  { slug: "expert-fondation", name: "Experts en fondation", nameEn: "Foundation Experts", services: ["fondation"] },
  { slug: "notaire", name: "Notaires", nameEn: "Notaries", services: [] },
  { slug: "courtier-immobilier", name: "Courtiers immobiliers", nameEn: "Real Estate Brokers", services: [] },
];

export const mockGuides = [
  { slug: "combien-coute-isolation-grenier", title: "Combien coûte isoler un grenier ?", titleEn: "How much does attic insulation cost?" },
  { slug: "quand-refaire-toiture", title: "Quand refaire une toiture ?", titleEn: "When to redo a roof?" },
  { slug: "comment-verifier-entrepreneur", title: "Comment vérifier un entrepreneur ?", titleEn: "How to verify a contractor?" },
  { slug: "quoi-faire-avant-signer-contrat", title: "Quoi faire avant de signer un contrat ?", titleEn: "What to do before signing a contract?" },
];

/** Get contextual links based on page type */
export function getContextualLinks(pageType: string, slug?: string, city?: string) {
  const links: { section: string; sectionEn: string; items: { to: string; label: string }[] }[] = [];

  if (pageType === "problem" || pageType === "problem-city") {
    const problem = mockProblems.find(p => p.slug === slug);
    if (problem) {
      links.push({
        section: "Services reliés", sectionEn: "Related Services",
        items: problem.relatedServices.map(s => {
          const svc = mockServices.find(sv => sv.slug === s);
          return { to: `/services/${s}`, label: svc?.name || s };
        }),
      });
      links.push({
        section: "Professionnels", sectionEn: "Professionals",
        items: mockProfessions.filter(p => problem.relatedServices.some(s => p.services.includes(s))).map(p => ({
          to: `/professionnels/${p.slug}`, label: p.name,
        })),
      });
    }
    if (city) {
      const c = mockCities.find(ci => ci.slug === city);
      if (c) {
        links.push({
          section: "Villes proches", sectionEn: "Nearby Cities",
          items: c.nearby.map(n => {
            const nc = mockCities.find(ci => ci.slug === n);
            return { to: `/villes/${n}`, label: nc?.name || n };
          }),
        });
      }
    }
  }

  if (pageType === "city") {
    links.push({
      section: "Services populaires", sectionEn: "Popular Services",
      items: mockServices.slice(0, 4).map(s => ({ to: `/villes/${slug}/${s.slug}`, label: s.name })),
    });
    links.push({
      section: "Problèmes fréquents", sectionEn: "Common Problems",
      items: mockProblems.slice(0, 4).map(p => ({ to: `/problemes/${p.slug}`, label: p.name })),
    });
  }

  if (pageType === "service") {
    links.push({
      section: "Problèmes résolus", sectionEn: "Problems Solved",
      items: mockProblems.filter(p => p.relatedServices.includes(slug || "")).map(p => ({
        to: `/problemes/${p.slug}`, label: p.name,
      })),
    });
    links.push({
      section: "Villes", sectionEn: "Cities",
      items: mockCities.slice(0, 4).map(c => ({ to: `/villes/${c.slug}/${slug}`, label: c.name })),
    });
  }

  if (pageType === "professional") {
    const prof = mockProfessions.find(p => p.slug === slug);
    if (prof) {
      links.push({
        section: "Services", sectionEn: "Services",
        items: prof.services.map(s => {
          const svc = mockServices.find(sv => sv.slug === s);
          return { to: `/services/${s}`, label: svc?.name || s };
        }),
      });
    }
    links.push({
      section: "Villes", sectionEn: "Cities",
      items: mockCities.slice(0, 4).map(c => ({ to: `/professionnels/${slug}/${c.slug}`, label: c.name })),
    });
  }

  return links;
}
