/**
 * UNPRO — Registry template (page_type: contractor_registry).
 * The single official rendering surface for /pro/:slug, /entrepreneur/:slug.
 * Never mix with recommendation or reasoning templates.
 */
import { Helmet } from "react-helmet-async";
import LogoResolver from "../logo/LogoResolver";
import IntelligentPlaceholder from "../media/IntelligentPlaceholder";
import { resolveGallerySlots } from "../media/mediaContract";
import { selectHeroImage } from "../media/heroSelector";
import ContractorSchemaStack from "@/seo/components/ContractorSchemaStack";
import SafeImage from "@/components/media/SafeImage";
import type { ContractorPageInput } from "../generator/pageTypes";
import { normalizeContractorName } from "@/lib/brand/canonicalContractor";

interface Props {
  input: ContractorPageInput;
  tradeSlug?: string;
}

export default function RegistryTemplate({ input, tradeSlug }: Props) {
  const canonicalName = normalizeContractorName(input.business_name);
  const hero = selectHeroImage(input.gallery, tradeSlug);
  const slots = resolveGallerySlots(input.gallery);
  const breadcrumbs = [
    { name: "UNPRO", url: "https://unpro.ca/" },
    { name: "Entrepreneurs", url: "https://unpro.ca/entrepreneurs" },
    { name: canonicalName, url: input.canonical_url },
  ];

  return (
    <>
      <Helmet>
        <html lang={input.language} />
        <title>{`${canonicalName} — ${input.hero.tagline}`}</title>
        <meta name="description" content={input.description.slice(0, 155)} />
        <link rel="canonical" href={input.canonical_url} />
      </Helmet>

      <ContractorSchemaStack input={{ ...input, business_name: canonicalName }} breadcrumbs={breadcrumbs} />

      <article className="alex-immersive min-h-screen text-white">
        <header className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <LogoResolver logo={input.logo} businessName={canonicalName} size={112} priority="eager" />
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80 mb-2">
              Registre Intelligent UNPRO
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.02]">
              {canonicalName}
            </h1>
            {input.legal_name && input.legal_name !== canonicalName && (
              <p className="text-white/60 text-sm mt-1">{input.legal_name}</p>
            )}
            <p className="text-white/80 mt-3 text-sm sm:text-base">{input.hero.tagline}</p>
          </div>
        </header>

        {hero && (
          <div className="mx-auto max-w-5xl px-4">
            <SafeImage
              src={hero.url}
              alt={hero.alt}
              aspectRatio="16/9"
              priority="eager"
              source="RegistryHero"
              containerClassName="rounded-3xl border border-white/10"
            />
          </div>
        )}

        <section className="mx-auto max-w-5xl px-4 py-10 grid gap-4 sm:grid-cols-3">
          <InfoCard label="Territoire" value={input.hero.territories.join(" · ")} />
          <InfoCard label="Téléphone" value={input.hero.phone} />
          <InfoCard label="Site officiel" value={input.hero.website ?? "—"} />
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <a
              href="#evaluation"
              className="inline-flex items-center justify-center rounded-[18px] bg-amber-300 px-6 py-3.5 text-sm font-semibold text-[#050816] hover:-translate-y-0.5 transition-all duration-[420ms] shadow-[0_20px_60px_-20px_rgba(251,191,36,0.5)]"
            >
              {input.ctas.book_appointment}
            </a>
            <a href="#alex" className="inline-flex items-center justify-center rounded-[18px] border border-white/15 px-6 py-3.5 text-sm text-white hover:bg-white/5 transition">
              {input.ctas.alex}
            </a>
            <a href="#evaluation" className="inline-flex items-center justify-center rounded-[18px] border border-white/15 px-6 py-3.5 text-sm text-white hover:bg-white/5 transition">
              {input.ctas.evaluation}
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8">
          <h2 className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">À propos</h2>
          <p className="text-white/85 leading-relaxed">{input.description}</p>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8">
          <h2 className="text-xs uppercase tracking-[0.25em] text-white/60 mb-4">Galerie</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((slot) =>
              slot.isPlaceholder || !slot.asset ? (
                <IntelligentPlaceholder key={slot.category} category={slot.category} businessName={canonicalName} />
              ) : (
                <SafeImage
                  key={slot.category}
                  src={slot.asset.url}
                  alt={slot.asset.alt}
                  aspectRatio="4/3"
                  source={`RegistryGallery:${slot.category}`}
                  containerClassName="rounded-2xl border border-white/10"
                />
              ),
            )}
          </div>
        </section>

        {input.faqs.length > 0 && (
          <section className="mx-auto max-w-5xl px-4 py-8">
            <h2 className="text-xs uppercase tracking-[0.25em] text-white/60 mb-4">Questions fréquentes</h2>
            <div className="space-y-3">
              {input.faqs.map((f, i) => (
                <details key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <summary className="text-sm font-medium cursor-pointer">{f.question}</summary>
                  <p className="mt-2 text-sm text-white/75">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">{label}</div>
      <div className="text-sm text-white/90">{value}</div>
    </div>
  );
}
