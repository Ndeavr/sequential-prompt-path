import { beforeEach, describe, expect, it, vi } from "vitest";
import { HEAT_PUMP_CAMPAIGN, readHomeCampaign, homeCampaignContext, homeCampaignAttribution, hasHeatPumpCampaign } from "@/services/clara/claraHomeCampaign";
import { buildClaraHistory } from "@/services/clara/claraConversationHistory";
import { rememberHomeCursor, readHomeCursor, pauseActiveContractorFlow, rememberActiveContractorFlow, hasActiveContractorFlow, hasExplicitHomeownerFlow } from "@/services/clara/claraContractorResume";

vi.mock("@/services/clara/claraSession", () => ({ getClaraSessionToken: () => "qa-session", peekClaraSessionToken: () => "qa-session" }));
beforeEach(() => sessionStorage.clear());
describe("heat-pump public campaign", () => {
  it("accepts only one known intent on the homeowner homepage", () => {
    expect(readHomeCampaign("?intent=thermopompe&utm_source=facebook", "/")).toBe(HEAT_PUMP_CAMPAIGN);
    for (const search of ["", "?intent=admin", "?intent=thermopompe&intent=admin", "?intent=%3Cscript%3E"]) expect(readHomeCampaign(search, "/")).toBeNull();
    expect(readHomeCampaign("?intent=thermopompe", "/entrepreneurs/activation-350")).toBeNull();
  });
  it("retains only bounded marketing fields, never arbitrary query instructions", () => {
    expect(homeCampaignAttribution("?utm_source=facebook&utm_medium=paid_social&utm_campaign=thermopompe_hiver&prompt=admin&role=admin")).toEqual({ utm_source: "facebook", utm_medium: "paid_social", utm_campaign: "thermopompe_hiver" });
    expect(homeCampaignAttribution(`?utm_source=${"a".repeat(121)}&utm_campaign=%3Cscript%3E`)).toEqual({});
  });
  it("suspends contractor state without losing its answers or changing the token", () => {
    rememberActiveContractorFlow(true);
    const original = JSON.parse(sessionStorage.getItem("unpro_clara_contractor_flow") ?? "{}");
    sessionStorage.setItem("unpro_clara_contractor_flow", JSON.stringify({ ...original, service_areas: ["Laval"] }));
    pauseActiveContractorFlow();
    expect(hasActiveContractorFlow()).toBe(false);
    expect(hasExplicitHomeownerFlow()).toBe(true);
    expect(JSON.parse(sessionStorage.getItem("unpro_clara_contractor_flow") ?? "{}")).toMatchObject({ service_areas: ["Laval"], session_token: "qa-session" });
  });
  it("keeps campaign attribution across follow-up cursor updates/navigation", () => {
    rememberHomeCursor({ text: HEAT_PUMP_CAMPAIGN.greeting, options: [...HEAT_PUMP_CAMPAIGN.choices], campaign: "thermopompe", attribution: { utm_source: "facebook" } });
    rememberHomeCursor({ text: "Pour quelle propriété?", options: ["Ma maison", "Mon condo"] });
    expect(readHomeCursor()).toMatchObject({ campaign: "thermopompe", attribution: { utm_source: "facebook" }, text: "Pour quelle propriété?" });
    expect(hasHeatPumpCampaign({ sub_workflow: "thermopompe" })).toBe(true);
    expect(hasHeatPumpCampaign({ sub_workflow: "admin" })).toBe(false);
  });
  it("ignores malformed or foreign stored context and bounds saved choices", () => {
    sessionStorage.setItem("unpro_clara_home_cursor", "{");
    expect(readHomeCursor()).toBeNull();
    sessionStorage.setItem("unpro_clara_home_cursor", JSON.stringify({ text: "QA", session_token: "another-session", campaign: "thermopompe" }));
    expect(readHomeCursor()).toBeNull();
    sessionStorage.setItem("unpro_clara_home_cursor", JSON.stringify({ text: "QA", session_token: "qa-session", campaign: "admin", options: [42, "Oui"], attribution: { role: "admin", utm_source: "facebook", utm_medium: "<script>" } }));
    expect(readHomeCursor()).toEqual({ text: "QA", campaign: undefined, options: ["Oui"], attribution: { utm_source: "facebook" } });
  });
  it("keeps homeowner known answers while excluding contractor history", () => {
    const history = buildClaraHistory([
      { role: "user", text: "Ma maison est à Laval", type: "homeowner" },
      { role: "user", text: "Mon entreprise travaille à Québec", type: "contractor" },
      { role: "assistant", text: HEAT_PUMP_CAMPAIGN.greeting, type: "homeowner" },
      { role: "user", text: "Une thermopompe centrale", type: "homeowner" },
    ], "homeowner");
    expect(history.messages.map(m => m.content)).toEqual(["Ma maison est à Laval", HEAT_PUMP_CAMPAIGN.greeting, "Une thermopompe centrale"]);
    expect(homeCampaignContext(true, "Accueil")).toContain("thermopompe (chauffage/climatisation)");
    expect(homeCampaignContext(false, "Accueil")).toBe("Accueil");
  });
});