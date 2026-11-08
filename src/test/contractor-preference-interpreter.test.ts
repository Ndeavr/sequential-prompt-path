import { describe, expect, it } from "vitest";
import { interpretContractorPreferences as interpret, mergePreferences, territoryRuleLabel } from "@/lib/contractorPreferenceInterpreter";
import { applyIntakeAnswer } from "@/services/clara/claraFormIntake";
import { hasTerritories, hasWork, splitList, toQuoteContext } from "@/lib/contractorIntakeQualification";

describe("préférences dans vos mots (FR/EN, dictée sans virgules)", () => {
  it("phrase synthétique isolation : offerts / refusés / territoire séparés", () => {
    const r = interpret("Je fais surtout les entretoits et la ventilation pas de murs ni de sous-sols dans un rayon de 40 km autour de Lorraine");
    expect(r.offered).toEqual(["entretoits", "ventilation"]);
    expect(r.refused).toEqual(["murs", "sous-sols"]);
    expect(r.rules).toHaveLength(1);
    expect(r.rules[0]).toMatchObject({ kind: "radius", include: true, place: "Lorraine", province: "QC", radius_km: 40, radius_unit: "km", status: "declared", confirmed: false, geocode_status: "pending" });
    expect(r.rules[0].raw).toContain("40 km autour de Lorraine");
    expect(r.clarifications).toEqual([]);
  });
  it("« 40km autour de ville Lorraine » = centre Lorraine, rayon géographique de 40 km", () => {
    const r = interpret("40km autour de ville Lorraine");
    expect(r.rules[0]).toMatchObject({ kind: "radius", place: "Lorraine", radius_km: 40 });
    expect(territoryRuleLabel(r.rules[0])).toBe("Rayon de 40 km autour de Lorraine (Québec)");
  });
  it("anglais : no / or / within", () => {
    const r = interpret("I mostly do attics and ventilation, no walls or basements, within 40 km of Lorraine");
    expect(r.offered).toEqual(["attics", "ventilation"]);
    expect(r.refused).toEqual(["walls", "basements"]);
    expect(r.rules[0]).toMatchObject({ kind: "radius", place: "Lorraine", radius_km: 40 });
  });
  it("exclusion de secteur prioritaire et localités nommées", () => {
    const r = interpret("Je fais les entretoits je ne fais pas de murs à Laval et Terrebonne sauf Montréal");
    expect(r.offered).toEqual(["entretoits"]);
    expect(r.refused).toEqual(["murs"]);
    expect(r.rules.map((x) => [x.place, x.include])).toEqual([["Montréal", false], ["Laval", true], ["Terrebonne", true]]);
  });
  it("ambiguïtés bloquantes : unité ou centre manquant → une clarification, aucune règle inventée", () => {
    expect(interpret("rayon de 40 autour de Lorraine").clarifications.map((c) => c.kind)).toEqual(["radius_unit"]);
    const noCenter = interpret("dans un rayon de 30 km");
    expect(noCenter.rules).toEqual([]);
    expect(noCenter.clarifications.map((c) => c.kind)).toEqual(["radius_center"]);
  });
  it("temps de route distinct d'un rayon, jamais converti en km", () => {
    const r = interpret("30 minutes de route de Blainville");
    expect(r.rules[0]).toMatchObject({ kind: "travel_time", travel_minutes: 30, place: "Blainville" });
    expect(r.rules[0].radius_km).toBeUndefined();
  });
  it("« aucune exclusion » explicite ≠ sans réponse", () => {
    expect(interpret("isolation des entretoits aucune exclusion").noRefused).toBe(true);
    expect(interpret("isolation des entretoits").noRefused).toBe(false);
  });
  it("correction ultérieure : la dernière déclaration l'emporte, refusé jamais offert", () => {
    const first = interpret("je fais les entretoits et les murs");
    const merged = mergePreferences(first, interpret("en fait pas de murs"));
    expect(merged.offered).toEqual(["entretoits"]);
    expect(merged.refused).toEqual(["murs"]);
    const back = mergePreferences(merged, interpret("je fais aussi les murs"));
    expect(back.refused).toEqual([]);
    expect(back.offered).toContain("murs");
  });
});

describe("intégration au formulaire canonique (Clara + devis)", () => {
  it("réponse unique remplit travaux, exclusions et règle de territoire; rien d'autre n'est ajouté", () => {
    const { draft, changed } = applyIntakeAnswer({ qualification: {} }, "preferred_work", "Je fais surtout les entretoits et la ventilation pas de murs ni de sous-sols dans un rayon de 40 km autour de Lorraine");
    const q = draft.qualification;
    expect(splitList(q.preferred_work)).toEqual(["entretoits", "ventilation"]);
    expect(splitList(q.excluded_work)).toEqual(["murs", "sous-sols"]);
    expect(q.service_areas).toBe("Rayon de 40 km autour de Lorraine (Québec)");
    expect(q.territory_rules).toHaveLength(1);
    expect(changed).toEqual(expect.arrayContaining(["preferred_work", "excluded_work", "service_areas"]));
    expect(hasWork(q) && hasTerritories(q)).toBe(true);
    const ctx = toQuoteContext(q, { min: 10, max: 10 });
    expect(ctx.territory_rules[0]).toMatchObject({ place: "Lorraine", radius_km: 40 });
    expect(ctx.excluded_work_status).toBe("declared");
    expect(ctx.excluded_areas_status).toBe("unanswered");
  });
  it("territoires nus sans préposition restent des localités déclarées", () => {
    const { draft } = applyIntakeAnswer({ qualification: {} }, "service_areas", "Laval et Longueuil");
    expect(draft.qualification.service_areas).toBe("Laval, Longueuil");
  });
});
