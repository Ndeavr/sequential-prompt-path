/**
 * HomeAbSwitch — Renders bucket A (current), B (recommandation), or C (le bon) at `/`.
 */
import { lazy, Suspense } from "react";
import { useHomeAbTest } from "@/hooks/useHomeAbTest";
import PageHomeUnicorn from "@/pages/PageHomeUnicorn";

const PageHomeVariantB = lazy(() => import("@/pages/home/PageHomeVariantB"));
const PageHomeVariantC = lazy(() => import("@/pages/home/PageHomeVariantC"));

export default function HomeAbSwitch() {
  const bucket = useHomeAbTest();

  if (bucket === "b") {
    return (
      <Suspense fallback={<PageHomeUnicorn />}>
        <PageHomeVariantB />
      </Suspense>
    );
  }
  if (bucket === "c") {
    return (
      <Suspense fallback={<PageHomeUnicorn />}>
        <PageHomeVariantC />
      </Suspense>
    );
  }
  return <PageHomeUnicorn />;
}
