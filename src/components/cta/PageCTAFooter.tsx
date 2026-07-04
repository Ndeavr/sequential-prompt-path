/**
 * PageCTAFooter — inline CTA block auto-injected by <PageShell>.
 * Hides itself if the page already contains any [data-cta-canonical]
 * element, so it never duplicates the page's own primary action.
 */
import { useEffect, useState } from "react";
import PrimaryCTA from "@/components/cta/PrimaryCTA";
import type { CanonicalCTA } from "@/config/ctaRegistry";

interface PageCTAFooterProps {
  ctas: CanonicalCTA[];
  headline?: string;
}

export default function PageCTAFooter({
  ctas,
  headline = "Prêt à avancer ?",
}: PageCTAFooterProps) {
  const [hasOwnCTA, setHasOwnCTA] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Scan on mount + short delay to catch async-rendered pages.
    const check = () => {
      const all = document.querySelectorAll("[data-cta-canonical]");
      // Ignore the ones inside our own footer.
      let external = 0;
      all.forEach((el) => {
        if (!el.closest("[data-page-cta-footer]")) external++;
      });
      setHasOwnCTA(external > 0);
    };
    check();
    const t = window.setTimeout(check, 600);
    return () => window.clearTimeout(t);
  }, []);

  if (!ctas.length || hasOwnCTA) return null;
  const [primary, ...secondary] = ctas;
  return (
    <section
      data-page-cta-footer
      className="mx-auto mt-16 mb-8 w-full max-w-2xl px-5"
      aria-label="Actions principales"
    >
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <p className="mb-4 text-center text-sm text-white/70">{headline}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <PrimaryCTA cta={primary} size="lg" />
          {secondary.map((c) => (
            <PrimaryCTA key={c} cta={c} size="lg" variant="secondary" />
          ))}
        </div>
      </div>
    </section>
  );
}
