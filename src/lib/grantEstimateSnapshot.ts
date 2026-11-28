import { z } from "zod";
import type { GrantInputs } from "./grantCalculator2026";

export const GRANT_ESTIMATE_KEY = "unpro_grant_estimate_v1";

const area = z.number().finite().min(0).max(50_000);
const addedR = z.number().finite().min(0).max(100);

export const grantEstimateSchema = z.object({
  selected: z.array(z.enum(["toit", "murs", "fondations", "fenetres", "thermopompe", "calfeutrage"]))
    .min(1).max(6).refine(works => new Set(works).size === works.length),
  building: z.enum(["maison", "multilogement"]),
  regime: z.enum(["nouveau", "ancien", "incertain"]),
  roofType: z.enum(["grenier", "plat"]),
  roofArea: area,
  roofRAdded: addedR,
  roofRFinal: z.number().finite().min(0).max(150),
  wallsArea: area,
  wallsRAdded: addedR,
  foundationType: z.enum(["murs-sous-sol", "dalle-sous-sol", "murs-vide-sanitaire", "plancher-vide-sanitaire", "plancher-expose"]),
  foundationArea: area,
  foundationRAdded: addedR,
  windowCount: z.number().finite().min(0).max(100),
  windowsMostEfficient: z.boolean(),
}) satisfies z.ZodType<GrantInputs>;
