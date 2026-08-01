/**
 * UNPRO — Priority SEO pages.
 *
 * The 20 service × city and problem × city pages with the highest measured
 * search demand. They receive internal links from the editorial surfaces
 * (/blog, /journal) so crawl equity concentrates on them instead of being
 * spread evenly across the full programmatic index.
 *
 * Slugs must exist in `src/seo/data/services.ts`, `problems.ts` and `cities.ts`.
 */

export interface PriorityPage {
  to: string;
  label: string;
}

export const PRIORITY_PAGES: PriorityPage[] = [
  { to: "/guides/entretien-drain-francais", label: "Entretien du drain français : guide complet" },
  { to: "/services/drain-francais/montreal", label: "Drain français à Montréal" },
  { to: "/services/drain-francais/laval", label: "Drain français à Laval" },
  { to: "/services/drain-francais/longueuil", label: "Drain français à Longueuil" },
  { to: "/problems/drain-francais-bloque/montreal", label: "Drain français bloqué à Montréal" },
  { to: "/problems/infiltration-sous-sol/laval", label: "Infiltration au sous-sol à Laval" },
  { to: "/problems/fissure-fondation/montreal", label: "Fissure de fondation à Montréal" },
  { to: "/problems/fissure-fondation/terrebonne", label: "Fissure de fondation à Terrebonne" },
  { to: "/services/impermeabilisation-fondation/montreal", label: "Imperméabilisation de fondation à Montréal" },
  { to: "/services/impermeabilisation-fondation/brossard", label: "Imperméabilisation de fondation à Brossard" },
  { to: "/problems/moisissure-grenier/laval", label: "Moisissure au grenier à Laval" },
  { to: "/problems/humidite-excessive/montreal", label: "Humidité excessive à Montréal" },
  { to: "/services/decontamination/terrebonne", label: "Décontamination et désamiantage à Terrebonne" },
  { to: "/problems/amiante-maison/montreal", label: "Amiante dans une maison à Montréal" },
  { to: "/services/renovation-cuisine/longueuil", label: "Rénovation de cuisine à Longueuil" },
  { to: "/services/renovation-cuisine/repentigny", label: "Rénovation de cuisine à Repentigny" },
  { to: "/services/inspection-batiment/montreal", label: "Inspection de bâtiment à Montréal" },
  { to: "/problems/infiltration-eau-toit/laval", label: "Infiltration d'eau par le toit à Laval" },
  { to: "/problems/refoulement-egout/montreal", label: "Refoulement d'égout à Montréal" },
  { to: "/copropriete", label: "Loi 16 et gestion de copropriété au Québec" },
];
