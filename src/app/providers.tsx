/**
 * UNPRO — Global Providers
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { AlexVoiceProvider } from "@/contexts/AlexVoiceContext";
import GlobalAlexOverlay from "@/components/alex/GlobalAlexOverlay";

import type { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => (
  <HelmetProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AlexVoiceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
            <GlobalAlexOverlay />
            <HelpPopup />
          </TooltipProvider>
        </AlexVoiceProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export { queryClient };
