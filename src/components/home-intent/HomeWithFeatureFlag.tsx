/**
 * HomeWithFeatureFlag — Routes to intent homepage or classic homepage.
 * Feature flag: intent_home_v1 (localStorage).
 */
import { lazy, Suspense } from "react";

const PageHomeIntentUNPRO = lazy(() => import("@/pages/PageHomeIntentUNPRO"));
import Home from "@/pages/Home";

const FEATURE_FLAG_KEY = "intent_home_v1";

function isIntentHomeEnabled(): boolean {
  try {
    return localStorage.getItem(FEATURE_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

export default function HomeWithFeatureFlag() {
  if (isIntentHomeEnabled()) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground text-sm">Chargement…</div></div>}>
        <PageHomeIntentUNPRO />
      </Suspense>
    );
  }
  return <Home />;
}
