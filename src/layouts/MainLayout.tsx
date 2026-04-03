/**
 * UNPRO — Main Layout (Cinematic Visual System)
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
      {/* ── Cinematic immersive background ── */}
      {isDark ? (
        <div className="fixed inset-0 -z-10 noise-overlay">
          {/* Deep dark base with animated aura blobs */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 15% 20%, hsl(222 100% 65% / 0.10), transparent 50%),
                radial-gradient(ellipse 70% 50% at 85% 80%, hsl(195 100% 55% / 0.08), transparent 50%),
                radial-gradient(ellipse 60% 40% at 50% 50%, hsl(252 100% 72% / 0.05), transparent 50%),
                hsl(228 40% 5%)
              `,
            }}
          />
          {/* Subtle fog overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "radial-gradient(ellipse 120% 80% at 50% 30%, hsl(222 100% 60% / 0.06), transparent 70%)",
            }}
          />
        </div>
      ) : (
        <div className="fixed inset-0 -z-10 bg-light-aura noise-overlay" />
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
