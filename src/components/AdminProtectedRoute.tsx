/**
 * UNPRO — AdminProtectedRoute
 * Every /admin/* route gets the operator shell (AdminLayout) at the router
 * level. Pages that still self-wrap in AdminLayout are unaffected — the
 * layout is idempotent via AdminLayoutDepth context.
 */
import type { ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/layouts/AdminLayout";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute requiredRole="admin">
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

export default AdminProtectedRoute;
