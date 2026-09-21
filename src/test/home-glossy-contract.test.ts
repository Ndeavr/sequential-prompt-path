import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const hero = readFileSync("src/components/home-light/HeroHomeownerLight.tsx", "utf8");
const clara = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const page = readFileSync("src/pages/PageHomeLight.tsx", "utf8");
const layout = readFileSync("src/layouts/MainLayout.tsx", "utf8");
const header = readFileSync("src/components/navigation/SmartHeader.tsx", "utf8");
const drawer = readFileSync("src/components/navigation/DrawerNavigationMobileIntent.tsx", "utf8");

describe("glossy homepage contract", () => {
  it("renders the approved ONE CLARA promise", () => {
    expect(hero).toContain("Discutons.");
    expect(hero).toContain("rénover");
    expect(hero).not.toContain("Pas trois soumissions.");
    expect(hero).not.toContain("Rendez-vous exclusifs");
  });

  it("keeps Clara text, voice and attachment actions real", () => {
    expect(clara).toContain("/functions/v1/alex-chat");
    expect(clara).toContain("enqueueMedia(files)");
    expect(clara).toContain("openAlex(\"home_hero\"");
    expect(clara).toContain("PromptInput");
    expect(clara).toContain("Ajouter une photo ou un document");
    expect(clara).toContain("<MessageResponse>Bonjour ! Que puis-je faire pour vous ?</MessageResponse>");
    expect(clara).toContain('placeholder: "Que voulez-vous faire ?"');
    expect(clara).toContain('const [composerText, setComposerText] = useState("")');
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
    expect(header).toContain('aria-label={lang === "en" ? "Alerts" : "Alertes"}');
    expect(header).toContain('aria-label={lang === "en" ? "Share QR code" : "Partager par code QR"}');
    expect(header).toContain("home-header-icon");
    expect(header).toContain("<UnproLogo");
    expect(header).not.toContain('className="home-language-switch"');
    expect(drawer).toContain("<LanguageToggle");
    expect(drawer).toContain('lang === "en" ? "My profile" : "Mon profil"');
    expect(drawer).toContain('calc(98px + env(safe-area-inset-top))');
    expect(drawer).toContain('calc(62px + env(safe-area-inset-top))');
  });

  it("contracts the canonical header with official brand assets and no scroll listener", () => {
    expect(header).toContain('pathname === "/" || pathname === "/index"');
    expect(header).toContain("homeHeaderCompact");
    expect(header).toContain("home-header-scroll-sentinel");
    expect(header).toContain("home-header-layout-spacer");
    expect(header).toContain("new IntersectionObserver");
    expect(header).toContain("home-brand-wordmark");
    expect(header).toContain("home-brand-symbol");
    expect(header).not.toContain('addEventListener("scroll"');
  });

  it("keeps one Clara surface and defers contextual modules", () => {
    const floating = readFileSync("src/components/alex/FloatingAlexGuide.tsx", "utf8");
    expect(clara).toContain("lazy(() => import");
    expect(clara).toContain("await import(\"@/features/quoteAnalyzer/services/quoteAnalysisClient\")");
    expect(floating).toContain('location.pathname === "/"');
  });
});