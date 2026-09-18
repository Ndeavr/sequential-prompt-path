import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("secondary scroll storytelling contract", () => {
  it("keeps the homepage outside the shared story system", () => {
    const router = read("src/app/router.tsx");
    const story = read("src/components/scroll-story/ScrollStory.tsx");
    expect(story).toContain("data-scroll-story");
    expect(router).not.toContain('path: "/", element: <ScrollStory');
  });

  it("provides reduced-motion fallbacks and native sticky scenes", () => {
    const story = read("src/components/scroll-story/ScrollStory.tsx");
    expect(story).toContain("useReducedMotion");
    expect(story).toContain('className="sticky top-0');
    expect(story).toContain("md:sticky");
  });

  it("upgrades the five priority destinations with the shared system", () => {
    [
      "src/pages/contractor-landing/HomeContractorAdaptive.tsx",
      "src/pages/marketing/PageVisibiliteIA.tsx",
      "src/pages/PagePasseportMaison.tsx",
      "src/pages/trust/PageHowUnproWorksAI.tsx",
      "src/pages/entrepreneur/PageEntrepreneurHowItWorks.tsx",
    ].forEach((path) => expect(read(path)).toContain("<ScrollStory"));
  });

  it("does not restore unsupported illustrative proof on migrated explainers", () => {
    const sources = [
      read("src/pages/contractor-landing/HomeContractorAdaptive.tsx"),
      read("src/pages/trust/PageHowUnproWorksAI.tsx"),
      read("src/pages/CommentCaMarchePage.tsx"),
    ].join("\n");
    ["18924", "12x", "85%", "1250", "96%"].forEach((claim) => expect(sources).not.toContain(claim));
    expect(sources).toContain("Vérifié");
    expect(sources).toContain("Déclaré");
  });
});