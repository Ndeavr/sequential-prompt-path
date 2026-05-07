import { lazy, Suspense, useEffect, useState } from "react";
import { Providers } from "./providers";
import { AppRouter } from "./router";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";

// Dev-only HUDs — never load in production, defer until idle in dev.
const AlexRouterDebugHUD = lazy(() => import("@/components/alex-copilot/AlexRouterDebugHUD"));
const AuthDebugHud = lazy(() => import("@/components/auth/AuthDebugHud"));
const BootDebugButton = lazy(() => import("@/components/dev/BootDebugButton"));

function DeferredDevHuds() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const ric = (window as any).requestIdleCallback ?? ((cb: any) => setTimeout(cb, 1500));
    const id = ric(() => setShow(true));
    return () => {
      const cic = (window as any).cancelIdleCallback ?? clearTimeout;
      cic(id);
    };
  }, []);
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <AlexRouterDebugHUD />
      <AuthDebugHud />
      <BootDebugButton />
    </Suspense>
  );
}

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
      <DeferredDevHuds />
    </Providers>
  </AppErrorBoundary>
);

export default App;
