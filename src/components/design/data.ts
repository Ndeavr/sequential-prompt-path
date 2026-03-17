/**
 * UNPRO Design — Constants, types, and mock data
 */

export const ROOM_TYPES = [
  { key: "kitchen", label: "Cuisine", icon: "🍳" },
  { key: "bathroom", label: "Salle de bain", icon: "🛁" },
  { key: "living_room", label: "Salon", icon: "🛋️" },
  { key: "bedroom", label: "Chambre", icon: "🛏️" },
  { key: "basement", label: "Sous-sol", icon: "🏠" },
  { key: "facade", label: "Façade", icon: "🏡" },
  { key: "backyard", label: "Cour arrière", icon: "🌿" },
  { key: "deck", label: "Terrasse", icon: "🪵" },
] as const;

export const EDITABLE_ZONES = [
  "walls", "cabinets", "floor", "countertop", "backsplash",
  "island", "sink", "faucet", "appliances", "lighting",
  "trim", "windows", "decor",
] as const;

export const ZONE_LABELS: Record<string, string> = {
  walls: "Murs", cabinets: "Armoires", floor: "Plancher",
  countertop: "Comptoir", backsplash: "Dosseret", island: "Îlot",
  sink: "Évier", faucet: "Robinetterie", appliances: "Électroménagers",
  lighting: "Éclairage", trim: "Moulures", windows: "Fenêtres", decor: "Décor",
  // Bathroom
  shower: "Douche", bathtub: "Baignoire", vanity: "Vanité", mirror: "Miroir", tiles: "Tuiles",
  // Facade
  siding: "Revêtement", roof: "Toiture", door: "Porte", garage_door: "Porte de garage",
  brick: "Brique", stone: "Pierre", gutters: "Gouttières", porch: "Porche", landscaping: "Aménagement",
  // Living room
  fireplace: "Foyer", sofa: "Sofa", shelving: "Étagères", curtains: "Rideaux", rug: "Tapis", tv_wall: "Mur TV",
  // Bedroom
  bed: "Lit", closet: "Garde-robe", nightstand: "Table de chevet", headboard: "Tête de lit",
  // Basement
  ceiling: "Plafond", bar: "Bar", stairs: "Escalier", storage: "Rangement",
  // Outdoor
  fence: "Clôture", patio: "Patio", pool: "Piscine", pergola: "Pergola", plants: "Plantes",
  railing: "Rampe", planks: "Planches",
};

/** Room-specific zone lists */
export const ZONES_BY_ROOM: Record<string, string[]> = {
  kitchen: ["walls", "cabinets", "floor", "countertop", "backsplash", "island", "sink", "faucet", "appliances", "lighting", "trim", "windows", "decor"],
  bathroom: ["walls", "floor", "tiles", "shower", "bathtub", "vanity", "sink", "faucet", "mirror", "lighting", "trim", "windows", "decor"],
  living_room: ["walls", "floor", "fireplace", "sofa", "shelving", "curtains", "rug", "tv_wall", "lighting", "trim", "windows", "decor"],
  bedroom: ["walls", "floor", "bed", "headboard", "closet", "nightstand", "curtains", "lighting", "trim", "windows", "decor"],
  basement: ["walls", "floor", "ceiling", "stairs", "bar", "storage", "lighting", "trim", "windows", "decor"],
  facade: ["siding", "brick", "stone", "roof", "windows", "door", "garage_door", "gutters", "porch", "lighting", "landscaping", "trim"],
  backyard: ["fence", "patio", "pool", "pergola", "plants", "landscaping", "lighting", "decor"],
  deck: ["planks", "railing", "pergola", "lighting", "plants", "decor"],
};

export const STYLE_PRESETS = [
  "Modern", "Contemporary", "Farmhouse", "Scandinavian", "Japandi",
  "Luxury", "Minimalist", "Industrial", "Mid-century", "Classic",
  "Coastal", "Rustic", "Warm Organic",
] as const;

export const BUDGET_FILTERS = [
  { key: "under_5k", label: "Moins de 5 000 $", range: [0, 5000] },
  { key: "5k_15k", label: "5 000 – 15 000 $", range: [5000, 15000] },
  { key: "15k_35k", label: "15 000 – 35 000 $", range: [15000, 35000] },
  { key: "premium", label: "Premium", range: [35000, 75000] },
  { key: "luxury", label: "Luxe", range: [75000, 200000] },
] as const;

export const SLIDERS = [
  { key: "brightness", min: "Plus sombre", max: "Plus lumineux" },
  { key: "warmth", min: "Plus froid", max: "Plus chaud" },
  { key: "budget_feel", min: "Abordable", max: "Premium" },
  { key: "intensity", min: "Subtil", max: "Dramatique" },
] as const;

export const MATERIAL_OPTIONS = [
  { key: "marble", label: "Marbre", emoji: "🪨" },
  { key: "wood", label: "Bois naturel", emoji: "🪵" },
  { key: "concrete", label: "Béton", emoji: "🧱" },
  { key: "ceramic", label: "Céramique", emoji: "🏺" },
  { key: "granite", label: "Granit", emoji: "💎" },
  { key: "quartz", label: "Quartz", emoji: "✨" },
  { key: "glass", label: "Verre", emoji: "🪟" },
  { key: "metal", label: "Métal", emoji: "⚙️" },
  { key: "terrazzo", label: "Terrazzo", emoji: "🎨" },
  { key: "brick", label: "Brique", emoji: "🧱" },
] as const;

export const COLOR_PALETTES = [
  { key: "neutral", label: "Neutres", colors: ["#F5F0EB", "#C4B5A4", "#8B7D6B", "#4A4039"] },
  { key: "warm", label: "Chauds", colors: ["#FFF3E0", "#E8A87C", "#D35D6E", "#C06C84"] },
  { key: "cool", label: "Froids", colors: ["#E3F2FD", "#90CAF9", "#5C6BC0", "#283593"] },
  { key: "earth", label: "Terre", colors: ["#EFEBE9", "#A1887F", "#6D4C41", "#3E2723"] },
  { key: "sage", label: "Sauge", colors: ["#E8F5E9", "#A5D6A7", "#66BB6A", "#2E7D32"] },
  { key: "moody", label: "Sombre", colors: ["#263238", "#37474F", "#455A64", "#1B1B2F"] },
] as const;

export interface DesignVersion {
  id: string;
  versionNumber: string;
  imageUrl: string | null;
  promptUsed: string;
  frozen: boolean;
  styleLabel: string | null;
  budgetMode: string | null;
  parentVersionId: string | null;
  createdAt: string;
}

export interface DesignProject {
  id: string;
  title: string;
  roomType: string | null;
  originalImageUrl: string | null;
  visibility: string;
  status: string;
  versions: DesignVersion[];
  createdAt: string;
}

// Mock data for UI development
export const MOCK_VERSIONS: DesignVersion[] = [
  {
    id: "v1",
    versionNumber: "1",
    imageUrl: null,
    promptUsed: "Moderniser la cuisine avec des armoires blanches",
    frozen: false,
    styleLabel: "Modern",
    budgetMode: "5k_15k",
    parentVersionId: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "v1-1",
    versionNumber: "1.1",
    imageUrl: null,
    promptUsed: "Ajouter un dosseret en marbre",
    frozen: true,
    styleLabel: "Modern",
    budgetMode: "15k_35k",
    parentVersionId: "v1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "v2",
    versionNumber: "2",
    imageUrl: null,
    promptUsed: "Style scandinave avec bois naturel",
    frozen: false,
    styleLabel: "Scandinavian",
    budgetMode: "5k_15k",
    parentVersionId: null,
    createdAt: new Date().toISOString(),
  },
];
