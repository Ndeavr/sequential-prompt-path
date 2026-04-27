import { Providers } from "./providers";
import { AppRouter } from "./router";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";
import AlexRouterDebugHUD from "@/components/alex-copilot/AlexRouterDebugHUD";
import AuthDebugHud from "@/components/auth/AuthDebugHud";

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
      <AlexRouterDebugHUD />
      <AuthDebugHud />
    </Providers>
  </AppErrorBoundary>
);

export default App;
