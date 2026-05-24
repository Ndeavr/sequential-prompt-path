/**
 * UNPRO — Painting Calculator Engine
 * Transparent ranges, deterministic math. No fake precision.
 */

export type ProjectType =
  | "single_room"
  | "multi_room"
  | "whole_house"
  | "exterior"
  | "stairs_railings"
  | "cabinets_trim"
  | "post_renovation";

export type WallCondition = "excellent" | "good" | "fair" | "poor";
export type PaintQuality = "standard" | "premium" | "designer";
export type Urgency = "flexible" | "this_month" | "this_week" | "asap";

export interface CityPricing {
  city_slug: string;
  city_name: string;
  min_rate_sqft: number;
  max_rate_sqft: number;
  prep_multiplier: number;
  urgency_multiplier: number;
  labour_modifier: number;
  paint_quality_base_cost: number;
}

export interface CalculatorInput {
  projectType: ProjectType;
  roomCount: number;
  avgRoomSqft: number; // floor area per room (used to derive walls)
  ceilingHeightFt: number;
  wallCondition: WallCondition;
  paintQuality: PaintQuality;
  coats: number;
  includesCeilings: boolean;
  includesTrim: boolean;
  includesDoors: boolean;
  darkToLight: boolean;
  occupiedHome: boolean;
  urgency: Urgency;
  // Phase 2 — multi-surface / coating (optional, back-compat)
  category?: import("./projectCatalog").ProjectCategory;
  items?: string[];
  method?: import("./projectCatalog").ApplicationMethod;
  material?: import("./projectCatalog").SurfaceMaterial;
  conditionCodes?: import("./projectCatalog").SurfaceConditionCode[];
  linearFt?: number;
}

export interface CalculatorResult {
  surfaceSqft: number;
  paintGallons: number;
  paintCost: number;
  labourCost: number;
  prepCost: number;
  totalMin: number;
  totalMax: number;
  complexity: "low" | "medium" | "high";
  durationDays: number;
  confidence: "low" | "medium" | "high";
  breakdown: {
    wallArea: number;
    ceilingArea: number;
    trimAdjustment: number;
  };
  recommendedMethod?: import("./projectCatalog").ApplicationMethod;
  difficulty?: "facile" | "moyenne" | "elevee" | "specialisee";
  lifespanYears?: number;
  maintenanceLevel?: "faible" | "moyen" | "eleve";
  resaleRoiPct?: number;
  decisionAdvice?: import("./projectCatalog").DecisionAdvice;
  alexHint?: string;
}

const COVERAGE_SQFT_PER_GALLON = 350;
const QUALITY_MULTIPLIER: Record<PaintQuality, number> = {
  standard: 1.0,
  premium: 1.35,
  designer: 1.85,
};
const CONDITION_PREP_MULT: Record<WallCondition, number> = {
  excellent: 0.05,
  good: 0.15,
  fair: 0.35,
  poor: 0.65,
};
const URGENCY_MULT: Record<Urgency, number> = {
  flexible: 1.0,
  this_month: 1.05,
  this_week: 1.15,
  asap: 1.3,
};
const PROJECT_TYPE_COMPLEXITY: Record<ProjectType, number> = {
  single_room: 0.95,
  multi_room: 1.0,
  whole_house: 1.1,
  exterior: 1.35,
  stairs_railings: 1.25,
  cabinets_trim: 1.4,
  post_renovation: 1.15,
};

export function computeEstimate(
  input: CalculatorInput,
  city: CityPricing,
): CalculatorResult {
  // Derive wall area from floor area: perimeter ≈ 4 × √floorArea, walls = perimeter × ceilingHeight
  const perRoomPerimeter = 4 * Math.sqrt(Math.max(input.avgRoomSqft, 60));
  const wallArea = perRoomPerimeter * input.ceilingHeightFt * input.roomCount;
  const ceilingArea = input.includesCeilings ? input.avgRoomSqft * input.roomCount : 0;
  const trimAdjustment =
    (input.includesTrim ? 80 : 0) * input.roomCount +
    (input.includesDoors ? 40 : 0) * input.roomCount;

  const surface = wallArea + ceilingArea + trimAdjustment;

  // Paint
  const coats = Math.max(1, input.coats) + (input.darkToLight ? 1 : 0);
  const gallons = Math.ceil((surface * coats) / COVERAGE_SQFT_PER_GALLON);
  const paintCost =
    gallons * city.paint_quality_base_cost * QUALITY_MULTIPLIER[input.paintQuality];

  // Labour — midpoint of city rate × surface × labour modifier
  const midRate = (city.min_rate_sqft + city.max_rate_sqft) / 2;
  const labourCost = surface * midRate * city.labour_modifier;

  // Prep
  const prepCost =
    labourCost * CONDITION_PREP_MULT[input.wallCondition] * city.prep_multiplier;

  // Complexity & adjustments
  const complexityMult = PROJECT_TYPE_COMPLEXITY[input.projectType];
  const occupiedMult = input.occupiedHome ? 1.08 : 1.0;
  const urgencyMult = URGENCY_MULT[input.urgency];

  const base = (paintCost + labourCost + prepCost) * complexityMult * occupiedMult * urgencyMult;

  // ±15% range — transparent, not fake precision
  const totalMin = Math.round((base * 0.88) / 25) * 25;
  const totalMax = Math.round((base * 1.18) / 25) * 25;

  const complexity: "low" | "medium" | "high" =
    complexityMult >= 1.25 ? "high" : complexityMult >= 1.05 ? "medium" : "low";

  const durationDays = Math.max(1, Math.ceil(surface / 450) * coats);

  // Confidence drops if photos absent or condition is poor
  const confidence: "low" | "medium" | "high" =
    input.wallCondition === "poor" ? "low" : input.roomCount >= 4 ? "medium" : "high";

  return {
    surfaceSqft: Math.round(surface),
    paintGallons: gallons,
    paintCost: Math.round(paintCost),
    labourCost: Math.round(labourCost),
    prepCost: Math.round(prepCost),
    totalMin,
    totalMax,
    complexity,
    durationDays,
    confidence,
    breakdown: {
      wallArea: Math.round(wallArea),
      ceilingArea: Math.round(ceilingArea),
      trimAdjustment: Math.round(trimAdjustment),
    },
  };
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  single_room: "Pièce intérieure",
  multi_room: "Plusieurs pièces",
  whole_house: "Maison complète",
  exterior: "Extérieur",
  stairs_railings: "Escaliers / rampes",
  cabinets_trim: "Armoires / boiseries",
  post_renovation: "Retouches après rénovation",
};

export const WALL_CONDITION_LABELS: Record<WallCondition, string> = {
  excellent: "Excellent",
  good: "Bon",
  fair: "Moyen",
  poor: "À réparer",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  flexible: "Flexible",
  this_month: "Ce mois-ci",
  this_week: "Cette semaine",
  asap: "Dès que possible",
};

export const PAINT_QUALITY_LABELS: Record<PaintQuality, string> = {
  standard: "Standard",
  premium: "Premium",
  designer: "Designer",
};
