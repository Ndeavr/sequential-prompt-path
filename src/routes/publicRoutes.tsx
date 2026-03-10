/**
 * UNPRO — Public Routes
 * Routes accessible without authentication.
 */

import { Route } from "react-router-dom";
import Home from "@/pages/Home";
import ContractorProfile from "@/pages/ContractorProfile";
import Search from "@/pages/Search";

export const publicRoutes = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/contractors" element={<ContractorProfile />} />
    <Route path="/contractors/:id" element={<ContractorProfile />} />
    <Route path="/search" element={<Search />} />
  </>
);
