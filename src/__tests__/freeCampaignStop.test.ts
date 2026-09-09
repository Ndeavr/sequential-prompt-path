/**
 * Arrêt automatique de la campagne « 12 mois gratuits ».
 * Règle : 10 activations réelles = arrêt. Compteur illisible = arrêt (fail-closed).
 */
import { describe, it, expect } from "vitest";
import {
  FREE_CAMPAIGN_TARGET,
  shouldStopFreeCampaign,
} from "../../supabase/functions/_shared/freeCampaign.ts";

describe("free campaign stop", () => {
  it("cible = 10", () => {
    expect(FREE_CAMPAIGN_TARGET).toBe(10);
  });

  it("continue sous la cible", () => {
    expect(shouldStopFreeCampaign(0)).toBe(false);
    expect(shouldStopFreeCampaign(9)).toBe(false);
  });

  it("arrête à la cible et au-delà", () => {
    expect(shouldStopFreeCampaign(10)).toBe(true);
    expect(shouldStopFreeCampaign(14)).toBe(true);
  });

  it("fail-closed si le compteur est illisible", () => {
    expect(shouldStopFreeCampaign(null)).toBe(true);
    expect(shouldStopFreeCampaign(undefined)).toBe(true);
    expect(shouldStopFreeCampaign(Number.NaN)).toBe(true);
  });
});
