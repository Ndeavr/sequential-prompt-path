import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "./pages/Home.tsx";
import ContractorProfile from "./pages/ContractorProfile.tsx";
import QuoteAnalyzer from "./pages/QuoteAnalyzer.tsx";
import HomeScore from "./pages/HomeScore.tsx";
import AIPPScore from "./pages/AIPPScore.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/contractors" element={<ContractorProfile />} />

          {/* Dashboard Routes (will be protected after auth setup) */}
          <Route path="/dashboard/quotes" element={<QuoteAnalyzer />} />
          <Route path="/dashboard/home-score" element={<HomeScore />} />
          <Route path="/dashboard/aipp-score" element={<AIPPScore />} />

          {/* Pro Routes — placeholder for contractor pro features */}
          {/* <Route path="/pro" element={<ProDashboard />} /> */}

          {/* Admin Routes — placeholder for admin panel */}
          {/* <Route path="/admin" element={<AdminPanel />} /> */}

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
