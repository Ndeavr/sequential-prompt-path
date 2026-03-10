/**
 * UNPRO — Contractor Layout
 * Wraps contractor pro pages with contractor-specific navigation.
 */

import type { ReactNode } from "react";

interface ContractorLayoutProps {
  children: ReactNode;
}

const ContractorLayout = ({ children }: ContractorLayoutProps) => {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Future: <ContractorSidebar /> */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default ContractorLayout;
