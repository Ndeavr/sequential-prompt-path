/**
 * UNPRO — Main Layout (Warm Neutral for public pages)
 */

import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import SmartHeader from "@/components/navigation/SmartHeader";
import SmartFooter from "@/components/navigation/SmartFooter";
import FooterSEOGrid from "@/components/navigation/FooterSEOGrid";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import AlexConcierge from "@/components/alex/AlexConcierge";
import CommandPalette from "@/components/navigation/CommandPalette";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useJourneyTracker } from "@/hooks/useJourneyTracker";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  useJourneyTracker();

  const showAlex = pathname !== "/alex";

  const showSEOGrid = ["/problemes", "/services", "/villes", "/professionnels"].some(
    prefix => pathname.startsWith(prefix)
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden landing-warm">
      <SmartHeader />
      <main className="flex-1 pb-20 lg:pb-0 relative z-0">{children}</main>
      {showSEOGrid && <FooterSEOGrid />}
      <SmartFooter />
      <MobileBottomNav />
      {showAlex && <AlexConcierge />}
      <CommandPalette lang={lang} />
    </div>
  );
};

export default MainLayout;
