/**
 * UNPRO — Global Providers
 */

import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { AlexVoiceProvider } from "@/contexts/AlexVoiceContext";
import { ActiveRoleProvider } from "@/contexts/ActiveRoleContext";
import { LanguageProvider } from "@/components/ui/LanguageToggle";
import OverlayHydrationGuard from "@/components/system/OverlayHydrationGuard";
import DeferredAfterInteractive from "@/components/system/DeferredAfterInteractive";
import type { ReactNode } from "react";

// Defer heavy voice/chat overlays — they only need to mount after the user
// becomes interactive. Keeps homepage initial bundle and TBT low.
const OverlayAlexVoiceFullScreen = lazy(() => import("@/components/voice/OverlayAlexVoiceFullScreen"));
const AlexChatFallbackPanel = lazy(() => import("@/components/voice/AlexChatFallbackPanel"));
const AlexVoiceDebugPanel = lazy(() => import("@/components/voice/AlexVoiceDebugPanel"));

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
                <DeferredAfterInteractive>
                  <Suspense fallback={null}>
                    <OverlayAlexVoiceFullScreen />
                    <AlexChatFallbackPanel />
                    <AlexVoiceDebugPanel />
                  </Suspense>
                </DeferredAfterInteractive>
              </TooltipProvider>
            </AlexVoiceProvider>
          </ActiveRoleProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export { queryClient };
