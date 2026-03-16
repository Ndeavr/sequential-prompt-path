/**
 * UNPRO — Main Layout (Premium Navigation System)
 */

import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import SmartHeader from "@/components/navigation/SmartHeader";
import SmartFooter from "@/components/navigation/SmartFooter";
import FooterSEOGrid from "@/components/navigation/FooterSEOGrid";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import AlexConcierge from "@/components/alex/AlexConcierge";
import CommandPalette from "@/components/navigation/CommandPalette";
import { useLanguage } from "@/components/ui/LanguageToggle";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();
  const { lang } = useLanguage();

  // Force light mode on public pages
  useEffect(() => {
    if (theme !== "light") setTheme("light");
  }, [theme, setTheme]);

  const showAlex = pathname !== "/alex";

  // Show SEO grid on programmatic pages
  const showSEOGrid = ["/problemes", "/services", "/villes", "/professionnels"].some(
    prefix => pathname.startsWith(prefix)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SmartHeader />
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
