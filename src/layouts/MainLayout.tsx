/**
 * UNPRO — Main Layout (Premium Navigation System)
 */

import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import SmartHeader from "@/components/navigation/SmartHeader";
import SmartFooter from "@/components/navigation/SmartFooter";
import FooterSEOGrid from "@/components/navigation/FooterSEOGrid";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import AlexConcierge from "@/components/alex/AlexConcierge";
import CommandPalette from "@/components/navigation/CommandPalette";
import BannerResumeJourney from "@/components/navigation/BannerResumeJourney";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useJourneyTracker } from "@/hooks/useJourneyTracker";
import { useThemeToggle } from "@/hooks/useThemeToggle";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const { isDark } = useThemeToggle();
  useJourneyTracker();

  const showAlex = pathname !== "/alex";

  const showSEOGrid = ["/problemes", "/services", "/villes", "/professionnels"].some(
    prefix => pathname.startsWith(prefix)
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* ── Theme-aware immersive background ── */}
      {isDark ? (
        <div
          className="fixed inset-0 -z-10"
          style={{
            background: `
              radial-gradient(circle at 15% 20%, hsl(222 100% 65% / 0.18), transparent 40%),
              radial-gradient(circle at 85% 80%, hsl(195 100% 55% / 0.12), transparent 50%),
              radial-gradient(circle at 50% 50%, hsl(252 100% 72% / 0.06), transparent 60%),
              hsl(228 40% 7%)
            `,
          }}
        />
      ) : (
        <div className="fixed inset-0 -z-10 bg-light-aura" />
      )}
      <SmartHeader />
      {pathname === "/" && <BannerResumeJourney />}
      <main className="flex-1 pb-16 lg:pb-0 relative z-0">{children}</main>
      {showSEOGrid && <FooterSEOGrid />}
      <SmartFooter />
      <MobileBottomNav />
      {showAlex && <AlexConcierge />}
      <CommandPalette lang={lang} />
    </div>
  );
};

export default MainLayout;
