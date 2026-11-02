import { describe, it, expect } from "vitest";
import { canStartPriorityRecruitment, missingForRecruitment, recruitmentNeedKey, anonymizedRecruitmentSummary, orderRecruitmentQueue, shouldCreateProFoundAlert, alertKey, type Demand } from "../../supabase/functions/_shared/demandRecruitment";

const base = (o: Partial<Demand>): Demand => ({ id: "d1", owner_id: "u1", needs: "Remplacer le revêtement arrière", address: "12 rue Secrète", postal_code: "H7T 0N6", city: "Laval", confirmed_by_client: true, name: "Julie", email: "julie@x.ca", phone: "5145550000", ...o });

describe("Demande sans entrepreneur — règle générale", () => {
  it("s'applique aux trois univers", () => {
    for (const [universe, service] of [["renovation", "toiture"], ["services", "nettoyage conduits"], ["real_estate", "inspecteur"]] as const)
      expect(canStartPriorityRecruitment(base({ universe, service }))).toBe(true);
  });
  it("incomplète ou suspendue = pas de recherche", () => {
    expect(missingForRecruitment(base({ universe: "services", service: "x", confirmed_by_client: false }))).toContain("confirmation");
    expect(canStartPriorityRecruitment(base({ universe: "services", service: null }))).toBe(false);
    expect(canStartPriorityRecruitment(base({ universe: "renovation", service: "isolation", suspended: true }))).toBe(false);
  });
  it("priorité devant la prospection générique", () => {
    const q = orderRecruitmentQueue([{ source: "generic" as const, created_at: "2026-01-01" }, { source: "client_demand" as const, created_at: "2026-02-01" }]);
    expect(q[0].source).toBe("client_demand");
  });
  it("déduplique par service × territoire sans fusionner les dossiers", () => {
    const a = base({ id: "a", owner_id: "u1", universe: "services", service: "Déneigement" });
    const b = base({ id: "b", owner_id: "u2", universe: "services", service: "deneigement", address: "99 autre rue" });
    expect(recruitmentNeedKey(a)).toBe(recruitmentNeedKey(b));
  });
  it("aucune donnée privée dans le résumé de recrutement", () => {
    const s = JSON.stringify(anonymizedRecruitmentSummary(base({ universe: "renovation", service: "toiture" })));
    for (const p of ["Julie", "julie@x.ca", "5145550000", "12 rue Secrète", "H7T 0N6"]) expect(s).not.toContain(p);
  });
  it("alerte unique seulement après admissibilité serveur", () => {
    const ok = { registered: true, eligible_server: true, licence_verified_or_not_required: true, serves_territory: true, covers_service: true };
    expect(shouldCreateProFoundAlert(ok)).toBe(true);
    expect(shouldCreateProFoundAlert({ ...ok, eligible_server: false })).toBe(false);
    expect(shouldCreateProFoundAlert({ ...ok, registered: false })).toBe(false);
    expect(alertKey("d1", "c1")).toBe(alertKey("d1", "c1"));
  });
});
