/**
 * UNPRO — Router Configuration
 * Assembles all route groups into a single router.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { publicRoutes } from "@/routes/publicRoutes";
import { homeownerRoutes } from "@/routes/homeownerRoutes";
import { contractorRoutes } from "@/routes/contractorRoutes";
import { adminRoutes } from "@/routes/adminRoutes";
import NotFound from "@/pages/NotFound";

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {publicRoutes}
      {homeownerRoutes}
      {contractorRoutes}
      {adminRoutes}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
