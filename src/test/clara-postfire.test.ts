import { describe, it, expect } from "vitest";
import { captureInsulationTurn, nextInsulationQuestion, evaluateInsulationRules, isPostFireSuspended, postFireGuidance } from "../../supabase/functions/_shared/insulationProject";

const fire = captureInsulationTurn({}, "Isolation après incendie de ma maison");
describe("Clara post-fire", () => {
  it("declares post-fire and asks access first", () => {
    expect(fire.insulation_post_fire).toBe("declared");
    expect(nextInsulationQuestion(fire)?.field).toBe("project_context.post_fire_access");
  });
  it("prohibited access suspends server-side", () => {
    const c = captureInsulationTurn(fire, "prohibited", "post_fire_access");
    expect(isPostFireSuspended(c)).toBe(true);
    expect(nextInsulationQuestion(c)).toBeNull();
  });
  it("unknown access suspends too; authorized does not", () => {
    expect(isPostFireSuspended(captureInsulationTurn(fire, "unknown", "post_fire_access"))).toBe(true);
    expect(isPostFireSuspended(captureInsulationTurn(fire, "authorized_declared", "post_fire_access"))).toBe(false);
  });
  it("free text never certifies access", () => {
    expect(captureInsulationTurn(fire, "oui je pense", "post_fire_access").post_fire_access).toBeUndefined();
  });
  it("post-fire never matches, even attic with complete declarations", () => {
    const c = { ...fire, post_fire_access: "authorized_declared", insulation_zone: "attic", post_fire_preparation: "completed_declared" } as const;
    expect(evaluateInsulationRules(c, [{ rule_type: "service", confirmed_by_contractor: true }]).eligible).toBe(false);
  });
  it("walls are not covered by an attic path", () => {
    expect(evaluateInsulationRules({ insulation_zone: "walls" }, []).eligible).toBe(false);
  });
  it("guidance forbids sharing identity during prospecting", () => {
    const g = postFireGuidance(fire);
    expect(g).toContain("même avec consentement");
    expect(g).not.toContain("sans consentement");
  });
});
