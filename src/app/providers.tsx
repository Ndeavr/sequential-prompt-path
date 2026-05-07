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
import { ActiveRoleProvider } from "@/contexts/ActiveRoleContext";
import { LanguageProvider } from "@/components/ui/LanguageToggle";
import OverlayAlexVoiceFullScreen from "@/components/voice/OverlayAlexVoiceFullScreen";
import AlexChatFallbackPanel from "@/components/voice/AlexChatFallbackPanel";
import AlexVoiceDebugPanel from "@/components/voice/AlexVoiceDebugPanel";
import OverlayHydrationGuard from "@/components/system/OverlayHydrationGuard";
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ActiveRoleProvider>
            <AlexVoiceProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {children}
                <OverlayHydrationGuard />
                <OverlayAlexVoiceFullScreen />
                <AlexChatFallbackPanel />
                <AlexVoiceDebugPanel />
              </TooltipProvider>
            </AlexVoiceProvider>
          </ActiveRoleProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export { queryClient };
