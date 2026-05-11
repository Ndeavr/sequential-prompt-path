import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";
import "./styles/alex-overlays.css";
import { logBoot } from "./lib/bootDebug";

logBoot("APP_MOUNT");

// Defer non-critical boot work until the browser is idle so it doesn't
// compete with the LCP paint on mobile.
const idle = (cb: () => void) => {
  const w = window as any;
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 2500 });
  else setTimeout(cb, 1500);
};

idle(() => {
  void import("./lib/observability").then(({ initObservability }) => initObservability());
  if (import.meta.env.DEV) {
    void import("./dev/legacyPlanGuard").then(({ installLegacyPlanGuard }) => installLegacyPlanGuard());
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
