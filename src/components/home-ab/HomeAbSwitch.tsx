/**
 * HomeAbSwitch — Renders bucket A (current), B (recommandation), or C (le bon) at `/`.
 * Every variant is wrapped in <PageShell> so the layout guardrails
 * (dock-safe padding, isolation, QA scanner marker) apply uniformly.
 */
import { lazy, Suspense } from "react";
import { useHomeAbTest } from "@/hooks/useHomeAbTest";
import PageHomeUnicorn from "@/pages/PageHomeUnicorn";
import PageShell from "@/layouts/PageShell";

const PageHomeVariantB = lazy(() => import("@/pages/home/PageHomeVariantB"));
const PageHomeVariantC = lazy(() => import("@/pages/home/PageHomeVariantC"));

export default function HomeAbSwitch() {
  const bucket = useHomeAbTest();

  if (bucket === "b") {
    return (
      <Suspense fallback={<PageHomeUnicorn />}>
        <PageShell variant="marketing" id={`home-ab-${bucket}`}>
          <PageHomeVariantB />
        </PageShell>
      </Suspense>
    );
  }
  if (bucket === "c") {
    return (
      <Suspense fallback={<PageHomeUnicorn />}>
        <PageShell variant="marketing" id={`home-ab-${bucket}`}>
          <PageHomeVariantC />
        </PageShell>
      </Suspense>
    );
  }
  // Bucket A = PageHomeUnicorn, which already renders its own <PageShell>.
  return <PageHomeUnicorn />;
}
