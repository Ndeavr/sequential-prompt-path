import { useEffect } from "react";
import { Providers } from "./providers";
import { AppRouter } from "./router";
import AppErrorBoundary, { clearChunkReloadFlag } from "@/components/errors/AppErrorBoundary";
import AlexRouterDebugHUD from "@/components/alex-copilot/AlexRouterDebugHUD";
import AuthDebugHud from "@/components/auth/AuthDebugHud";
import AuthErrorCatcher from "@/components/auth/AuthErrorCatcher";
import BootDebugButton from "@/components/dev/BootDebugButton";
import ContractorHumanCalloutModal from "@/components/contractor-intent/ContractorHumanCalloutModal";
import StableBackgroundLayer from "@/components/system/background/StableBackgroundLayer";

const App = () => {
  useEffect(() => {
    // Successful mount — rearm chunk-reload recovery for the next stale deploy.
    clearChunkReloadFlag();
  }, []);

  return (
    <AppErrorBoundary>
      <AuthErrorCatcher />
      {/* Cinematic background — mounted ONCE above the router so route
          changes never remount or re-init decorative layers. */}
      <StableBackgroundLayer />
      <Providers>
        <AppRouter />
        <AlexRouterDebugHUD />
        <AuthDebugHud />
        <BootDebugButton />
        <ContractorHumanCalloutModal />
      </Providers>
    </AppErrorBoundary>
  );
};

export default App;
