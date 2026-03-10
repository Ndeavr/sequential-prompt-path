import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import ContractorProfile from "@/pages/ContractorProfile";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import QuoteAnalyzer from "@/pages/QuoteAnalyzer";
import HomeScore from "@/pages/HomeScore";
import AIPPScore from "@/pages/AIPPScore";
import ProDashboard from "@/pages/pro/ProDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import NotFound from "@/pages/NotFound";

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/contractors" element={<ContractorProfile />} />
      <Route path="/contractors/:id" element={<ContractorProfile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Homeowner Dashboard */}
      <Route path="/dashboard/quotes" element={<ProtectedRoute><QuoteAnalyzer /></ProtectedRoute>} />
      <Route path="/dashboard/home-score" element={<ProtectedRoute><HomeScore /></ProtectedRoute>} />
      <Route path="/dashboard/aipp-score" element={<ProtectedRoute><AIPPScore /></ProtectedRoute>} />

      {/* Contractor Pro */}
      <Route path="/pro" element={<ProtectedRoute requiredRole="contractor"><ProDashboard /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
