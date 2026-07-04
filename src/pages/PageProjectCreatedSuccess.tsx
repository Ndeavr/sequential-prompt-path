/**
 * PageProjectCreatedSuccess — success screen after project creation.
 * Displays demand context and routes user to next canonical step.
 */
import { useSearchParams, Link } from "react-router-dom";
import PageShell from "@/layouts/PageShell";
import PrimaryCTA from "@/components/cta/PrimaryCTA";

export default function PageProjectCreatedSuccess() {
  const [params] = useSearchParams();
  const projectId = params.get("id") ?? "";
  const hasMatches = params.get("matches") === "1";

  return (
    <PageShell id="project-created" variant="app" cta={false}>
      <section className="mx-auto max-w-2xl px-5 pt-16 pb-8 text-white">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Projet reçu
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Votre projet est enregistré.
          </h1>
          <p className="mt-3 text-white/70">
            Nous analysons la demande locale et identifions les entrepreneurs
            compatibles dans votre région.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
              <dt className="text-xs uppercase tracking-wide text-white/50">Statut</dt>
              <dd className="mt-1 text-lg font-medium">Demande détectée</dd>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
              <dt className="text-xs uppercase tracking-wide text-white/50">Suivi</dt>
              <dd className="mt-1 text-lg font-medium">Alex vous guide</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {hasMatches ? (
              <PrimaryCTA cta="book" size="lg" label="Voir mes recommandations" />
            ) : (
              <Link
                to={`/waiting${projectId ? `?project=${projectId}` : ""}`}
                data-cta-canonical="book"
                className="inline-flex h-14 items-center justify-center rounded-[18px] bg-white px-8 font-medium text-black transition-all hover:-translate-y-[2px]"
              >
                Suivre ma demande
              </Link>
            )}
            <PrimaryCTA cta="alex" size="lg" variant="secondary" label="Continuer avec Alex" />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
