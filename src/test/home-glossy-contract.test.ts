import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const hero = readFileSync("src/components/home-light/HeroHomeownerLight.tsx", "utf8");
const clara = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const page = readFileSync("src/pages/PageHomeLight.tsx", "utf8");
const layout = readFileSync("src/layouts/MainLayout.tsx", "utf8");
const header = readFileSync("src/components/navigation/SmartHeader.tsx", "utf8");
const drawer = readFileSync("src/components/navigation/DrawerNavigationMobileIntent.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");

describe("glossy homepage contract", () => {
  it("renders the approved ONE CLARA promise", () => {
    expect(hero).toContain("Un projet de rénovation en tête?");
    expect(hero).not.toContain("home-hero-subtitle");
    expect(hero).not.toContain("Pas trois soumissions.");
    expect(hero).not.toContain("Rendez-vous exclusifs");
    expect(hero).not.toContain("AnimatePresence");
    expect(hero).not.toContain("motion.");
  });

  it("uses a lightweight live UNPRO background with reduced-motion support", () => {
    expect(css).toContain("@keyframes unpro-ambient-drift");
    expect(css).toContain("@keyframes unpro-ambient-rise");
    expect(css).toContain(".home-light .home-clara-ambient::before");
    expect(css).toMatch(/prefers-reduced-motion:[\s\S]*home-clara-ambient::before[\s\S]*animation: none/);
  });

  it("keeps Clara text, voice and attachment actions real", () => {
    expect(clara).toContain("/functions/v1/alex-chat");
    expect(clara).toContain("enqueueMedia(files)");
    expect(clara).toContain("openAlex(\"home_hero\"");
    expect(clara).toContain("PromptInput");
    expect(clara).toContain("Ajouter une photo ou un document");
    expect(clara).toContain("Bonjour ! Que voulez-vous améliorer, rénover ou réparer ?");
    expect(clara).toContain('placeholder: "Décrivez votre projet…"');
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
    expect(drawer).toContain('calc(66px + env(safe-area-inset-top))');
  });

  it("keeps the canonical header and official wordmark stable", () => {
    expect(header).toContain('pathname === "/" || pathname === "/index"');
    expect(header).toContain("home-header-layout-spacer");
    expect(header).toContain("home-brand-wordmark");
    expect(header).not.toContain("homeHeaderCompact");
    expect(header).not.toContain("home-header-scroll-sentinel");
    expect(header).not.toContain("new IntersectionObserver");
    expect(header).not.toContain("home-brand-symbol");
    expect(header).not.toContain('addEventListener("scroll"');
  });

  it("keeps one Clara surface and defers contextual modules", () => {
    const floating = readFileSync("src/components/alex/FloatingAlexGuide.tsx", "utf8");
    expect(clara).toContain("lazy(() => import");
    expect(clara).toContain("await import(\"@/features/quoteAnalyzer/services/quoteAnalysisClient\")");
    expect(floating).toContain('location.pathname === "/"');
  });
});
