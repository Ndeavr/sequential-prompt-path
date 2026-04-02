import { Providers } from "./providers";
import { AppRouter } from "./router";
import AuthOverlayPremium from "@/components/auth/AuthOverlayPremium";

const App = () => (
  <Providers>
    <AppRouter />
    <AuthOverlayPremium />
  </Providers>
);

export default App;
