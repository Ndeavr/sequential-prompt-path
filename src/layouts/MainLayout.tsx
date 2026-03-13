/**
 * UNPRO — Main Layout (Programmatic Navigation)
 */

import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import SmartHeader from "@/components/navigation/SmartHeader";
import SmartFooter from "@/components/navigation/SmartFooter";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";
import AlexConcierge from "@/components/alex/AlexConcierge";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();

  // Force light mode on public pages
  useEffect(() => {
    if (theme !== "light") setTheme("light");
  }, [theme, setTheme]);

  const showAlex = pathname !== "/alex";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SmartHeader />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <SmartFooter />
      <MobileBottomNav />
      {showAlex && <AlexConcierge />}
    </div>
  );
};

export default MainLayout;
