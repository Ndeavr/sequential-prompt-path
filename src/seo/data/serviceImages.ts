/**
 * UNPRO — SEO Service Hero Images
 * Maps service slugs to hero images for programmatic pages.
 */

import isolationEntretoitHero from "@/assets/seo/isolation-entretoit-hero.jpg";
import isolationGrenierHero from "@/assets/seo/isolation-grenier-hero.jpg";

export interface ServiceImageSet {
  hero: string;
  alt: string;
  ogImage?: string;
}

const SERVICE_IMAGES: Record<string, ServiceImageSet> = {
  "isolation-entretoit": {
    hero: isolationEntretoitHero,
    alt: "Professionnel soufflant de l'isolant cellulose dans un entretoit résidentiel au Québec",
  },
  "isolation-grenier": {
    hero: isolationGrenierHero,
    alt: "Isolation en laine rose installée entre les solives d'un grenier résidentiel",
  },
};

export function getServiceImage(slug: string): ServiceImageSet | null {
  return SERVICE_IMAGES[slug] ?? null;
}

export default SERVICE_IMAGES;
