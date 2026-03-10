/**
 * UNPRO — SEO City Data
 * Structured city metadata for programmatic SEO pages.
 */

export interface SeoCity {
  slug: string;
  name: string;
  region: string;
  province: string;
  nearbyCities: string[];
  climateTags: string[];
  housingHints: string;
}

export const SEO_CITIES: SeoCity[] = [
  {
    slug: "montreal",
    name: "Montréal",
    region: "Grand Montréal",
    province: "Québec",
    nearbyCities: ["laval", "longueuil", "brossard", "saint-laurent"],
    climateTags: ["hivers rigoureux", "gel-dégel fréquent", "humidité élevée"],
    housingHints: "Parc immobilier diversifié : plex, condos, maisons centenaires et constructions récentes.",
  },
  {
    slug: "laval",
    name: "Laval",
    region: "Grand Montréal",
    province: "Québec",
    nearbyCities: ["montreal", "saint-eustache", "rosemere", "boisbriand"],
    climateTags: ["hivers rigoureux", "gel-dégel fréquent"],
    housingHints: "Forte proportion de bungalows et maisons unifamiliales des années 1970–1990.",
  },
  {
    slug: "longueuil",
    name: "Longueuil",
    region: "Rive-Sud",
    province: "Québec",
    nearbyCities: ["brossard", "saint-hubert", "montreal", "boucherville"],
    climateTags: ["hivers rigoureux", "gel-dégel fréquent"],
    housingHints: "Mélange de résidences unifamiliales et de condos en développement.",
  },
  {
    slug: "quebec",
    name: "Québec",
    region: "Capitale-Nationale",
    province: "Québec",
    nearbyCities: ["levis", "beauport", "charlesbourg", "sainte-foy"],
    climateTags: ["hivers très froids", "neige abondante", "vents du fleuve"],
    housingHints: "Patrimoine bâti ancien dans le Vieux-Québec, banlieues résidentielles en périphérie.",
  },
  {
    slug: "gatineau",
    name: "Gatineau",
    region: "Outaouais",
    province: "Québec",
    nearbyCities: ["ottawa", "aylmer", "hull", "buckingham"],
    climateTags: ["hivers froids", "cycles gel-dégel"],
    housingHints: "Maisons unifamiliales et développements récents en périphérie.",
  },
  {
    slug: "sherbrooke",
    name: "Sherbrooke",
    region: "Estrie",
    province: "Québec",
    nearbyCities: ["magog", "lennoxville", "fleurimont"],
    climateTags: ["hivers froids", "neige abondante"],
    housingHints: "Résidences de taille moyenne, quartiers universitaires et banlieues familiales.",
  },
  {
    slug: "trois-rivieres",
    name: "Trois-Rivières",
    region: "Mauricie",
    province: "Québec",
    nearbyCities: ["becancour", "shawinigan", "cap-de-la-madeleine"],
    climateTags: ["hivers froids", "humidité du fleuve"],
    housingHints: "Parc résidentiel vieillissant avec beaucoup de maisons d'avant 1980.",
  },
  {
    slug: "brossard",
    name: "Brossard",
    region: "Rive-Sud",
    province: "Québec",
    nearbyCities: ["longueuil", "saint-hubert", "la-prairie", "montreal"],
    climateTags: ["hivers rigoureux", "gel-dégel fréquent"],
    housingHints: "Quartiers résidentiels récents et condos en expansion autour du REM.",
  },
  {
    slug: "levis",
    name: "Lévis",
    region: "Chaudière-Appalaches",
    province: "Québec",
    nearbyCities: ["quebec", "saint-nicolas", "saint-romuald"],
    climateTags: ["hivers très froids", "vents du fleuve"],
    housingHints: "Banlieue résidentielle avec forte croissance de constructions neuves.",
  },
  {
    slug: "terrebonne",
    name: "Terrebonne",
    region: "Lanaudière",
    province: "Québec",
    nearbyCities: ["mascouche", "lachenaie", "laval", "repentigny"],
    climateTags: ["hivers rigoureux", "gel-dégel"],
    housingHints: "Développements résidentiels récents et quartiers établis des années 1990.",
  },
];

export const getCityBySlug = (slug: string): SeoCity | undefined =>
  SEO_CITIES.find((c) => c.slug === slug);

export const getNearbyCityObjects = (city: SeoCity): SeoCity[] =>
  city.nearbyCities
    .map((s) => getCityBySlug(s))
    .filter((c): c is SeoCity => !!c);
