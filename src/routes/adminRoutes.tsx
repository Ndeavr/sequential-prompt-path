/**
 * UNPRO — Admin Routes
 * Admin panel routes. Protected by admin role.
 * Will be wrapped with admin role check after 01-foundation.
 */

import { Route } from "react-router-dom";
import AdminDashboard from "@/pages/admin/AdminDashboard";

export const adminRoutes = (
  <>
    <Route path="/admin" element={<AdminDashboard />} />
    {/* Future: /admin/users, /admin/verification, /admin/analytics */}
  </>
);
