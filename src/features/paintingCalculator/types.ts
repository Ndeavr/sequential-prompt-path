import type { CalculatorInput, CalculatorResult, CityPricing } from "./engine";

export interface PaintingPhoto {
  id?: string;
  url: string;
  storagePath?: string;
  aiNotes?: {
    detectedCondition?: string;
    estimatedSurfaceSqft?: number;
    surfaceType?: string;
    repairsNeeded?: string;
    summary?: string;
  };
  analyzing?: boolean;
}

export interface CalculatorSessionData {
  input: Partial<CalculatorInput>;
  photos: PaintingPhoto[];
  city: CityPricing | null;
  result: CalculatorResult | null;
  address?: { line: string; postalCode: string; city: string };
  step: number;
}

export interface PainterMatch {
  id: string;
  name: string;
  city: string;
  rating: number;
  reviewCount: number;
  badges: string[];
  specialties: string[];
  description: string;
  nextAvailability: string;
  pricingStyle: string;
}
