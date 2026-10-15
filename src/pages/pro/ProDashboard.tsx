import ContractorAffiliateTeaser from "@/components/contractor/ContractorAffiliateTeaser";
/**
 * UNPRO — Dashboard Entrepreneur v2
 * Recevez des rendez-vous exclusifs. Pas des leads partagés.
 */
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState } from "@/components/shared";
import { useContractorProfile } from "@/hooks/useContractor";
import { useContractorAppointments } from "@/hooks/useAppointments";
import ProActivationCompact from "@/components/pro-dashboard/ProActivationCompact";
import ProNextActionCard from "@/components/pro-dashboard/ProNextActionCard";
import { isContractorAgreementActive } from "@/lib/billing/contractorActivationState";

const ProDashboard = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading: pL } = useContractorProfile();
  const { data: appointments, isLoading: aL } = useContractorAppointments();

  if (pL || aL) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const appts = appointments ?? [];

  // Activation confirmée côté serveur uniquement : tant qu'elle n'est pas
  // acquise, l'entrepreneur voit un seul écran avec une seule prochaine action.
  const isActivated = isContractorAgreementActive(profile);

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

        {profile?.id && <section className="rounded-2xl border border-border/50 bg-card/70 p-5 space-y-3" aria-label="Votre fiche entreprise">
          <div className="flex items-center gap-3">
            {profile.logo_url && <img src={profile.logo_url} alt={`Logo ${profile.business_name}`} className="h-16 w-24 rounded-lg bg-white p-2 object-contain" />}
            <div className="min-w-0"><h2 className="font-semibold break-words">{profile.business_name}</h2><p className="text-sm text-muted-foreground">{[profile.specialty, profile.city].filter(Boolean).join(" · ")}</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate(`/pro/profile/public/${profile.id}`)}>Voir ma fiche</Button><Button variant="ghost" className="h-auto min-h-11 whitespace-normal" onClick={() => navigate("/pro/profile")}>Compléter mon logo et mes photos</Button></div>
        </section>}
        <ProNextActionCard profile={profile} appointments={appts} />
        <ContractorAffiliateTeaser />

        <div className="rounded-2xl border border-border/50 bg-card/70 p-5 space-y-3" data-testid="pro-upcoming">
          <p className="text-sm font-semibold text-foreground">Prochains rendez-vous</p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun rendez-vous pour le moment. Vous serez averti dès qu'un propriétaire compatible réserve.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 text-sm text-foreground">
                  <span className="truncate">{a.project_category || a.problem_summary || "Rendez-vous"}</span>
                  <span className="text-muted-foreground shrink-0">
                    {(a.scheduled_at || a.preferred_date)
                      ? new Date((a.scheduled_at || a.preferred_date)).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })
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
