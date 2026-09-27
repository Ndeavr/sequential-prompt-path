/**
 * UNPRO — Dashboard Entrepreneur v2
 * Recevez des rendez-vous exclusifs. Pas des leads partagés.
 */
import { Link } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState } from "@/components/shared";
import { useContractorProfile } from "@/hooks/useContractor";
import { useAppointments } from "@/hooks/useAppointments";
import ProActivationCompact from "@/components/pro-dashboard/ProActivationCompact";
import ProNextActionCard from "@/components/pro-dashboard/ProNextActionCard";

const ProDashboard = () => {
  const { data: profile, isLoading: pL } = useContractorProfile();
  const { data: appointments, isLoading: aL } = useAppointments();

  if (pL || aL) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const appts = appointments ?? [];

  // Activation confirmée côté serveur uniquement : tant qu'elle n'est pas
  // acquise, l'entrepreneur voit un seul écran avec une seule prochaine action.
  const isActivated =
    profile?.activation_status === "activated" || profile?.account_status === "active";

  if (!isActivated) {
    return (
      <ContractorLayout>
        <div className="dark pb-24">
          <ProActivationCompact profile={profile} />
        </div>
      </ContractorLayout>
    );
  }

  // Accueil épuré : statut réel, prochains rendez-vous, une seule prochaine
  // action. Scores, graphiques, coach et abonnement vivent dans leurs pages.
  const upcoming = appts
    .filter((a) => a.status === "accepted" || a.status === "scheduled" || a.status === "requested")
    .slice(0, 3);

  return (
    <ContractorLayout>
      <div className="dark max-w-xl mx-auto space-y-5 pb-24">
        <div>
          <p className="text-sm text-muted-foreground truncate">
            {profile?.business_name || "Votre entreprise"}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground mt-1">
            Votre espace entrepreneur
          </h1>
        </div>

        <ProNextActionCard profile={profile} appointments={appts} />

        <div className="rounded-2xl border border-border/50 bg-card/70 p-5 space-y-3" data-testid="pro-upcoming">
          <p className="text-sm font-semibold text-foreground">Prochains rendez-vous</p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun rendez-vous pour le moment. Vous serez averti dès qu'un propriétaire compatible réserve.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((a: any) => (
                <li key={a.id} className="flex justify-between gap-3 text-sm text-foreground">
                  <span className="truncate">{a.service_type || a.title || "Rendez-vous"}</span>
                  <span className="text-muted-foreground shrink-0">
                    {a.scheduled_date
                      ? new Date(a.scheduled_date).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })
                      : "À confirmer"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/pro/appointments" className="inline-block text-xs text-muted-foreground underline underline-offset-4">
            Voir tous mes rendez-vous
          </Link>
        </div>
      </div>
    </ContractorLayout>
  );
};

export default ProDashboard;
