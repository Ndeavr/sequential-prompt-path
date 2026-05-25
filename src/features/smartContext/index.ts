export * from "./types";
export * from "./goals";
export { SMART_CONTEXT_REGISTRY, getRegistryEntry } from "./registry";
export { useSmartContext, useAskAlex } from "./useSmartContext";
export { useGoalProfile } from "./useGoalProfile";
export {
  getRecommendationsForSurface,
  listSurfaceFields,
  listAllSurfaces,
  type SmartSurface,
  type SurfaceRecommendation,
} from "./recommendationsBySurface";

