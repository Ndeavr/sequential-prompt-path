/**
 * UNPRO — Contractor Routes
 * Pro routes for authenticated contractors.
 * Will be wrapped with role-based auth protection after 01-foundation.
 */

import { Route } from "react-router-dom";
import ProDashboard from "@/pages/pro/ProDashboard";

export const contractorRoutes = (
  <>
    <Route path="/pro" element={<ProDashboard />} />
    {/* Future: /pro/leads, /pro/analytics, /pro/calendar */}
  </>
);
