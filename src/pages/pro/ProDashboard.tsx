/**
 * UNPRO — Dashboard Entrepreneur v2
 * Recevez des rendez-vous exclusifs. Pas des leads partagés.
 */
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState } from "@/components/shared";
import { useContractorProfile, useContractorReviews } from "@/hooks/useContractor";
import { useAppointments } from "@/hooks/useAppointments";
import { useHasActiveSubscription } from "@/hooks/useSubscription";
import DashHero from "@/components/pro-dashboard/DashHero";
import CardCalendarConnectionRole from "@/components/calendar/CardCalendarConnectionRole";
import CompatibilityEntryCard from "@/components/contractor-compatibility/CompatibilityEntryCard";
import DashKpiRow from "@/components/pro-dashboard/DashKpiRow";
import DashProbability from "@/components/pro-dashboard/DashProbability";
import DashChecklist from "@/components/pro-dashboard/DashChecklist";
import DashPipeline from "@/components/pro-dashboard/DashPipeline";
import DashAippScore from "@/components/pro-dashboard/DashAippScore";
import DashAutoAccept from "@/components/pro-dashboard/DashAutoAccept";
import DashAiRecommendations from "@/components/pro-dashboard/DashAiRecommendations";
import DashMatchActivity from "@/components/pro-dashboard/DashMatchActivity";
import CoachPanel from "@/components/pro-dashboard/CoachPanel";
import CoachNudges from "@/components/pro-dashboard/CoachNudges";
import DashUpsell from "@/components/pro-dashboard/DashUpsell";
import AlexSalesPanel from "@/components/pro-dashboard/AlexSalesPanel";
import DashNotifications from "@/components/pro-dashboard/DashNotifications";
import DashPerformance from "@/components/pro-dashboard/DashPerformance";
import DashObjective from "@/components/pro-dashboard/DashObjective";
import DashWaitlistStatus from "@/components/pro-dashboard/DashWaitlistStatus";
import DashRevenueChart from "@/components/pro-dashboard/DashRevenueChart";
import DashResponseTime from "@/components/pro-dashboard/DashResponseTime";
import ProActivationCompact from "@/components/pro-dashboard/ProActivationCompact";
import ProNextActionCard from "@/components/pro-dashboard/ProNextActionCard";
import { motion } from "framer-motion";

const ProDashboard = () => {
  const { data: profile, isLoading: pL } = useContractorProfile();
  const { data: reviews, isLoading: rL } = useContractorReviews();
  const { data: appointments, isLoading: aL } = useAppointments();
  const { planId, isLoading: sL } = useHasActiveSubscription();

  if (pL || rL || aL || sL) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const fields = [profile?.business_name, profile?.specialty, profile?.description, profile?.phone, profile?.email, profile?.city, profile?.license_number, profile?.insurance_info, profile?.logo_url, profile?.website];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const aipp = profile?.aipp_score ?? 42;
  const reviewCount = reviews?.length ?? 0;
  const avgRating = profile?.rating ?? 0;
  const appts = appointments ?? [];
  const newAppts = appts.filter(a => a.status === "requested" || a.status === "under_review").length;
  const acceptedAppts = appts.filter(a => a.status === "accepted" || a.status === "scheduled").length;
  const completedAppts = appts.filter(a => a.status === "completed").length;
  const currentPlan = planId ?? "recrue";

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
