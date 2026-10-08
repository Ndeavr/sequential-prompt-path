import { describe, it, expect, beforeEach } from "vitest";
import { pauseActiveContractorFlow, rememberHomeCursor, readHomeCursor } from "@/services/clara/claraContractorResume";
describe("curseurs", () => {
  beforeEach(() => sessionStorage.clear());
  it("suspend sans effacer et garde le curseur maison", () => {
    sessionStorage.setItem("unpro_clara_contractor_flow", JSON.stringify({ active: true, priority: "visibility" }));
    pauseActiveContractorFlow();
    expect(JSON.parse(sessionStorage.getItem("unpro_clara_contractor_flow")!)).toMatchObject({ active: false, priority: "visibility" });
    rememberHomeCursor({ text: "Quel type de toit?", options: ["Toit plat", "Pentu"] });
    expect(readHomeCursor()?.options).toEqual(["Toit plat", "Pentu"]);
  });
});
