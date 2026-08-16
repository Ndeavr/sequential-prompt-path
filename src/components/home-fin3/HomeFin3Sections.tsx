/**
 * HomeFin3Sections — Narrative sections for the "La fin des 3 soumissions" homepage.
 * Presentational only: every CTA points to an existing route/workflow.
 * Copy comes from src/lib/copy/homeFin3.ts (FR/EN), never hardcoded here.
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronRight } from "lucide-react";

import { useLanguage } from "@/components/ui/LanguageToggle";
import { useHomeFin3Copy } from "@/lib/copy/homeFin3";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { buildCheckoutUrl } from "@/lib/checkoutUrl";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative px-5 py-14 md:py-20 ${className}`}>
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </section>
  );
}

function useCopy() {
  const { lang } = useLanguage();
  return useHomeFin3Copy(lang);
}

/* ── 2. Problème ─────────────────────────────────────────────── */
export function SectionProblemeTroisSoumissions() {
  const c = useCopy().probleme;
  return (
    <Section>
      <Reveal>
        <h2 className="text-[clamp(1.6rem,5.2vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
          {c.title}
          <br />
          <span className="text-white/60">{c.titleAccent}</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/70">{c.body}</p>
      </Reveal>

      <Reveal delay={0.08}>
        <ol className="mt-8 flex flex-wrap items-center gap-2">
          {c.steps.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
                {step}
              </span>
              {i < c.steps.length - 1 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </Reveal>
    </Section>
  );
}

/* ── 3. Alex ─────────────────────────────────────────────────── */
export function SectionAlexUneQuestion() {
  const c = useCopy().alex;
  const { openAlex } = useAlexVoice();

  const start = () => {
    trackCopilotEvent("alex_started", { source: "home_section_alex" });
    openAlex("homeowner");
  };

  return (
    <Section className="border-t border-white/[0.06]">
      <Reveal>
        <h2 className="text-[clamp(1.6rem,5.2vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
          {c.title}
          <br />
          <span className="text-white/60">{c.titleAccent}</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/70">{c.body}</p>
      </Reveal>

      <Reveal delay={0.08}>
        <ul className="mt-7 flex flex-wrap gap-2">
          {c.dimensions.map((d) => (
            <li
              key={d}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-white/80"
            >
              {d}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] text-white/45">{c.note}</p>
        <button
          type="button"
          onClick={start}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#05070d] transition-transform duration-300 hover:-translate-y-0.5"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4" />
        </button>
      </Reveal>
    </Section>
  );
}

/* ── 4. Nouveau modèle ───────────────────────────────────────── */
export function SectionNouveauModele() {
  const c = useCopy().modele;
  return (
    <Section className="border-t border-white/[0.06]">
      <Reveal>
        <h2 className="text-[clamp(1.6rem,5.2vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
          {c.title}
          <br />
          <span className="text-white/60">{c.titleAccent}</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/70">{c.body}</p>
      </Reveal>

      <Reveal delay={0.08}>
        <p className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-8 text-center text-[clamp(1.3rem,4.6vw,2rem)] font-bold leading-tight tracking-[-0.03em] text-white backdrop-blur-xl">
          {c.statement}
        </p>
        <p className="mt-5 text-[15px] leading-relaxed text-white/70">{c.after}</p>
      </Reveal>
    </Section>
  );
}

/* ── 5. Pourquoi UNPRO peut recommander ──────────────────────── */
export function SectionPourquoiRecommander() {
  const c = useCopy().recommander;
  return (
    <Section className="border-t border-white/[0.06]">
      <Reveal>
        <h2 className="text-[clamp(1.6rem,5.2vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
          {c.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/70">{c.body}</p>
      </Reveal>

      <Reveal delay={0.06}>
        <ul className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {c.dimensions.map((d) => (
            <li key={d} className="flex items-center gap-2.5 text-[14px] text-white/80">
              <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              {d}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mt-9 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            {c.provenanceTitle}
          </p>
          <dl className="mt-4 space-y-3">
            {c.provenance.map((p) => (
              <div key={p.label} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                <dt className="w-32 shrink-0 text-[13px] font-bold text-white">{p.label}</dt>
                <dd className="text-[13px] leading-relaxed text-white/65">{p.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </Section>
  );
}

/* ── 6. Comparaison de soumissions ───────────────────────────── */
export function SectionComparerSoumissions() {
  const c = useCopy().comparaison;
  return (
    <Section className="border-t border-white/[0.06]">
      <Reveal>
        <h2 className="text-[clamp(1.6rem,5.2vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
          {c.title}
        </h2>
        <p className="mt-3 text-[15px] font-semibold text-white/80">{c.subtitle}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">{c.body}</p>
      </Reveal>

      <Reveal delay={0.08}>
        <ul className="mt-6 flex flex-wrap gap-2">
          {c.items.map((i) => (
            <li
              key={i}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] text-white/80"
            >
              {i}
            </li>
          ))}
        </ul>
        <Link
          to="/analyse-soumissions/importer"
          onClick={() => {
            trackCopilotEvent("quote_comparison_started", { source: "home_section_compare" });
          }}
          className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-bold text-white transition-transform duration-300 hover:-translate-y-0.5"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </Section>
  );
}

/* ── 7. Passeport Maison ─────────────────────────────────────── */
export function SectionPasseportMaison() {
  const c = useCopy().passeport;
  return (
    <Section className="border-t border-white/[0.06]">
      <Reveal>
        <h2 className="text-[clamp(1.6rem,5.2vw,2.4rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
          {c.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/70">{c.body}</p>
        <Link
          to="/proprietaires/passeport-maison"
          onClick={() => trackCopilotEvent("passport_cta_clicked", { source: "home_section_passport" })}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-bold text-white transition-transform duration-300 hover:-translate-y-0.5"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </Section>
  );
}

/* ── 8. Entrepreneurs ────────────────────────────────────────── */
export function SectionEntrepreneursEntree() {
  const c = useCopy().entrepreneurs;
  return (
    <Section className="border-t border-white/[0.06]">
      <Reveal>
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-8">
          <h2 className="text-[clamp(1.4rem,4.6vw,2rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
            {c.title}
          </h2>
          <p className="mt-3 text-[15px] font-semibold text-white/80">{c.subtitle}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/65">{c.body}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/entrepreneur"
              onClick={() => trackCopilotEvent("contractor_entry_click", { source: "home_section_contractor" })}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#05070d] transition-transform duration-300 hover:-translate-y-0.5"
            >
              {c.ctaPrimary}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={buildCheckoutUrl()}
              onClick={() =>
                trackCopilotEvent("contractor_1_dollar_activation_click", {
                  source: "home_section_contractor",
                })
              }
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-bold text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              {c.ctaSecondary}
            </a>
          </div>
          <p className="mt-3 text-[12px] text-white/45">{c.note}</p>
        </div>
      </Reveal>
    </Section>
  );
}

/* ── 9. CTA final ────────────────────────────────────────────── */
export function SectionCtaFinal() {
  const c = useCopy().final;
  const { openAlex } = useAlexVoice();

  const start = () => {
    trackCopilotEvent("hero_find_pro_click", { source: "home_final_cta" });
    trackCopilotEvent("alex_started", { source: "home_final_cta" });
    openAlex("homeowner");
  };

  return (
    <Section className="border-t border-white/[0.06] text-center">
      <Reveal>
        <h2 className="text-[clamp(1.8rem,6vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.04em] text-white">
          {c.title}
          <br />
          <span className="text-white/60">{c.titleAccent}</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/70">{c.body}</p>
        <button
          type="button"
          onClick={start}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#05070d] transition-transform duration-300 hover:-translate-y-0.5"
        >
          {c.cta}
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-white/35">{c.signature}</p>
      </Reveal>
    </Section>
  );
}
