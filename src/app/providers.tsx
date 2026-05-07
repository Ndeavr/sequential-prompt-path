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
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

// Heavy voice/chat panels — defer until after first paint to keep LCP fast.
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

function DeferredAlexPanels() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ric: any = (window as any).requestIdleCallback;
    const handle = ric
      ? ric(() => setReady(true), { timeout: 1500 })
      : window.setTimeout(() => setReady(true), 800);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(handle);
      else window.clearTimeout(handle as number);
    };
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <OverlayAlexVoiceFullScreen />
      <AlexChatFallbackPanel />
      <AlexVoiceDebugPanel />
    </Suspense>
  );
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
                <DeferredAlexPanels />
              </TooltipProvider>
            </AlexVoiceProvider>
          </ActiveRoleProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export { queryClient };
