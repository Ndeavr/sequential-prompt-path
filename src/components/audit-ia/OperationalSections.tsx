/**
 * UNPRO — Audit IA public sections.
 *
 * PUBLIC = bénéfices + confiance + preuves utiles au prospect.
 * Toute la mécanique interne (attribution, événements techniques, conformité
 * détaillée, statut d'infrastructure, fournisseurs) reste côté Centre de
 * contrôle opérateur — jamais exposée ici.
 */
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Check,
  Eye,
  Gauge,
  Handshake,
  Inbox,
  ShieldCheck,
} from "lucide-react";
import { CONTRACTOR_PLANS, formatPrice } from "@/config/pricing";
import { OFFER_350 } from "@/lib/copy/offer350";

/* --------------------------------------------------------------- helpers */
function SectionShell({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-[21px] font-bold leading-tight text-foreground sm:text-[26px]" style={{ letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------- A. Plans */
function PlansSection() {
  return (
    <SectionShell id="forfaits" eyebrow="L'offre entrepreneur" title="Des rendez-vous exclusifs, jamais de leads partagés">
      <div className="rounded-2xl border border-primary/35 bg-secondary/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[15px] font-bold text-foreground">{OFFER_350.card.title}</p>
          <p className="text-[13px] font-semibold text-secondary-foreground">{OFFER_350.card.eyebrow} — {OFFER_350.paymentNote}</p>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{OFFER_350.disclaimer}</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONTRACTOR_PLANS.map((p) => (
          <article
            key={p.slug}
            className={`flex flex-col rounded-2xl border p-4 shadow-sm ${
              p.featured ? "border-primary/50 bg-card ring-1 ring-primary/25" : "border-border bg-card"
            }`}
          >
            {p.eyebrow && (
              <span className="mb-2 inline-flex w-fit items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                {p.eyebrow}
              </span>
            )}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[16px] font-bold text-foreground">{p.name}</h3>
              <p className="text-[16px] font-bold tabular-nums text-foreground">
                {formatPrice(p.monthlyPrice)}
                <span className="text-[11px] font-medium text-muted-foreground"> /mois</span>
              </p>
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{p.subtitle}</p>
            <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
              <CalendarCheck className="h-3 w-3 text-primary" aria-hidden />
              {p.appointmentsIncluded > 0 ? `${p.appointmentsIncluded} rendez-vous inclus / mois` : "Profil vérifié, sans rendez-vous inclus"}
            </p>
            <ul className="mt-3 flex-1 space-y-1.5">
              {p.features.slice(0, 3).map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] text-foreground/85">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/entrepreneurs/garantie"
              className={`mt-4 inline-flex h-10 items-center justify-center rounded-xl text-[13px] font-semibold transition-transform hover:-translate-y-0.5 ${
                p.featured ? "gold-btn" : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {p.cta}
            </Link>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

/* --------------------------------------------------------- B. Dashboard */
function DashboardSection() {
  const tiles = [
    { label: "Vues du profil", Icon: Eye },
    { label: "Demandes reçues", Icon: Inbox },
    { label: "Rendez-vous confirmés", Icon: CalendarCheck },
    { label: "Taux de réponse", Icon: Gauge },
  ];
  return (
    <SectionShell eyebrow="Votre tableau de bord" title="Suivez vos vrais résultats">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ label, Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden />
              <p className="text-[11.5px] font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-3 text-[24px] font-bold leading-none tabular-nums text-muted-foreground">—</p>
            <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">Après votre activation</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Vos chiffres apparaissent ici après l'activation. UNPRO n'affiche jamais de statistiques simulées.
      </p>
    </SectionShell>
  );
}

/* ------------------------------------------------- C. Appointment path */
const APPOINTMENT_JOURNEY = [
  { label: "Demande reçue", hint: "Un propriétaire décrit son projet", Icon: Inbox },
  { label: "Vos disponibilités", hint: "Vous proposez vos moments", Icon: CalendarCheck },
  { label: "Rendez-vous confirmé", hint: "Une seule entreprise : la vôtre", Icon: Check },
  { label: "Visite", hint: "Vous rencontrez le client", Icon: Handshake },
] as const;

function AppointmentJourneySection() {
  return (
    <SectionShell eyebrow="Le parcours d'un rendez-vous" title="De la demande au client rencontré">
      <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Parcours d'un rendez-vous">
        {APPOINTMENT_JOURNEY.map((s, i) => (
          <li key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-secondary text-[12px] font-bold tabular-nums text-secondary-foreground">
              {i + 1}
            </span>
            <div className="mt-2.5 flex items-center gap-2">
              <s.Icon className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-[13.5px] font-semibold leading-tight text-foreground">{s.label}</p>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{s.hint}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Une demande qualifiée. Un entrepreneur. Jamais un lead partagé entre plusieurs entrepreneurs.
      </p>
    </SectionShell>
  );
}

/* --------------------------------------------- D. Trust (commercial) */
const TRUST_ITEMS = [
  "Informations de l'entreprise",
  "Services offerts",
  "Territoires desservis",
  "Éléments de confiance",
  "Compatibilité avec les demandes",
] as const;

function TrustSection() {
  return (
    <SectionShell eyebrow="Confiance" title="Des recommandations basées sur de vraies informations">
      <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
        UNPRO vérifie continuellement les informations utilisées pour mieux comprendre et recommander les
        entreprises.
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {TRUST_ITEMS.map((c) => (
          <li key={c} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="h-3 w-3" aria-hidden />
            </span>
            <p className="text-[13px] font-medium leading-snug text-foreground">{c}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-primary/30 bg-secondary/60 px-4 py-3 text-[13px] font-semibold text-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        UNPRO ne fabrique jamais un avis, une licence, une vérification ou un rendez-vous.
      </p>
    </SectionShell>
  );
}

export function OperationalSections() {
  return (
    <div className="border-t border-border bg-[hsl(var(--surface-secondary))]">
      <PlansSection />
      <AppointmentJourneySection />
      <TrustSection />
      <DashboardSection />
    </div>
  );
}
