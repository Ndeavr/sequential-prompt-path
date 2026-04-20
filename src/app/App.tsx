import { Providers } from "./providers";
import { AppRouter } from "./router";
import AuthOverlayPremium from "@/components/auth/AuthOverlayPremium";
import AuthReturnRouter from "@/components/auth/AuthReturnRouter";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
      <AuthReturnRouter />
      <AuthOverlayPremium />
    </Providers>
  </AppErrorBoundary>
);

export default App;
