/**
 * UNPRO — /admin/system-integrity
 * Phase 2 cockpit: real-time integrity monitor across all pipelines.
 */
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wrench } from "lucide-react";
import { useSystemIntegrity } from "@/features/systemIntegrity/useSystemIntegrity";
import { SystemHealthBadge } from "@/features/systemIntegrity/SystemHealthBadge";
import { First1DollarTracker } from "@/features/systemIntegrity/First1DollarTracker";
import { IntegrityCard } from "@/features/systemIntegrity/IntegrityCard";
import { AutoRepairFeed } from "@/features/systemIntegrity/AutoRepairFeed";

export default function PageAdminSystemIntegrity() {
  const {
    score, scraping, sms, email, onboarding, stripe, matching,
    funnel, repairs, runSnapshot, runRepair,
  } = useSystemIntegrity();

  return (
    <>
      <Helmet>
        <title>System Integrity — UNPRO Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="admin-theme min-h-screen p-6 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Integrity</h1>
            <p className="text-sm text-muted-foreground">
              Moniteur temps réel de la santé de tous les pipelines UNPRO. Aucune donnée simulée.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => runRepair.mutate()} disabled={runRepair.isPending}>
              <Wrench className="h-4 w-4 mr-2" />
              Vérifier dépendances
            </Button>
            <Button size="sm" onClick={() => runSnapshot.mutate()} disabled={runSnapshot.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${runSnapshot.isPending ? "animate-spin" : ""}`} />
              Instantané maintenant
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SystemHealthBadge score={score.data} />
          <div className="lg:col-span-2">
            <First1DollarTracker funnel={funnel.data} />
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">Pipelines (24 h)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <IntegrityCard
              title="Scraping"
              metric="Taux de validation"
              value={scraping.data?.success_rate as number}
              breakdown={[
                { label: "Validées", value: scraping.data?.validated as number },
                { label: "Rejetées", value: scraping.data?.rejected as number },
                { label: "Total", value: scraping.data?.total as number },
              ]}
              isLoading={scraping.isLoading}
            />
            <IntegrityCard
              title="SMS"
              metric="Taux de livraison"
              value={sms.data?.delivery_rate as number}
              breakdown={[
                { label: "Livrés", value: sms.data?.delivered as number },
                { label: "Échoués", value: sms.data?.failed as number },
                { label: "Total", value: sms.data?.total as number },
              ]}
              isLoading={sms.isLoading}
            />
            <IntegrityCard
              title="Email"
              metric="Taux de livraison"
              value={email.data?.delivery_rate as number}
              breakdown={[
                { label: "Livrés", value: email.data?.delivered as number },
                { label: "Échoués", value: email.data?.failed as number },
                { label: "Total", value: email.data?.total as number },
              ]}
              isLoading={email.isLoading}
            />
            <IntegrityCard
              title="Onboarding"
              metric="Taux de conversion"
              value={onboarding.data?.conversion_rate as number}
              breakdown={[
                { label: "Visites", value: onboarding.data?.visits as number },
                { label: "Comptes créés", value: onboarding.data?.accounts as number },
                { label: "Activations", value: onboarding.data?.activations as number },
              ]}
              isLoading={onboarding.isLoading}
            />
            <IntegrityCard
              title="Stripe"
              metric="Paiements réussis"
              value={stripe.data?.success_rate as number}
              breakdown={[
                { label: "Réussis", value: stripe.data?.succeeded as number },
                { label: "Échoués", value: stripe.data?.failed as number },
                { label: "Total", value: stripe.data?.total as number },
              ]}
              isLoading={stripe.isLoading}
            />
            <IntegrityCard
              title="Matching"
              metric="Taux de compatibilité"
              value={matching.data?.match_rate as number}
              breakdown={[
                { label: "Tentatives", value: matching.data?.matches_attempted as number },
                { label: "Succès", value: matching.data?.matches_succeeded as number },
                { label: "Rendez-vous", value: matching.data?.bookings as number },
              ]}
              isLoading={matching.isLoading}
            />
          </div>
        </section>

        <AutoRepairFeed attempts={repairs.data} />

        <footer className="text-xs text-muted-foreground pt-4 border-t border-border/40">
          Politique <strong>No Fake Data</strong> — chaque valeur ci-dessus provient de <code>platform_operation_outcomes</code>.
          Si un pipeline affiche « Non disponible », c'est qu'aucun événement réel n'a été journalisé dans les 24 dernières heures.
        </footer>
      </div>
    </>
  );
}
