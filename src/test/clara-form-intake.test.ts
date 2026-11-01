import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/services/clara/claraQualificationPersistence", () => ({
  persistClaraQualification: vi.fn(async () => undefined),
  loadClaraQualification: vi.fn(async () => null),
}));
import {
  answerIntake, applyIntakeAnswer, buildIntakeGreeting, mergeIntakeDraft, nextIntakeField, shareIntakeDraftWithClara,
  type FormIntakeContext, type IntakeDraft,
} from "@/services/clara/claraFormIntake";
import { CLARA_QUALIFICATION_UPDATED_EVENT, getClaraQualification } from "@/services/clara/claraContractorQualification";

function ctx(initial: IntakeDraft, extra: Partial<FormIntakeContext> = {}) {
  let draft = initial;
  const applied: string[][] = [];
  const c: FormIntakeContext = {
    getDraft: () => draft,
    apply: (d, changed) => { draft = mergeIntakeDraft(draft, d, changed); applied.push(changed); },
    stepKey: "work",
    ...extra,
  };
  return { c, get draft() { return draft; }, set draft(v) { draft = v; }, applied };
}

beforeEach(() => localStorage.clear());

describe("Clara remplit le devis personnalisé", () => {
  it("contexte connu : prénom réel + entreprise + réponses déjà déclarées, puis une question", () => {
    const t = ctx({ qualification: { service_areas: "Laval" } }, { firstName: "Julie", businessName: "Toitures Nord" });
    const g = buildIntakeGreeting(t.c, "fr");
    expect(g.text.startsWith("Bonjour Julie, je peux vous aider à définir vos besoins.")).toBe(true);
    expect(g.text).toContain("Pour Toitures Nord, j’ai déjà : territoires desservis");
    expect(g.text).toContain("Quels mandats voulez-vous faire en priorité ?");
    expect(g.text.match(/\?/g)?.length).toBe(1);
  });

  it("visite directe : aucun placeholder sans prénom", () => {
    const g = buildIntakeGreeting(ctx({ qualification: {} }).c, "fr");
    expect(g.text.startsWith("Bonjour, je peux vous aider")).toBe(true);
    expect(g.text).not.toMatch(/\[|undefined|null/);
  });

  it("réponse multi-champs : mandats + exclusion + capacité", () => {
    const t = ctx({ qualification: {} });
    answerIntake(t.c, "Toitures et bardeaux, pas de gouttières, 12 rendez-vous par mois", "fr");
    expect(t.draft.qualification.preferred_work).toBe("Toitures, bardeaux");
    expect(t.draft.qualification.excluded_work).toBe("gouttières");
    expect(t.draft.next_month_appointments).toBe(12);
    expect(t.applied[0].sort()).toEqual(["capacity", "excluded_work", "preferred_work"]);
  });

  it("« aucune exclusion » coche explicitement le choix", () => {
    const t = ctx({ qualification: { preferred_work: "Toitures" } });
    const r = answerIntake(t.c, "Aucune exclusion", "fr");
    expect(t.draft.qualification.no_excluded_work).toBe(true);
    expect(nextIntakeField(t.draft, "work")).toBe("service_areas");
    expect(r.text).toContain("Dans quelles villes");
  });

  it("correction orale remplace la valeur déclarée", () => {
    const d: IntakeDraft = { qualification: { service_areas: "Laval" } };
    const { draft, changed } = applyIntakeAnswer(d, "priorities", "Correction : territoires Laval et Longueuil");
    expect(changed).toEqual(["service_areas"]);
    expect(draft.qualification.service_areas).toBe("Laval, Longueuil");
  });

  it("capacité par plage et mapping priorités", () => {
    const t = ctx({ qualification: { preferred_work: "a", no_excluded_work: true, service_areas: "b", no_excluded_areas: true } }, { stepKey: "priorities" });
    answerIntake(t.c, "Remplir mon calendrier", "fr");
    expect(t.draft.qualification.priorities).toEqual(["Remplir mon calendrier"]);
    answerIntake(t.c, "10 à 15", "fr");
    expect(t.draft.capacity_range).toBe("10-15");
  });

  it("résumé puis confirmation par l'entrepreneur, sans soumission", () => {
    const t = ctx({ qualification: { preferred_work: "a", no_excluded_work: true, service_areas: "b", no_excluded_areas: true, priorities: ["Stabiliser mes revenus"] }, capacity_range: "1-9" });
    const s = answerIntake(t.c, "Corriger", "fr");
    expect(s.text).toContain("corriger");
    const ok = answerIntake(t.c, "Confirmer", "fr");
    expect(ok.text).toContain("confirmé par vous");
    expect(getClaraQualification().preferences_confirmed).toBe(true);
  });

  it("saisie faite entre-temps dans le formulaire n'est pas écrasée", () => {
    const t = ctx({ qualification: {} });
    buildIntakeGreeting(t.c, "fr"); // demande preferred_work
    t.draft = { qualification: { preferred_work: "Saisie manuelle" } };
    const r = answerIntake(t.c, "Autre chose", "fr");
    expect(t.draft.qualification.preferred_work).toBe("Saisie manuelle");
    expect(r.text).toContain("je garde votre saisie");
  });

  it("brouillon transmis avant ouverture, non confirmé; pas de boucle (un seul événement)", () => {
    const spy = vi.fn();
    window.addEventListener(CLARA_QUALIFICATION_UPDATED_EVENT, spy);
    shareIntakeDraftWithClara({ qualification: { preferred_work: "Toitures" } });
    window.removeEventListener(CLARA_QUALIFICATION_UPDATED_EVENT, spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(getClaraQualification().preferred_work).toEqual(["Toitures"]);
    expect(getClaraQualification().preferences_confirmed).toBe(false);
  });

  it("anglais", () => {
    expect(buildIntakeGreeting(ctx({ qualification: {} }, { firstName: "Sam" }).c, "en").text).toContain("Hello Sam, I can help you define your needs.");
  });
});
