import { describe, it, expect } from "vitest";
import { completionLabel, completionMonthValid, emptyDraft, validateDraft } from "@/lib/portfolio/freePortfolio";
import { photoKindOf, suggestService, withPhotoKind } from "@/lib/portfolio/portfolioFlow";
import { completedCategoriesFrom, quebecSeason, rankProjects, type RankableProject } from "@/lib/portfolio/inspirationRanking";

const NOW = new Date("2026-11-10T15:40:00Z"); // automne au Québec
const proj = (id: string, service: string, city: string, minutesAgo: number, author = id): RankableProject => ({
  id, title: service, service_name: service, city, published_at: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(), author_key: author,
});

describe("photo type + completion month (contractor)", () => {
  it("every photo defaults to finished; one before / one after; re-marking moves the mark", () => {
    let d = emptyDraft();
    expect([0, 1, 2].map((i) => photoKindOf(i, d))).toEqual(["finished", "finished", "finished"]);
    d = withPhotoKind(withPhotoKind(d, 0, "before"), 1, "after");
    expect([0, 1, 2].map((i) => photoKindOf(i, d))).toEqual(["before", "after", "finished"]);
    d = withPhotoKind(d, 2, "before");
    expect([0, 1, 2].map((i) => photoKindOf(i, d))).toEqual(["finished", "after", "before"]);
    d = withPhotoKind(d, 1, "finished");
    expect(d.afterIndex).toBeNull();
  });
  it("month/year is optional, complete, not in the future", () => {
    expect(completionMonthValid("", NOW)).toBe(true);
    expect(completionMonthValid("2025-10", NOW)).toBe(true);
    expect(completionMonthValid("2026-11", NOW)).toBe(true);
    expect(completionMonthValid("2026-12", NOW)).toBe(false);
    expect(completionMonthValid("2025-", NOW)).toBe(false);
    expect(completionMonthValid("-10", NOW)).toBe(false);
    expect(completionMonthValid("1949-12", NOW)).toBe(false);
    const d = { ...emptyDraft(), title: "Avant/après toiture", serviceName: "Toiture", city: "Laval", photoRights: true, completedMonth: "2025-" };
    expect(validateDraft(d, 2, false)).toEqual(["completedMonth"]);
    expect(validateDraft({ ...d, completedMonth: "2025-10" }, 2, false)).toEqual([]);
    expect(validateDraft({ ...d, completedMonth: "" }, 2, false)).toEqual([]);
  });
  it("shows « Réalisé en … » only when declared", () => {
    expect(completionLabel("2025-10-01", "fr")).toBe("Réalisé en octobre 2025");
    expect(completionLabel("2025-10-01", "en")).toBe("Completed in October 2025");
    expect(completionLabel(null, "fr")).toBeNull();
  });
});

describe("personalized order of the existing feed (homeowner)", () => {
  it("attic insulation is categorised as insulation, gutters as gutters", () => {
    expect(suggestService("Isolation de l'entretoit", "fr")).toBe("Isolation");
    expect(suggestService("Nettoyage des gouttières de toit", "fr")).toBe("Gouttières");
    expect(suggestService("Déneigement résidentiel", "fr")).toBe("Déneigement");
  });
  it("only past work entries count as completed; issues, inspections and future dates do not", () => {
    const cats = completedCategoriesFrom([
      { event_type: "renovation", title: "Isolation de l'entretoit", event_date: "2026-09-01" },
      { event_type: "humidity_issue", title: "Gouttières qui débordent", event_date: "2026-10-01" },
      { event_type: "inspection", title: "Inspection toiture", event_date: "2026-10-01" },
      { event_type: "renovation", title: "Cuisine", event_date: "2027-03-01" },
    ], NOW);
    expect(cats).toEqual(["Isolation"]);
  });
  it("homeowner with completed attic insulation sees local seasonal maintenance first; nothing removed", () => {
    expect(quebecSeason(NOW)).toBe("autumn");
    const items = [proj("iso", "Isolation", "Laval", 1), proj("cuis", "Cuisine", "Montréal", 2), proj("gout", "Gouttières", "Laval", 3), proj("iso2", "Isolation", "Laval", 4)];
    const ranked = rankProjects(items, { now: NOW, visitorCity: "laval", completedCategories: ["Isolation"] }, "for_you");
    expect(ranked[0].id).toBe("gout");
    expect(ranked.map((x) => x.id).sort()).toEqual(items.map((x) => x.id).sort());
    const pos = (id: string) => ranked.findIndex((x) => x.id === id);
    expect(pos("iso")).toBeGreaterThan(pos("gout"));
    // Sans travaux terminés déclarés, la même isolation locale et récente passerait en premier.
    expect(rankProjects(items, { now: NOW, visitorCity: "laval" }, "for_you")[0].id).toBe("iso");
  });
  it("unknown completion status never pushes a category down", () => {
    const items = [proj("cuis", "Cuisine", "Montréal", 1), proj("iso", "Isolation", "Laval", 2)];
    expect(rankProjects(items, { now: NOW, visitorCity: "Laval" }, "for_you")[0].id).toBe("iso");
  });
  it("anonymous visitor: seasonal order only, recent mode keeps server order, other mode surfaces off-season types", () => {
    const items = [proj("cuis", "Cuisine", "Montréal", 1), proj("gout", "Gouttières", "Québec", 2)];
    expect(rankProjects(items, { now: NOW }, "for_you")[0].id).toBe("gout");
    expect(rankProjects(items, { now: NOW }, "recent").map((x) => x.id)).toEqual(["cuis", "gout"]);
    expect(rankProjects(items, { now: NOW }, "other")[0].id).toBe("cuis");
  });
  it("avoids showing the same business twice in a row when alternatives exist", () => {
    const items = [proj("a1", "Gouttières", "Laval", 1, "A"), proj("a2", "Gouttières", "Laval", 2, "A"), proj("b1", "Peinture", "Laval", 3, "B")];
    const ids = rankProjects(items, { now: NOW, visitorCity: "Laval" }, "for_you").map((x) => x.id);
    expect(ids).toEqual(["a1", "b1", "a2"]);
  });
  it("no candidates → empty list (honest empty state upstream)", () => {
    expect(rankProjects([], { now: NOW }, "for_you")).toEqual([]);
  });
});
