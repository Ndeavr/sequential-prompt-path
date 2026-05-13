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
import FooterSEOGrid from "@/components/navigation/FooterSEOGrid";
import { useLanguage } from "@/components/ui/LanguageToggle";
import DeferredAfterInteractive from "@/components/system/DeferredAfterInteractive";

const AlexCompanionOrb = lazy(() => import("@/components/alex/AlexCompanionOrb"));
const MobileBottomNav = lazy(() => import("@/components/navigation/MobileBottomNav"));
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
      <div className="fixed inset-0 -z-10 noise-overlay leather-texture">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 15% 20%, hsl(222 100% 65% / 0.07), transparent 50%),
              radial-gradient(ellipse 70% 50% at 85% 80%, hsl(195 100% 55% / 0.05), transparent 50%),
              radial-gradient(ellipse 60% 40% at 50% 50%, hsl(252 100% 72% / 0.03), transparent 50%),
              #060B14
            `,
          }}
        />
      </div>

      <SmartHeader />
      <main className="flex-1 pb-20 lg:pb-0 relative z-0">{children}</main>
      {showSEOGrid && <FooterSEOGrid />}
      <SmartFooter />

      {/* All deferred — never blocks first paint */}
      <DeferredAfterInteractive>
        <Suspense fallback={null}>
          <MobileBottomNav />
          {showAlex && <AlexCompanionOrb />}
          <CommandPalette lang={lang} />
          <SeoStructuredDataInjector />
          <DeferredJourneyTracker />
        </Suspense>
      </DeferredAfterInteractive>
    </div>
  );
};

export default MainLayout;
