import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";
import "./styles/alex-overlays.css";
import { installLegacyPlanGuard } from "./dev/legacyPlanGuard";
import { logBoot } from "./lib/bootDebug";
import { initObservability } from "./lib/observability";

logBoot("APP_MOUNT");
void initObservability();

// DEV-only: scream in console if legacy plan names (Essentiel/Starter/Basic) leak into UI.
installLegacyPlanGuard();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
