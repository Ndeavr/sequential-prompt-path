import { describe, it, expect } from "vitest";
import { capabilityState, nextClarification, mayRecommend, recordAnswer, contradictionAction, type Requirement } from "../../supabase/functions/_shared/capabilityClarification";

const reqs: Requirement[] = [
  { key: "work_type", scope: "isolation_toit_plat", question_fr: "Faites-vous l’isolation de toits plats?", question_en: "Do you insulate flat roofs?" },
  { key: "insurance_claim_jobs", scope: "isolation", question_fr: "Acceptez-vous les travaux dans le cadre d’un dossier d’assurance?", question_en: "Do you accept insurance-claim jobs?" },
];
const ok = { registered: true, eligible_server: true };

describe("Clarification des capacités", () => {
  it("inconnu → une seule question, sans recommandation", () => {
    const q = nextClarification(reqs, [], [], "c1");
    expect(q?.question_fr).toBe("Faites-vous l’isolation de toits plats?");
    expect(capabilityState(reqs, [], [], "c1")).toBe("unknown");
    expect(mayRecommend("unknown", ok)).toBe(false);
  });
  it("non-réponse = en attente, pas de doublon", () => {
    const asks = [{ company_id: "c1", key: "work_type" as const, scope: "isolation_toit_plat", asked_at: "2026-11-02" }];
    expect(capabilityState(reqs, [], asks, "c1")).toBe("pending");
    expect(nextClarification(reqs, [], asks, "c1")).toBeNull();
  });
  it("oui → question suivante, puis compatible déclaré", () => {
    const a1 = [recordAnswer("work_type", "isolation_toit_plat", "yes", "msg1", "2026-11-02")];
    expect(a1[0].status).toBe("declared");
    expect(nextClarification(reqs, a1, [], "c1")?.key).toBe("insurance_claim_jobs");
    const a2 = [...a1, recordAnswer("insurance_claim_jobs", "isolation", "yes", "msg2", "2026-11-02")];
    expect(capabilityState(reqs, a2, [], "c1")).toBe("compatible_declared");
    expect(mayRecommend("compatible_declared", { registered: false, eligible_server: true })).toBe(false);
    expect(mayRecommend("compatible_declared", ok)).toBe(true);
  });
  it("exclusion connue (ISR ne fait pas toits plats) : aucune sollicitation", () => {
    const a = [recordAnswer("work_type", "isolation_toit_plat", "no", "profil", "2026-11-01")];
    expect(nextClarification(reqs, a, [], "isr")).toBeNull();
    expect(capabilityState(reqs, a, [], "isr")).toBe("excluded_for_need");
    expect(capabilityState([{ ...reqs[0], scope: "isolation_entretoit" }], a, [], "isr")).toBe("unknown");
  });
  it("aucune donnée cliente dans la question", () => {
    const s = JSON.stringify(nextClarification(reqs, [], [], "c1"));
    expect(s).not.toMatch(/@|\d{3}[- ]?\d{3}[- ]?\d{4}|rue|adresse/i);
  });
  it("contradiction → clarification, revue humaine si potentiel élevé", () => {
    const a = [recordAnswer("work_type", "x", "yes", "m1", "1"), recordAnswer("work_type", "x", "no", "m2", "2")];
    expect(contradictionAction(a, false)).toBe("clarify");
    expect(contradictionAction(a, true)).toBe("human_review");
  });
});
