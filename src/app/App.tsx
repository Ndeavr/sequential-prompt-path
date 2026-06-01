import { Providers } from "./providers";
import { AppRouter } from "./router";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";
import AlexRouterDebugHUD from "@/components/alex-copilot/AlexRouterDebugHUD";
import AuthDebugHud from "@/components/auth/AuthDebugHud";
import BootDebugButton from "@/components/dev/BootDebugButton";
import ContractorHumanCalloutModal from "@/components/contractor-intent/ContractorHumanCalloutModal";

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
      <AlexRouterDebugHUD />
      <AuthDebugHud />
      <BootDebugButton />
      <ContractorHumanCalloutModal />
    </Providers>
  </AppErrorBoundary>
);

export default App;
