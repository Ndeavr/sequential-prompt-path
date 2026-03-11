/**
 * UNPRO — SEO City Data
 * 50+ cities for 30,000+ programmatic SEO pages.
 * 25 services × 15 problems × 50 cities = ~2,000 pages
 * With sub-categories and variants: 30,000+ unique URLs
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
  // ─── Grand Montréal ───
  { slug: "montreal", name: "Montréal", region: "Grand Montréal", province: "Québec", nearbyCities: ["laval", "longueuil", "brossard", "saint-laurent", "verdun", "lachine"], climateTags: ["hivers rigoureux", "gel-dégel fréquent", "humidité élevée"], housingHints: "Parc immobilier diversifié : plex, condos, maisons centenaires et constructions récentes." },
  { slug: "laval", name: "Laval", region: "Grand Montréal", province: "Québec", nearbyCities: ["montreal", "saint-eustache", "rosemere", "boisbriand", "terrebonne"], climateTags: ["hivers rigoureux", "gel-dégel fréquent"], housingHints: "Forte proportion de bungalows et maisons unifamiliales des années 1970–1990." },
  { slug: "longueuil", name: "Longueuil", region: "Rive-Sud", province: "Québec", nearbyCities: ["brossard", "saint-hubert", "montreal", "boucherville"], climateTags: ["hivers rigoureux", "gel-dégel fréquent"], housingHints: "Mélange de résidences unifamiliales et de condos en développement." },
  { slug: "brossard", name: "Brossard", region: "Rive-Sud", province: "Québec", nearbyCities: ["longueuil", "saint-hubert", "la-prairie", "montreal"], climateTags: ["hivers rigoureux", "gel-dégel fréquent"], housingHints: "Quartiers résidentiels récents et condos en expansion autour du REM." },
  { slug: "terrebonne", name: "Terrebonne", region: "Lanaudière", province: "Québec", nearbyCities: ["mascouche", "lachenaie", "laval", "repentigny"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Développements résidentiels récents et quartiers établis des années 1990." },
  { slug: "saint-laurent", name: "Saint-Laurent", region: "Grand Montréal", province: "Québec", nearbyCities: ["montreal", "laval", "dorval", "pointe-claire"], climateTags: ["hivers rigoureux", "gel-dégel fréquent"], housingHints: "Mix industriel et résidentiel avec bungalows des années 1960–1980." },
  { slug: "verdun", name: "Verdun", region: "Grand Montréal", province: "Québec", nearbyCities: ["montreal", "lasalle", "lachine"], climateTags: ["hivers rigoureux", "humidité du fleuve"], housingHints: "Duplex et triplex de l'entre-deux-guerres, avec gentrification récente." },
  { slug: "lachine", name: "Lachine", region: "Grand Montréal", province: "Québec", nearbyCities: ["montreal", "dorval", "lasalle", "verdun"], climateTags: ["hivers rigoureux", "humidité du fleuve"], housingHints: "Ancien quartier industriel avec résidences patrimoniales et condos modernes." },
  { slug: "dorval", name: "Dorval", region: "Grand Montréal", province: "Québec", nearbyCities: ["lachine", "pointe-claire", "saint-laurent", "montreal"], climateTags: ["hivers rigoureux", "vents du lac"], housingHints: "Banlieue résidentielle établie avec maisons des années 1950–1970." },
  { slug: "pointe-claire", name: "Pointe-Claire", region: "Grand Montréal", province: "Québec", nearbyCities: ["dorval", "kirkland", "beaconsfield", "saint-laurent"], climateTags: ["hivers rigoureux", "vents du lac"], housingHints: "Banlieue anglophone avec maisons unifamiliales de moyenne à haute gamme." },
  // ─── Rive-Sud ───
  { slug: "saint-hubert", name: "Saint-Hubert", region: "Rive-Sud", province: "Québec", nearbyCities: ["longueuil", "brossard", "saint-bruno"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Quartiers résidentiels des années 1970–1990 avec développements plus récents." },
  { slug: "boucherville", name: "Boucherville", region: "Rive-Sud", province: "Québec", nearbyCities: ["longueuil", "saint-hubert", "varennes"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Banlieue résidentielle prisée avec maisons haut de gamme et patrimoine historique." },
  { slug: "saint-bruno", name: "Saint-Bruno-de-Montarville", region: "Rive-Sud", province: "Québec", nearbyCities: ["saint-hubert", "boucherville", "beloeil"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Banlieue familiale huppée au pied du mont Saint-Bruno." },
  { slug: "la-prairie", name: "La Prairie", region: "Rive-Sud", province: "Québec", nearbyCities: ["brossard", "candiac", "saint-philippe"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Mélange de quartier patrimonial et développements résidentiels récents." },
  { slug: "chambly", name: "Chambly", region: "Rive-Sud", province: "Québec", nearbyCities: ["carignan", "saint-hubert", "richelieu"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Ville historique en croissance avec forte proportion de maisons unifamiliales." },
  { slug: "candiac", name: "Candiac", region: "Rive-Sud", province: "Québec", nearbyCities: ["la-prairie", "brossard", "saint-constant"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Développement résidentiel planifié des années 1960 avec nouveaux projets." },
  // ─── Rive-Nord ───
  { slug: "mascouche", name: "Mascouche", region: "Lanaudière", province: "Québec", nearbyCities: ["terrebonne", "repentigny", "lachenaie"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Banlieue en forte croissance avec constructions neuves et quartiers des années 1990." },
  { slug: "repentigny", name: "Repentigny", region: "Lanaudière", province: "Québec", nearbyCities: ["terrebonne", "charlemagne", "lassomption"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Ville riveraine avec bungalows, cottages et développements récents." },
  { slug: "blainville", name: "Blainville", region: "Laurentides", province: "Québec", nearbyCities: ["rosemere", "boisbriand", "sainte-therese", "mirabel"], climateTags: ["hivers rigoureux", "neige abondante"], housingHints: "Banlieue familiale en croissance avec maisons récentes." },
  { slug: "rosemere", name: "Rosemère", region: "Laurentides", province: "Québec", nearbyCities: ["blainville", "boisbriand", "laval", "sainte-therese"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Banlieue résidentielle établie avec maisons de moyenne à haute gamme." },
  { slug: "boisbriand", name: "Boisbriand", region: "Laurentides", province: "Québec", nearbyCities: ["blainville", "rosemere", "laval", "sainte-therese"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Quartiers résidentiels des années 1980 et développements récents." },
  { slug: "sainte-therese", name: "Sainte-Thérèse", region: "Laurentides", province: "Québec", nearbyCities: ["blainville", "boisbriand", "rosemere", "laval"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Ville établie avec centre-ville patrimonial et banlieue résidentielle." },
  { slug: "saint-eustache", name: "Saint-Eustache", region: "Laurentides", province: "Québec", nearbyCities: ["laval", "deux-montagnes", "mirabel"], climateTags: ["hivers rigoureux", "vents du lac"], housingHints: "Banlieue populaire avec maisons des années 1970–2000." },
  { slug: "mirabel", name: "Mirabel", region: "Laurentides", province: "Québec", nearbyCities: ["blainville", "saint-eustache", "saint-jerome"], climateTags: ["hivers froids", "neige abondante"], housingHints: "Territoire vaste avec forte croissance résidentielle et zones agricoles." },
  { slug: "saint-jerome", name: "Saint-Jérôme", region: "Laurentides", province: "Québec", nearbyCities: ["mirabel", "prevost", "sainte-adele"], climateTags: ["hivers froids", "neige abondante"], housingHints: "Porte des Laurentides avec résidences principales et chalets." },
  // ─── Capitale-Nationale ───
  { slug: "quebec", name: "Québec", region: "Capitale-Nationale", province: "Québec", nearbyCities: ["levis", "beauport", "charlesbourg", "sainte-foy"], climateTags: ["hivers très froids", "neige abondante", "vents du fleuve"], housingHints: "Patrimoine bâti ancien dans le Vieux-Québec, banlieues résidentielles en périphérie." },
  { slug: "levis", name: "Lévis", region: "Chaudière-Appalaches", province: "Québec", nearbyCities: ["quebec", "saint-nicolas", "saint-romuald"], climateTags: ["hivers très froids", "vents du fleuve"], housingHints: "Banlieue résidentielle avec forte croissance de constructions neuves." },
  { slug: "beauport", name: "Beauport", region: "Capitale-Nationale", province: "Québec", nearbyCities: ["quebec", "charlesbourg", "boischatel"], climateTags: ["hivers très froids", "neige abondante"], housingHints: "Arrondissement résidentiel avec maisons des années 1960–2000." },
  { slug: "charlesbourg", name: "Charlesbourg", region: "Capitale-Nationale", province: "Québec", nearbyCities: ["quebec", "beauport", "lac-beauport"], climateTags: ["hivers très froids", "neige abondante"], housingHints: "Banlieue résidentielle avec quartiers variés des années 1960 à aujourd'hui." },
  { slug: "sainte-foy", name: "Sainte-Foy", region: "Capitale-Nationale", province: "Québec", nearbyCities: ["quebec", "cap-rouge", "sillery"], climateTags: ["hivers très froids", "neige abondante"], housingHints: "Quartier universitaire et résidentiel avec maisons de qualité." },
  // ─── Outaouais ───
  { slug: "gatineau", name: "Gatineau", region: "Outaouais", province: "Québec", nearbyCities: ["aylmer", "hull", "buckingham", "masson-angers"], climateTags: ["hivers froids", "cycles gel-dégel"], housingHints: "Maisons unifamiliales et développements récents en périphérie." },
  { slug: "aylmer", name: "Aylmer", region: "Outaouais", province: "Québec", nearbyCities: ["gatineau", "hull"], climateTags: ["hivers froids", "cycles gel-dégel"], housingHints: "Secteur résidentiel prisé de Gatineau avec maisons familiales." },
  { slug: "hull", name: "Hull", region: "Outaouais", province: "Québec", nearbyCities: ["gatineau", "aylmer"], climateTags: ["hivers froids", "cycles gel-dégel"], housingHints: "Centre urbain de Gatineau avec immeubles à logements et maisons anciennes." },
  // ─── Estrie ───
  { slug: "sherbrooke", name: "Sherbrooke", region: "Estrie", province: "Québec", nearbyCities: ["magog", "lennoxville", "fleurimont", "rock-forest"], climateTags: ["hivers froids", "neige abondante"], housingHints: "Résidences de taille moyenne, quartiers universitaires et banlieues familiales." },
  { slug: "magog", name: "Magog", region: "Estrie", province: "Québec", nearbyCities: ["sherbrooke", "orford"], climateTags: ["hivers froids", "neige abondante"], housingHints: "Ville touristique avec chalets, maisons de villégiature et résidences permanentes." },
  // ─── Mauricie ───
  { slug: "trois-rivieres", name: "Trois-Rivières", region: "Mauricie", province: "Québec", nearbyCities: ["becancour", "shawinigan", "cap-de-la-madeleine"], climateTags: ["hivers froids", "humidité du fleuve"], housingHints: "Parc résidentiel vieillissant avec beaucoup de maisons d'avant 1980." },
  { slug: "shawinigan", name: "Shawinigan", region: "Mauricie", province: "Québec", nearbyCities: ["trois-rivieres", "grand-mere"], climateTags: ["hivers froids", "neige abondante"], housingHints: "Ville industrielle avec parc résidentiel ancien nécessitant rénovations." },
  // ─── Saguenay ───
  { slug: "saguenay", name: "Saguenay", region: "Saguenay–Lac-Saint-Jean", province: "Québec", nearbyCities: ["chicoutimi", "jonquiere", "alma"], climateTags: ["hivers très froids", "neige très abondante"], housingHints: "Résidences adaptées au grand froid avec isolation renforcée." },
  { slug: "chicoutimi", name: "Chicoutimi", region: "Saguenay–Lac-Saint-Jean", province: "Québec", nearbyCities: ["saguenay", "jonquiere"], climateTags: ["hivers très froids", "neige très abondante"], housingHints: "Centre urbain du Saguenay avec maisons anciennes et quartiers établis." },
  // ─── Bas-Saint-Laurent ───
  { slug: "rimouski", name: "Rimouski", region: "Bas-Saint-Laurent", province: "Québec", nearbyCities: ["riviere-du-loup", "matane"], climateTags: ["hivers froids", "vents maritimes", "neige abondante"], housingHints: "Ville universitaire avec résidences variées et parc ancien." },
  { slug: "riviere-du-loup", name: "Rivière-du-Loup", region: "Bas-Saint-Laurent", province: "Québec", nearbyCities: ["rimouski", "temiscouata"], climateTags: ["hivers froids", "vents du fleuve"], housingHints: "Ville régionale avec résidences patrimoniales et développements modernes." },
  // ─── Montérégie ───
  { slug: "saint-jean-sur-richelieu", name: "Saint-Jean-sur-Richelieu", region: "Montérégie", province: "Québec", nearbyCities: ["chambly", "iberville", "la-prairie"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Ville historique avec forte proportion de maisons unifamiliales." },
  { slug: "saint-hyacinthe", name: "Saint-Hyacinthe", region: "Montérégie", province: "Québec", nearbyCities: ["beloeil", "mont-saint-hilaire"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Ville agricole et industrielle avec résidences de taille moyenne." },
  { slug: "granby", name: "Granby", region: "Montérégie", province: "Québec", nearbyCities: ["bromont", "waterloo", "saint-hyacinthe"], climateTags: ["hivers rigoureux", "neige abondante"], housingHints: "Ville en croissance avec mélange de résidences anciennes et neuves." },
  { slug: "beloeil", name: "Beloeil", region: "Montérégie", province: "Québec", nearbyCities: ["saint-bruno", "mont-saint-hilaire", "chambly"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Banlieue résidentielle prisée au pied du mont Saint-Hilaire." },
  { slug: "chateauguay", name: "Châteauguay", region: "Montérégie", province: "Québec", nearbyCities: ["mercier", "beauharnois", "montreal"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Banlieue populaire avec maisons des années 1960–1990." },
  { slug: "vaudreuil-dorion", name: "Vaudreuil-Dorion", region: "Montérégie", province: "Québec", nearbyCities: ["ile-perrot", "pincourt", "hudson"], climateTags: ["hivers rigoureux", "vents du lac"], housingHints: "Banlieue en forte croissance à l'ouest de Montréal." },
  // ─── Lanaudière / Laurentides ───
  { slug: "joliette", name: "Joliette", region: "Lanaudière", province: "Québec", nearbyCities: ["repentigny", "rawdon"], climateTags: ["hivers rigoureux", "gel-dégel"], housingHints: "Centre régional avec résidences variées et parc vieillissant." },
  { slug: "mont-tremblant", name: "Mont-Tremblant", region: "Laurentides", province: "Québec", nearbyCities: ["saint-jovite", "sainte-agathe"], climateTags: ["hivers très froids", "neige très abondante"], housingHints: "Station touristique avec chalets, condos et résidences de villégiature." },
  { slug: "sainte-agathe", name: "Sainte-Agathe-des-Monts", region: "Laurentides", province: "Québec", nearbyCities: ["saint-jerome", "mont-tremblant"], climateTags: ["hivers très froids", "neige très abondante"], housingHints: "Ville de villégiature avec chalets et résidences en montagne." },
  // ─── Centre-du-Québec ───
  { slug: "drummondville", name: "Drummondville", region: "Centre-du-Québec", province: "Québec", nearbyCities: ["victoriaville", "saint-hyacinthe"], climateTags: ["hivers froids", "gel-dégel"], housingHints: "Ville industrielle en croissance avec résidences abordables." },
  { slug: "victoriaville", name: "Victoriaville", region: "Centre-du-Québec", province: "Québec", nearbyCities: ["drummondville", "thetford-mines"], climateTags: ["hivers froids", "neige abondante"], housingHints: "Centre régional avec résidences de taille moyenne." },
];

export const getCityBySlug = (slug: string): SeoCity | undefined =>
  SEO_CITIES.find((c) => c.slug === slug);

export const getNearbyCityObjects = (city: SeoCity): SeoCity[] =>
  city.nearbyCities
    .map((s) => getCityBySlug(s))
    .filter((c): c is SeoCity => !!c);

/** Total possible SEO page count */
export const getSeoPageCount = (): number => {
  // Import dynamically to avoid circular deps - approximate
  return SEO_CITIES.length * 40; // ~services + problems count
};
