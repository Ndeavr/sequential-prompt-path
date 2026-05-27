import { Providers } from "./providers";
import { AppRouter } from "./router";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";
import AlexRouterDebugHUD from "@/components/alex-copilot/AlexRouterDebugHUD";
import AuthDebugHud from "@/components/auth/AuthDebugHud";
import BootDebugButton from "@/components/dev/BootDebugButton";
import FloatingAlexGuide from "@/components/alex/FloatingAlexGuide";

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
      <FloatingAlexGuide />
      <AlexRouterDebugHUD />
      <AuthDebugHud />
      <BootDebugButton />
    </Providers>
  </AppErrorBoundary>
);

export default App;
