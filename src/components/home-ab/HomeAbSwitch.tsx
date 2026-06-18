/**
 * HomeAbSwitch — Renders bucket A (current home) or bucket B (variant) at `/`.
 */
import { lazy, Suspense } from "react";
import { useHomeAbTest } from "@/hooks/useHomeAbTest";
import PageHomeUnicorn from "@/pages/PageHomeUnicorn";

const PageHomeVariantB = lazy(() => import("@/pages/home/PageHomeVariantB"));

export default function HomeAbSwitch() {
  const bucket = useHomeAbTest();

  // Render A by default while bucket resolves (no flash, same content as
  // current production homepage).
  if (bucket === "b") {
    return (
      <Suspense fallback={<PageHomeUnicorn />}>
        <PageHomeVariantB />
      </Suspense>
    );
  }
  return <PageHomeUnicorn />;
}
