import { Providers } from "./providers";
import { AppRouter } from "./router";
import AuthOverlayPremium from "@/components/auth/AuthOverlayPremium";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";
import { useGlobalAudioUnlock } from "@/hooks/useGlobalAudioUnlock";

function AudioUnlockInit() {
  useGlobalAudioUnlock();
  return null;
}

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AudioUnlockInit />
      <AppRouter />
      <AuthOverlayPremium />
    </Providers>
  </AppErrorBoundary>
);

export default App;
