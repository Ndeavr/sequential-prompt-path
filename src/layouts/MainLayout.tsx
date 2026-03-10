/**
 * UNPRO — Main Layout
 * Wraps public-facing pages with header, footer, navigation.
 *
 * Future: Header with nav, footer with links, responsive mobile menu.
 */

import type { ReactNode } from "react";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Future: <Header /> */}
      <main className="flex-1">{children}</main>
      {/* Future: <Footer /> */}
    </div>
  );
};

export default MainLayout;
