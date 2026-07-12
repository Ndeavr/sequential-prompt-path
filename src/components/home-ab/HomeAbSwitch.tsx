/**
 * HomeAbSwitch — Renders bucket A (current), B (recommandation), or C (le bon) at `/`.
 * Every variant is wrapped in <MainLayout> so the bottom dock (BottomDockGlass)
 * mounts on the homepage.
 */
import { lazy, Suspense } from "react";
import { useHomeAbTest } from "@/hooks/useHomeAbTest";
import PageHomeUnicorn from "@/pages/PageHomeUnicorn";
import MainLayout from "@/layouts/MainLayout";
import PageShell from "@/layouts/PageShell";

const PageHomeVariantB = lazy(() => import("@/pages/home/PageHomeVariantB"));
const PageHomeVariantC = lazy(() => import("@/pages/home/PageHomeVariantC"));

export default function HomeAbSwitch() {
  const bucket = useHomeAbTest();

  if (bucket === "b") {
    return (
      <MainLayout>
        <Suspense fallback={<PageHomeUnicorn />}>
          <PageShell variant="marketing" id={`home-ab-${bucket}`}>
            <PageHomeVariantB />
          </PageShell>
        </Suspense>
      </MainLayout>
    );
  }
  if (bucket === "c") {
    return (
      <MainLayout>
        <Suspense fallback={<PageHomeUnicorn />}>
          <PageShell variant="marketing" id={`home-ab-${bucket}`}>
            <PageHomeVariantC />
          </PageShell>
        </Suspense>
      </MainLayout>
    );
  }
  // Bucket A = PageHomeUnicorn, which already renders its own <PageShell>.
  return (
    <MainLayout>
      <PageHomeUnicorn />
    </MainLayout>
  );
}
