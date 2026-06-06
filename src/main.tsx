import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";
import "./styles/alex-overlays.css";
import { installLegacyPlanGuard } from "./dev/legacyPlanGuard";
import { logBoot } from "./lib/bootDebug";
import { initObservability } from "./lib/observability";
import { tryRecoverFromChunkError } from "./components/errors/AppErrorBoundary";

logBoot("APP_MOUNT");
void initObservability();

// DEV-only: scream in console if legacy plan names (Essentiel/Starter/Basic) leak into UI.
installLegacyPlanGuard();

// Catch Vite preload failures and dynamic-import rejections that bypass React error boundaries.
window.addEventListener("vite:preloadError", (e: Event) => {
  tryRecoverFromChunkError((e as any).payload ?? e);
});
window.addEventListener("unhandledrejection", (e) => {
  tryRecoverFromChunkError(e.reason);
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
