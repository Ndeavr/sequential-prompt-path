import { Providers } from "./providers";
import { AppRouter } from "./router";
import AuthOverlayPremium from "@/components/auth/AuthOverlayPremium";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
      <AuthOverlayPremium />
    </Providers>
  </AppErrorBoundary>
);

export default App;
