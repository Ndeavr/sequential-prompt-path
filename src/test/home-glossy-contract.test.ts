import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const hero = readFileSync("src/components/home-light/HeroHomeownerLight.tsx", "utf8");
const clara = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const page = readFileSync("src/pages/PageHomeLight.tsx", "utf8");
const layout = readFileSync("src/layouts/MainLayout.tsx", "utf8");
const header = readFileSync("src/components/navigation/SmartHeader.tsx", "utf8");

describe("glossy homepage contract", () => {
  it("renders the approved ONE CLARA promise", () => {
    expect(hero).toContain("Montrez-moi. Parlez-moi. Je m’occupe du reste.");
    expect(hero).toContain("Qu’est-ce que vous voulez réparer, vérifier ou améliorer?");
    expect(hero).not.toContain("Pas trois soumissions.");
    expect(hero).not.toContain("Rendez-vous exclusifs");
  });

  it("keeps Clara text, voice and attachment actions real", () => {
    expect(clara).toContain("/functions/v1/alex-chat");
    expect(clara).toContain("handleUpload(file");
    expect(clara).toContain("openAlex(\"home_hero\"");
    expect(clara).toContain("PromptInput");
    expect(clara).toContain("Ajouter une photo ou un document");
    expect(clara).toContain("Demandez quelque chose à Clara…");
    expect(clara).toContain("Prendre une photo");
    expect(clara).toContain("runQuoteAnalysis");
    expect(clara).toContain("ClaraContextPanel");
  });

  it("removes the promotional strip and old homeowner photo from the homepage", () => {
    expect(page).not.toContain("AnnouncementStrip");
    expect(hero).not.toContain("home-hero-homeowner.jpg");
    expect(hero).not.toContain("scene-1-exterior.jpg");
    expect(hero).not.toContain("BlueprintOverlay");
  });

  it("keeps the public homepage free of internal docks and long sections", () => {
    expect(layout).toContain("{!isLightHome && <MobileBottomNav />}");
    expect(layout).toContain("{!isLightHome && <BottomDockSafeArea />}");
    expect(page).toContain("<MainLayout hideMemorySection>");
    expect(page).not.toContain("SectionPasseport");
    expect(page).not.toContain("SectionTwoPaths");
  });

  it("uses the compact public header controls", () => {
    expect(header).toContain("home-language-switch");
    expect(header).toContain("home-header-icon");
    expect(header).toContain("<UnproLogo");
  });

  it("keeps one Clara surface and defers contextual modules", () => {
    const floating = readFileSync("src/components/alex/FloatingAlexGuide.tsx", "utf8");
    expect(clara).toContain("lazy(() => import");
    expect(clara).toContain("await import(\"@/features/quoteAnalyzer/services/quoteAnalysisClient\")");
    expect(floating).toContain('location.pathname === "/"');
  });
});