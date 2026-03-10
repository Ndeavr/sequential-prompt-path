/**
 * UNPRO — Admin Layout
 * Wraps admin pages with admin navigation.
 */

import type { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Future: <AdminSidebar /> */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default AdminLayout;
