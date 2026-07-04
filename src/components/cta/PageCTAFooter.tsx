/**
 * PageCTAFooter — inline CTA block auto-injected by <PageShell> when a page
 * does not declare its own primary action. Guarantees every page has at
 * least one canonical CTA above the fixed mobile dock.
 */
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
  if (!ctas.length) return null;
  const [primary, ...secondary] = ctas;
  return (
    <section
      data-page-cta-footer
      className="mx-auto mt-16 mb-8 w-full max-w-2xl px-5"
      aria-label="Actions principales"
    >
      <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6 backdrop-blur-xl">
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
