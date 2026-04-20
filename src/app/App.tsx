import { Providers } from "./providers";
import { AppRouter } from "./router";
import AppErrorBoundary from "@/components/errors/AppErrorBoundary";

const App = () => (
  <AppErrorBoundary>
    <Providers>
      <AppRouter />
    </Providers>
  </AppErrorBoundary>
);

export default App;
