/**
 * HomeWithFeatureFlag — Routes to Alex conversational page by default.
 * Admin users see the classic home. Everyone else → /alex.
 */
import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";

const PageHomeAlexConversationalLite = lazy(() => import("@/pages/PageHomeAlexConversationalLite"));

const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
  </div>
);

export default function HomeWithFeatureFlag() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <PageHomeAlexConversationalLite />
    </Suspense>
  );
}
