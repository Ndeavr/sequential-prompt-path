import { Providers } from "./providers";
import { AppRouter } from "./router";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";
import AlexRouterDebugHUD from "@/components/alex-copilot/AlexRouterDebugHUD";

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
      <AlexRouterDebugHUD />
    </Providers>
  </AppErrorBoundary>
);

export default App;
