import { describe, expect, it } from "vitest";
import { buildClaraHistory } from "@/services/clara/claraConversationHistory";

describe("P0 — historique propriétaire borné", () => {
  it("rattache « environ deux semaines » à la fuite, après un aller-retour entrepreneur", () => {
    const result = buildClaraHistory([
      { role: "user", text: "Mon sous-sol fuit", audience: "homeowner" },
      { role: "assistant", text: "Depuis quand voyez-vous cette fuite ?", audience: "homeowner" },
      { role: "user", text: "Mon entreprise privée QA", audience: "contractor" },
      { role: "user", text: "environ deux semaines", audience: "homeowner" },
    ], "homeowner");
    expect(result.messages.map(t => t.content)).toEqual(["Mon sous-sol fuit", "Depuis quand voyez-vous cette fuite ?", "environ deux semaines"]);
  });
  it("le canal entrepreneur ne reçoit aucune donnée maison", () => {
    expect(buildClaraHistory([
      { role: "user", text: "Adresse privée de ma maison", type: "homeowner" },
      { role: "user", text: "Entretien de gazon", type: "contractor" },
    ], "contractor").messages).toEqual([{ role: "user", content: "Entretien de gazon" }]);
  });
  it("conserve le premier problème dans un résumé extractif après 20 tours", () => {
    const result = buildClaraHistory(Array.from({ length: 25 }, (_, i) => ({ role: "user" as const, text: i === 0 ? "Fuite sous-sol depuis lundi" : `Tour ${i}`, type: "homeowner" })), "homeowner");
    expect(result.messages).toHaveLength(20);
    expect(result.summary).toContain("Déclaré : Fuite sous-sol depuis lundi");
  });
});