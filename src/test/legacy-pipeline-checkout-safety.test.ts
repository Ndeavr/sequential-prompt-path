import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const retired = readFileSync("supabase/functions/activation-create-checkout/index.ts", "utf8");
const founderCta = readFileSync("src/components/founder-plans/SectionFinalCTAFounder.tsx", "utf8");
const quarantinedDispatch = readFileSync("supabase/functions/agent-activation-dispatch/index.ts", "utf8");

describe("legacy pipeline checkout retirement", () => {
  it("refuses any payment request without Stripe, service secrets, DB or queue effects", () => {
    expect(retired).toContain('error: "legacy_pipeline_checkout_retired"');
    expect(retired).toContain('next_path: "/contractor/join"');
    expect(retired).toMatch(/status:\s*410/);
    expect(retired).not.toMatch(/import\s+Stripe\b|new\s+Stripe\(|checkout\.sessions\.create|createClient\(|SUPABASE_SERVICE_ROLE_KEY/);
    expect(retired).not.toMatch(/unit_amount|allow_promotion_codes|price_data|tax_rates/);
  });

  it("routes the legacy founder CTA into identity-first enrollment without fake capacity", () => {
    expect(founderCta).toContain("/contractor/join");
    expect(founderCta).toContain("encodeURIComponent(runId)");
    expect(founderCta).toContain("350 $ CA + taxes applicables");
    expect(founderCta).toContain("Aucun rendez-vous inclus ou garanti");
    expect(founderCta).not.toMatch(/activation-create-checkout|CounterLiveSpots|spots_remaining|Réserver maintenant|territoire de moins/);
  });

  it("leaves automated SMS dispatch quarantined", () => {
    expect(quarantinedDispatch).toContain("return agentQueueEmissionStop()");
    expect(quarantinedDispatch).toContain("assertAgentQueueEmissionStopped()");
  });
});
