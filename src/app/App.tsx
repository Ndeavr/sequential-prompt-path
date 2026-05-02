import { Providers } from "./providers";
import { AppRouter } from "./router";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";
import AlexRouterDebugHUD from "@/components/alex-copilot/AlexRouterDebugHUD";
import AuthDebugHud from "@/components/auth/AuthDebugHud";
import PersistentContractorCallPopup from "@/components/PersistentContractorCallPopup";

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
      <PersistentContractorCallPopup />
      <AlexRouterDebugHUD />
      <AuthDebugHud />
    </Providers>
  </AppErrorBoundary>
);

export default App;
