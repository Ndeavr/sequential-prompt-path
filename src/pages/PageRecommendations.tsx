/**
 * PageRecommendations — révèle l'unique recommandation réellement persistée
 * pour la demande du propriétaire authentifié.
 *
 * Aucune vitrine : pas de jumelage réel, pas d'entrepreneur admissible, pas de
 * nom ni d'adresse publique ⇒ état honnête d'attente, sans bouton de
 * réservation. Le score interne n'est jamais affiché.
 */
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import PageShell from "@/layouts/PageShell";
import PrimaryCTA from "@/components/cta/PrimaryCTA";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { useEligibleRecommendation } from "@/features/recommendation/useEligibleRecommendation";

export default function PageRecommendations() {
  const [params] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading, projectId, leadId, hasContext } = useEligibleRecommendation(
    user?.id,
    params.get("lead") ?? "",
    params.get("project") ?? "",
  );

  const waitingHref = projectId
    ? `/dashboard/projects/${encodeURIComponent(projectId)}/waiting`
    : "/dashboard";

  const showLoading = isAuthenticated && hasContext && isLoading;
  const top = data ?? null;

  const bookingHref = top
    ? `/book/${encodeURIComponent(top.slug)}` +
      (projectId ? `?project=${encodeURIComponent(projectId)}` : "")
    : "";

  return (
    <PageShell id="recommendations" variant="app" cta={false}>
      <section className="mx-auto max-w-2xl px-5 pt-16 pb-8 text-white">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Recommandation principale
        </h1>
        <p className="mt-2 text-white/70">
          Un seul entrepreneur, choisi pour votre projet — jamais une liste
          partagée.
        </p>

        <div
          className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
          data-testid="recommendation-panel"
        >
          {showLoading ? (
            <p className="text-white/60">Analyse en cours…</p>
          ) : top ? (
            <div data-testid="recommendation-result">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-medium">{top.name}</h2>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                  Compatible et vérifié
                </span>
              </div>
              {top.city && <p className="mt-1 text-sm text-white/60">{top.city}</p>}
              {top.reason && <p className="mt-3 text-sm text-white/70">{top.reason}</p>}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={bookingHref}
                  data-cta-canonical="book"
                  data-testid="cta-book"
                  onClick={() =>
                    void logFunnelEvent({
                      event_type: "booking_clicked",
                      step: "recommendation",
                      metadata: {
                        project_id: projectId || null,
                        lead_id: leadId || null,
                        contractor_slug: top.slug,
                      },
                    })
                  }
                  className="inline-flex h-14 items-center justify-center rounded-[18px] bg-white px-8 font-medium text-black transition-all hover:-translate-y-[2px]"
                >
                  Prendre rendez-vous
                </Link>
                <PrimaryCTA
                  cta="alex"
                  size="lg"
                  variant="secondary"
                  label="Poser une question à Clara"
                />
              </div>
            </div>
          ) : (
            <div className="text-white/70" data-testid="recommendation-empty">
              <p className="font-medium text-white">
                Aucun entrepreneur compatible confirmé pour l'instant.
              </p>
              <p className="mt-1 text-sm">
                Votre demande reste active. Dès qu'un entrepreneur vérifié et
                disponible correspond à votre projet, nous vous l'annonçons.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={waitingHref}
                  data-testid="cta-waiting"
                  className="inline-flex h-14 items-center justify-center rounded-[18px] border border-white/15 bg-white/5 px-8 font-medium text-white transition-all hover:-translate-y-[2px]"
                >
                  Suivre ma demande
                </Link>
                <PrimaryCTA
                  cta="alex"
                  size="lg"
                  variant="secondary"
                  label="Poser une question à Clara"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
