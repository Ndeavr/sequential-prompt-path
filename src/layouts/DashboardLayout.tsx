/**
 * UNPRO — Dashboard Layout
 * Wraps authenticated homeowner pages with sidebar navigation.
 *
 * Future: Sidebar with links to quotes, scores, profile, settings.
 */

import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Future: <DashboardSidebar /> */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;
