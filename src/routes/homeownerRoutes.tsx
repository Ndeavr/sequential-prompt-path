/**
 * UNPRO — Homeowner Routes
 * Dashboard routes for authenticated homeowners.
 * Will be wrapped with auth protection after 01-foundation.
 */

import { Route } from "react-router-dom";
import QuoteAnalyzer from "@/pages/QuoteAnalyzer";
import HomeScore from "@/pages/HomeScore";
import AIPPScore from "@/pages/AIPPScore";

export const homeownerRoutes = (
  <>
    <Route path="/dashboard/quotes" element={<QuoteAnalyzer />} />
    <Route path="/dashboard/home-score" element={<HomeScore />} />
    <Route path="/dashboard/aipp-score" element={<AIPPScore />} />
  </>
);
