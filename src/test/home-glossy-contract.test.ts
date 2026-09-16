import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const hero = readFileSync("src/components/home-light/HeroHomeownerLight.tsx", "utf8");
const clara = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const page = readFileSync("src/pages/PageHomeLight.tsx", "utf8");

describe("glossy homepage contract", () => {
  it("renders the approved French promise and proof", () => {
    expect(hero).toContain("Trouvez le bon entrepreneur.");
    expect(hero).toContain("Pas trois soumissions.");
    expect(hero).toContain("Clara analyse votre projet et vous recommande le meilleur match.");
    expect(hero).toContain("Rendez-vous exclusifs");
  });

  it("keeps Clara text, voice and attachment actions real", () => {
    expect(clara).toContain("/functions/v1/alex-chat");
    expect(clara).toContain("handleUpload(file");
    expect(clara).toContain("openAlex(\"home_hero\"");
    expect(clara).toContain("PromptInput");
    expect(clara).toContain("Joindre un document");
    expect(clara).toContain("Décrivez votre projet…");
  });

  it("removes the promotional strip and old homeowner photo from the homepage", () => {
    expect(page).not.toContain("AnnouncementStrip");
    expect(hero).not.toContain("home-hero-homeowner.jpg");
  });
});