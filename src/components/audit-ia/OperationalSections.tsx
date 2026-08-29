/**
 * UNPRO — Audit IA : sections publiques.
 *
 * Hiérarchie : valeur de l'audit → vidéo → ce que l'entrepreneur obtient →
 * offre canonique unique (OFFER_350, la seule source alimentant le vrai
 * checkout) → FAQ courte → CTA final.
 *
 * Interdit ici : grille historique de forfaits mensuels, variantes de prix,
 * mécanique interne (attribution, événements, fournisseurs, infrastructure).
 */
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  Check,
  Handshake,
  Inbox,
  ListChecks,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { OFFER_350 } from "@/lib/copy/offer350";
import { AuditVideoBlock } from "./AuditVideoBlock";

/* --------------------------------------------------------------- helpers */
function SectionShell({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2
        className="mt-2 max-w-3xl text-[22px] font-bold leading-tight text-foreground sm:text-[28px]"
        style={{ letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      {intro && (
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">{intro}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/* -------------------------------------------------- A. Valeur de l'audit */
const AUDIT_VALUE = [
  {
    Icon: ScanSearch,
    title: "Ce que l'IA comprend déjà",
    body: "Métier, territoire, services et signaux de confiance réellement associés à votre entreprise.",
  },
  {
    Icon: Brain,
    title: "Vos forces et vos lacunes",
    body: "Les informations qui vous rendent crédible et celles qui manquent encore pour être considéré.",
  },
  {
    Icon: ListChecks,
    title: "Vos prochaines actions",
    body: "Les étapes prioritaires, classées par impact, pour devenir admissible aux recommandations UNPRO.",
  },
] as const;

function AuditValueSection() {
  return (
    <SectionShell
      eyebrow="Ce que révèle l'audit"
      title="Voyez votre entreprise exactement comme l'IA la comprend"
      intro="L'audit est gratuit et basé uniquement sur des informations réelles. Aucun avis, aucune licence, aucun chiffre inventé."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {AUDIT_VALUE.map(({ Icon, title, body }) => (
          <article key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
            <h3 className="mt-3 text-[15.5px] font-bold leading-snug text-foreground">{title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------- B. Ce que vous obtenez */
const APPOINTMENT_JOURNEY = [
  { label: "Demande reçue", hint: "Un propriétaire décrit son projet", Icon: Inbox },
  { label: "Vos disponibilités", hint: "Vous proposez vos moments", Icon: CalendarCheck },
  { label: "Rendez-vous confirmé", hint: "Une seule entreprise : la vôtre", Icon: Check },
  { label: "Visite", hint: "Vous rencontrez le client", Icon: Handshake },
] as const;

function WhatYouGetSection() {
  return (
    <SectionShell
      eyebrow="Ce que vous obtenez"
      title="Des rendez-vous exclusifs, jamais des leads partagés"
      intro="Une demande qualifiée. Un entrepreneur. Vous rencontrez le client, pas quatre concurrents."
    >
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Parcours d'un rendez-vous">
        {APPOINTMENT_JOURNEY.map((s, i) => (
          <li key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-secondary text-[12px] font-bold tabular-nums text-secondary-foreground">
              {i + 1}
            </span>
            <div className="mt-3 flex items-center gap-2">
              <s.Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p className="text-[14px] font-semibold leading-tight text-foreground">{s.label}</p>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.hint}</p>
          </li>
        ))}
      </ol>
      <p className="mt-5 inline-flex items-start gap-2 rounded-2xl border border-primary/30 bg-secondary/60 px-4 py-3 text-[13px] font-semibold text-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        UNPRO ne fabrique jamais un avis, une licence, une vérification ou un rendez-vous.
      </p>
    </SectionShell>
  );
}

/* ---------------------------------------------- C. Offre canonique unique */
function OfferSection() {
  return (
    <SectionShell
      id="forfaits"
      eyebrow="L'offre entrepreneur"
      title={OFFER_350.card.title}
      intro={OFFER_350.subtitle}
    >
      <div className="mx-auto w-full max-w-xl rounded-[24px] border border-primary/40 bg-card p-6 shadow-md sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {OFFER_350.card.eyebrow}
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-[40px] font-bold leading-none tracking-tight text-foreground">
            {OFFER_350.price_label}
          </span>
          <span className="pb-1.5 text-[13px] text-muted-foreground">{OFFER_350.paymentNote}</span>
        </div>

        <ul className="mt-5 space-y-2">
          {OFFER_350.card.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-foreground/85">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <Link
          to="/entrepreneurs/garantie"
          className="gold-btn mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
        >
          {OFFER_350.ctaCalculate}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>

        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          {OFFER_350.disclaimer}
        </p>
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------------------- D. FAQ */
const FAQ = [
  {
    q: "L'audit est-il vraiment gratuit ?",
    a: "Oui. Aucune carte de crédit, aucun engagement. Vous voyez votre score et vos prochaines actions immédiatement.",
  },
  {
    q: "D'où viennent les informations affichées ?",
    a: "Uniquement de sources réelles associées à votre entreprise. Chaque élément est étiqueté Vérifié, Déclaré, Déduit ou En attente.",
  },
  {
    q: "Est-ce que UNPRO garantit une position dans ChatGPT ?",
    a: "Non. Aucune plateforme d'IA ne vend de classement. UNPRO structure et vérifie votre profil pour vous rendre admissible aux recommandations UNPRO.",
  },
  {
    q: "Est-ce un abonnement ?",
    a: `Non. ${OFFER_350.paymentNote} ${OFFER_350.disclaimer}`,
  },
] as const;

function FaqSection() {
  return (
    <SectionShell eyebrow="Questions fréquentes" title="Ce que les entrepreneurs demandent">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-3">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <summary className="cursor-pointer list-none text-[14.5px] font-semibold text-foreground marker:hidden">
              {q}
            </summary>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

/* ---------------------------------------------------------- E. CTA final */
function FinalCtaSection({ onAuditClick }: { onAuditClick?: () => void }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <div className="rounded-[24px] border border-border bg-card p-6 text-center shadow-sm sm:p-9">
        <h2 className="text-[21px] font-bold leading-tight text-foreground sm:text-[26px]" style={{ letterSpacing: "-0.02em" }}>
          Découvrez comment l'IA comprend votre entreprise
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
          Gratuit, environ 60 secondes, aucun engagement.
        </p>
        <button
          type="button"
          onClick={onAuditClick}
          className="gold-btn mx-auto mt-6 inline-flex h-12 items-center gap-2 rounded-2xl px-7 text-[15px] font-bold transition-transform hover:-translate-y-0.5"
        >
          Découvrir mon score IA
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}

export function OperationalSections({ onAuditClick }: { onAuditClick?: () => void } = {}) {
  return (
    <div className="border-t border-border bg-[hsl(var(--surface-secondary))]">
      <AuditValueSection />
      <AuditVideoBlock />
      <WhatYouGetSection />
      <OfferSection />
      <FaqSection />
      <FinalCtaSection onAuditClick={onAuditClick} />
    </div>
  );
}
