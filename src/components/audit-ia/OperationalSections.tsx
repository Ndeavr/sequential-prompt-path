/**
 * UNPRO — Audit IA operational sections (A–F).
 * Premium operational-dashboard feel on the white canvas:
 *   A. Real plan catalog (from the canonical pricing config — never invented)
 *   B. Entrepreneur dashboard preview (real counts only, otherwise Pending)
 *   C. Appointment journey mapped to real booking states
 *   D. AI acquisition / attribution (operator context, zero-human-touch proof)
 *   E. Compliance & security (only controls that really exist)
 *   F. System status (live health action — nothing marked operational unchecked)
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Check,
  CircleDollarSign,
  ClipboardList,
  Eye,
  Gauge,
  Handshake,
  Inbox,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CONTRACTOR_PLANS, formatPrice } from "@/config/pricing";
import { OFFER_350 } from "@/lib/copy/offer350";

/* ------------------------------------------------------------------ hooks */
type HealthStatus = "operational" | "configured" | "unavailable" | "checking";
interface HealthCheck {
  status: HealthStatus;
  detail: string;
}

function useSystemHealth() {
  const [checks, setChecks] = useState<Record<string, HealthCheck> | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void supabase.functions
      .invoke("ai-recommendation-audit", { body: { action: "health" } })
      .then(({ data }) => {
        if (cancelled || !(data as any)?.ok) return;
        setChecks((data as any).checks ?? null);
        setCheckedAt((data as any).checked_at ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { checks, checkedAt };
}

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
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-10 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-[22px] font-bold leading-tight text-foreground sm:text-[26px]" style={{ letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatusPill({ status }: { status: HealthStatus }) {
  if (status === "operational")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-[hsl(152_69%_31%/0.08)] px-2 py-0.5 text-[10.5px] font-semibold text-success">
        <Check className="h-3 w-3" aria-hidden /> Opérationnel
      </span>
    );
  if (status === "configured")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-secondary px-2 py-0.5 text-[10.5px] font-semibold text-secondary-foreground">
        Configuré
      </span>
    );
  if (status === "checking")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
        Vérification…
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
      En attente
    </span>
  );
}

/* ------------------------------------------------------------- A. Plans */
function PlansSection() {
  return (
    <SectionShell id="forfaits" eyebrow="A — L'offre entrepreneur" title="Des forfaits réels, des rendez-vous exclusifs">
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
    <SectionShell eyebrow="B — Votre tableau de bord" title="Chaque chiffre est réel — ou affiché « En attente »">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ label, Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden />
              <p className="text-[11.5px] font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-3 text-[24px] font-bold leading-none tabular-nums text-muted-foreground">—</p>
            <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">En attente d'activation</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Vos données réelles (vues, demandes, rendez-vous, taux de réponse) apparaissent ici après l'activation.
        UNPRO n'affiche jamais de statistiques simulées.
      </p>
    </SectionShell>
  );
}

/* ------------------------------------------------- C. Appointment path */
const APPOINTMENT_JOURNEY = [
  { label: "Demande reçue", state: "booking_requested", Icon: Inbox },
  { label: "Proposition de créneaux", state: "slots_proposed", Icon: ClipboardList },
  { label: "Rendez-vous confirmé", state: "booking_confirmed", Icon: CalendarCheck },
  { label: "Visite effectuée", state: "visit_completed", Icon: Check },
  { label: "Client converti", state: "client_converted", Icon: Handshake },
] as const;

function AppointmentJourneySection() {
  return (
    <SectionShell eyebrow="C — Le parcours d'un rendez-vous" title="De la demande au client converti">
      <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" aria-label="Parcours d'un rendez-vous">
        {APPOINTMENT_JOURNEY.map((s, i) => (
          <li key={s.state} className="relative rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-secondary text-[12px] font-bold tabular-nums text-secondary-foreground">
              {i + 1}
            </span>
            <div className="mt-2.5 flex items-center gap-2">
              <s.Icon className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-[13.5px] font-semibold leading-tight text-foreground">{s.label}</p>
            </div>
            <p className="mt-1 text-[10.5px] uppercase tracking-wide text-muted-foreground">{s.state}</p>
            {i < APPOINTMENT_JOURNEY.length - 1 && (
              <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-primary lg:block" aria-hidden />
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[12.5px] text-muted-foreground">
        Chaque étape correspond à un état réel suivi dans UNPRO — aucune étape n'est décorative.
      </p>
    </SectionShell>
  );
}

/* ------------------------------------------- D. AI attribution (operator) */
function AttributionSection() {
  const rows = [
    { label: "Sélectionnés par l'IA", value: "Suivi réel", Icon: Sparkles },
    { label: "Messages envoyés / livrés", value: "Suivi réel", Icon: MessageSquareText },
    { label: "Audits ouverts", value: "Suivi réel", Icon: Eye },
    { label: "Checkouts créés", value: "Suivi réel", Icon: CircleDollarSign },
  ];
  return (
    <SectionShell eyebrow="D — Acquisition IA · attribution" title="La preuve « zéro intervention humaine »">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {rows.map(({ label, value, Icon }) => (
            <div key={label} className="rounded-xl border border-border bg-muted/50 p-3.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-secondary/60 px-4 py-3">
          <p className="text-[13px] font-semibold text-foreground">
            Revenus attribués à l'agent IA : <span className="tabular-nums">0 $ CAD</span>
            <span className="ml-2 text-[11.5px] font-medium text-muted-foreground">en attente du premier paiement attribué</span>
          </p>
          <Link
            to="/admin/ai-revenue-proof"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Centre de contrôle opérateur <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          Chaque conversion est scellée avec son attribution d'agent IA. Aucun revenu n'est comptabilisé sans
          preuve de bout en bout.
        </p>
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------- E. Compliance */
const COMPLIANCE_CONTROLS = [
  "Consentement et désabonnement (CASL) sur chaque envoi",
  "Déduplication des prospects et fenêtres anti-renvoi",
  "Limites de fréquence et plages d'envoi contrôlées",
  "Données protégées par politiques d'accès (RLS)",
  "Chaque fait affiché porte sa provenance : Vérifié, Déclaré, Déduit ou En attente",
] as const;

function ComplianceSection() {
  return (
    <SectionShell eyebrow="E — Conformité et sécurité" title="Des contrôles réels, pas des promesses">
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {COMPLIANCE_CONTROLS.map((c) => (
          <li key={c} className="flex items-start gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
              <Check className="h-3 w-3" aria-hidden />
            </span>
            <p className="text-[13px] leading-relaxed text-foreground/90">{c}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

/* ---------------------------------------------------- F. System status */
const SYSTEM_ROWS: Array<{ key: string; label: string; Icon: typeof Activity }> = [
  { key: "audit_ia", label: "Audit IA", Icon: Sparkles },
  { key: "capacity", label: "Capacité territoriale", Icon: Gauge },
  { key: "attribution_ia", label: "Attribution IA", Icon: Activity },
  { key: "stripe", label: "Checkout Stripe", Icon: CircleDollarSign },
  { key: "sms", label: "Suivi SMS", Icon: MessageSquareText },
  { key: "email", label: "Suivi courriel", Icon: Mail },
];

function SystemStatusSection() {
  const { checks, checkedAt } = useSystemHealth();
  return (
    <SectionShell eyebrow="F — Statut du système" title="Vérifié en direct, jamais assumé">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {SYSTEM_ROWS.map(({ key, label, Icon }) => {
          const c = checks?.[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-foreground">{label}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{c?.detail ?? "Vérification en cours…"}</p>
                </div>
              </div>
              <StatusPill status={c?.status ?? "checking"} />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">
        {checkedAt
          ? `Dernière vérification réelle : ${new Date(checkedAt).toLocaleString("fr-CA")}.`
          : "Vérification en cours auprès des systèmes UNPRO."}{" "}
        Un statut « Opérationnel » n'est affiché qu'après un contrôle réel.
      </p>
    </SectionShell>
  );
}

export function OperationalSections() {
  return (
    <div className="border-t border-border bg-[hsl(var(--surface-secondary))]">
      <PlansSection />
      <DashboardSection />
      <AppointmentJourneySection />
      <AttributionSection />
      <ComplianceSection />
      <SystemStatusSection />
    </div>
  );
}
