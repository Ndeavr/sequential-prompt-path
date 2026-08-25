/**
 * PageAffiliesPublic — Landing publique du programme affilié UNPRO.
 * Route: /affilies (publique, partageable)
 * Objectif : compréhension < 30 s → CTA « JE COMMENCE! » → onboarding 4 étapes.
 * Aucun taux affiché (le taux est propre à chaque affiliée) — mécanismes réels seulement.
 */
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Search,
  PhoneCall,
  Sparkles,
  ListChecks,
  Handshake,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { UnproLogo } from "@/components/brand/UnproLogo";
import { trackAffiliateFunnel } from "@/features/affiliate/onboarding/trackAffiliateFunnel";

const STEPS = [
  {
    n: 1,
    icon: Search,
    title: "Trouvez",
    body: "UNPRO vous propose des entrepreneurs à contacter, un à la fois. Vous pouvez aussi ajouter les vôtres.",
  },
  {
    n: 2,
    icon: PhoneCall,
    title: "Contactez",
    body: "Un appel court, un texto ou un courriel. Votre objectif n'est pas de vendre : c'est d'ouvrir la porte.",
    script: true,
  },
  {
    n: 3,
    icon: Sparkles,
    title: "Envoyez l'évaluation IA",
    body: "En un toucher, l'entrepreneur reçoit un lien unique vers son évaluation personnalisée.",
    discoveries: true,
  },
  {
    n: 4,
    icon: ListChecks,
    title: "Suivez",
    body: "Vous voyez en temps réel où en est chaque entrepreneur : Envoyée → Ouverte → Commencée → Terminée.",
  },
  {
    n: 5,
    icon: Handshake,
    title: "UNPRO prend la relève",
    body: "Dès que l'évaluation est terminée, UNPRO accompagne l'entrepreneur jusqu'à son inscription.",
    takeover: true,
  },
];

const DISCOVERIES = [
  "Sa visibilité réelle dans les recherches IA",
  "Ses forces et ses angles morts",
  "Son potentiel de revenus dans son territoire",
  "Le plan UNPRO adapté à sa capacité",
  "Ses prochaines actions concrètes",
];

const TAKEOVER = ["Évaluation", "Profil", "Objectifs", "Solution", "Inscription"];

const FAQ = [
  {
    q: "Est-ce que je dois vendre ?",
    a: "Non. Vous ouvrez la porte et envoyez l'évaluation. UNPRO fait la démonstration, l'accompagnement et l'inscription.",
  },
  {
    q: "Comment suis-je payée ?",
    a: "Quand un entrepreneur que vous avez référé devient client payant, une commission vous est attribuée. Votre taux exact est confirmé dans votre espace dès l'activation.",
  },
  {
    q: "Combien de temps mon lien reste-t-il valide ?",
    a: "Un entrepreneur qui s'inscrit dans les 30 jours suivant votre envoi vous est attribué.",
  },
  {
    q: "Puis-je ajouter mes propres contacts ?",
    a: "Oui. Vous pouvez utiliser les prospects proposés par UNPRO ou ajouter les entrepreneurs que vous connaissez déjà.",
  },
];

export default function PageAffiliesPublic() {
  const location = useLocation();

  useEffect(() => {
    trackAffiliateFunnel("affiliate_landing_view");
  }, []);

  const startHref = `/affilies/onboarding${location.search}`;

  return (
    <div className="landing-warm min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Programme affilié UNPRO — Vous ouvrez la porte. UNPRO fait le reste.</title>
        <meta
          name="description"
          content="Recommandez des entrepreneurs à UNPRO : trouvez, contactez, envoyez l'évaluation IA, suivez. UNPRO prend la relève et vous êtes payée sur chaque inscription."
        />
        <meta property="og:title" content="Programme affilié UNPRO" />
        <meta
          property="og:description"
          content="Trouvez un entrepreneur, envoyez son évaluation IA, UNPRO prend la relève. Vous êtes payée sur chaque inscription."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Header */}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link to="/" aria-label="UNPRO">
          <UnproLogo variant="primary" className="h-7 w-auto" />
        </Link>
        <Link
          to="/affiliate/login"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
        >
          Déjà affiliée ? Connexion
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-40">
        {/* Hero */}
        <section className="pt-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Programme affilié UNPRO
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Vous ouvrez la porte.
            <br />
            <span className="text-primary">UNPRO fait le reste.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Recommandez des entrepreneurs du Québec. UNPRO les évalue, les accompagne et les inscrit.
            Vous êtes payée sur chaque inscription.
          </p>
          <Link
            to={startHref}
            onClick={() => trackAffiliateFunnel("affiliate_start_clicked", { metadata: { position: "hero" } })}
            className="mt-8 inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
          >
            JE COMMENCE! <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">4 étapes. 2 minutes. Aucune carte requise.</p>
        </section>

        {/* Parcours 5 étapes */}
        <section className="mt-16 space-y-4">
          {STEPS.map((s) => (
            <article
              key={s.n}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-base font-extrabold text-primary-foreground">
                  {s.n}
                </span>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <s.icon className="h-5 w-5 text-primary" /> {s.title}
                </h2>
              </div>
              <p className="mt-3 leading-relaxed text-muted-foreground">{s.body}</p>

              {s.script && (
                <div className="mt-4 rounded-2xl bg-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ce que vous dites, en gros
                  </p>
                  <p className="mt-2 text-sm italic leading-relaxed">
                    « Allô, c'est [votre prénom]. Je travaille avec UNPRO — on a préparé une évaluation
                    gratuite de votre visibilité en ligne. Ça prend 3 minutes. Je vous envoie le lien ? »
                  </p>
                </div>
              )}

              {s.discoveries && (
                <ul className="mt-4 space-y-2">
                  {DISCOVERIES.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}

              {s.takeover && (
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {TAKEOVER.map((t, i) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{t}</span>
                      {i < TAKEOVER.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>

        {/* Rémunération — mécanismes réels, aucun taux public */}
        <section className="mt-16 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Comment vous êtes payée</h2>
          <ul className="mt-5 space-y-4">
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed">
                <strong>Attribution claire.</strong> Chaque entrepreneur que vous contactez est lié à
                votre compte. S'il devient client payant, la commission vous revient.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed">
                <strong>Fenêtre de 30 jours.</strong> Une inscription dans les 30 jours suivant votre
                envoi vous est attribuée.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed">
                <strong>Suivi transparent.</strong> Prospects contactés, évaluations envoyées, ouvertes,
                terminées, inscriptions et commissions : tout est visible dans votre espace.
              </p>
            </li>
          </ul>
          <p className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            Votre taux de commission exact est confirmé dans votre espace dès l'activation — il est
            propre à chaque affiliée.
          </p>
        </section>

        {/* CTA intermédiaire */}
        <section className="mt-12 text-center">
          <Link
            to={startHref}
            onClick={() => trackAffiliateFunnel("affiliate_start_clicked", { metadata: { position: "mid" } })}
            className="inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
          >
            JE COMMENCE! <ArrowRight className="h-5 w-5" />
          </Link>
        </section>

        {/* FAQ */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold">Questions fréquentes</h2>
          <div className="mt-5 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer text-base font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {/* CTA fixe */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Link
            to={startHref}
            onClick={() => trackAffiliateFunnel("affiliate_start_clicked", { metadata: { position: "sticky" } })}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-lg"
          >
            JE COMMENCE! <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
