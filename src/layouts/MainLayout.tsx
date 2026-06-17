/**
 * UNPRO — Main Layout (Dark Sharp System)
 * Above-the-fold = static shell. All non-critical UI is deferred until
 * after first user interaction or idle to keep mobile TBT low.
 */

import type { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import SmartHeader from "@/components/navigation/SmartHeader";
import SmartFooter from "@/components/navigation/SmartFooter";
import SiteFooterIntelligence from "@/components/layout/SiteFooterIntelligence";
import FooterSEOGrid from "@/components/navigation/FooterSEOGrid";
import { useLanguage } from "@/components/ui/LanguageToggle";
import DeferredAfterInteractive from "@/components/system/DeferredAfterInteractive";

const AlexCompanionOrb = lazy(() => import("@/components/alex/AlexCompanionOrb"));
const MobileBottomNav = lazy(() => import("@/components/home-unicorn/BottomDockGlass"));
const CommandPalette = lazy(() => import("@/components/navigation/CommandPalette"));
const SeoStructuredDataInjector = lazy(() => import("@/seo/components/SeoStructuredDataInjector"));

import { useJourneyTracker } from "@/hooks/useJourneyTracker";

// Journey tracker runs only after interaction so it never blocks first paint.
function DeferredJourneyTracker() {
  useJourneyTracker();
  return null;
}

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  const showAlex = !["/alex", "/", "/index"].includes(pathname);
  const showSEOGrid = ["/problemes", "/services", "/villes", "/professionnels"].some(
    (prefix) => pathname.startsWith(prefix)
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Cinematic background now lives in src/app/App.tsx (StableBackgroundLayer)
          — mounted once above the router so route changes never remount it. */}



      <SmartHeader />
      <main className="flex-1 pb-20 lg:pb-0 relative z-0">{children}</main>
      {showSEOGrid && <FooterSEOGrid />}
      <SiteFooterIntelligence />
      <SmartFooter />

      {/* All deferred — never blocks first paint */}
      <DeferredAfterInteractive>
        <Suspense fallback={null}>
          <MobileBottomNav />
          {showAlex && (
            <div className="hidden md:block">
              <AlexCompanionOrb />
            </div>
          )}
          <CommandPalette lang={lang} />
          <SeoStructuredDataInjector />
          <DeferredJourneyTracker />
        </Suspense>
      </DeferredAfterInteractive>
    </div>
  );
};

export default MainLayout;
