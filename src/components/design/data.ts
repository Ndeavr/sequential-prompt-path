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
