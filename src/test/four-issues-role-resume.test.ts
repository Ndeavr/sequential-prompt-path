import { beforeEach, describe, expect, it } from "vitest";
import { getClaraSessionToken } from "@/services/clara/claraSession";
import { hasActiveContractorFlow, hasExplicitHomeownerFlow, pauseActiveContractorFlow, rememberActiveContractorFlow } from "@/services/clara/claraContractorResume";
import { getRbqDashboardState } from "@/lib/compliance/rbqDeclaration";
import { readFileSync } from "node:fs";

const claraBox = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
beforeEach(() => { localStorage.clear();sessionStorage.clear(); });
describe("changement explicite et droits RBQ", () => {
  it("entrepreneur vers maison survit à la reprise sans effacer les données", () => {
    const token=getClaraSessionToken();
    rememberActiveContractorFlow(true);
    sessionStorage.setItem("unpro_clara_contractor_flow",JSON.stringify({active:true,session_token:token,priority:"visibility"}));
    pauseActiveContractorFlow();
    expect(hasActiveContractorFlow()).toBe(false);
    expect(hasExplicitHomeownerFlow()).toBe(true);
    rememberActiveContractorFlow(false);
    expect(hasExplicitHomeownerFlow()).toBe(true);
    expect(getClaraSessionToken()).toBe(token);
    expect(JSON.parse(sessionStorage.getItem("unpro_clara_contractor_flow") || "{}").priority).toBe("visibility");
    rememberActiveContractorFlow(true);
    expect(hasExplicitHomeownerFlow()).toBe(false);
    expect(hasActiveContractorFlow()).toBe(true);
  });
  it("gazon ne demande pas de licence et ne devient jamais vérifié", () => {
    const state=getRbqDashboardState({specialty:"Entretien de gazon"});
    expect(state.kind).toBe("not_required_inferred");
    expect(state.marker).toBe("INFERRED");
    expect(state.regulatedEligible).toBe(false);
  });
  it("travaux mixtes avec gaz restent bloqués sans licence", () => {
    const state=getRbqDashboardState({specialty:"Entretien de gazon et gaz naturel"});
    expect(state.kind).toBe("needs_rbq");expect(state.regulatedEligible).toBe(false);
  });
  it("le bouton propriétaire applique la transition directement et bloque une reprise tardive", () => {
    expect(claraBox).toContain("onClick={() => {\n                    // Changement volontaire et confirmé : le parcours entrepreneur est suspendu (jamais effacé).\n                    switchToHomeowner();");
    expect(claraBox).toContain("audienceEpochRef.current === 0 && (forcedContractor || hasActiveContractorFlow())");
    expect(claraBox).toContain('contractorFlow && audience === "contractor"');
  });
});
