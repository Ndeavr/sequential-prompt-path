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

  return (
    <ContractorLayout>
      <div className="dark max-w-4xl mx-auto space-y-5 pb-24">
        <ProNextActionCard profile={profile} appointments={appts} />
        <DashHero profile={profile} completeness={completeness} aipp={aipp} />
        <CardCalendarConnectionRole role="contractor" surface="dashboard_pro" />
        <CompatibilityEntryCard contractorId={profile?.id} />
        <DashKpiRow
          newAppts={newAppts}
          acceptedAppts={acceptedAppts}
          completedAppts={completedAppts}
          aipp={aipp}
          avgRating={avgRating}
          reviewCount={reviewCount}
        />
        <DashProbability completeness={completeness} plan={currentPlan} aipp={aipp} />
        <DashChecklist profile={profile} reviewCount={reviewCount} />
        <DashPipeline appointments={appts} />
        <DashRevenueChart />
        <DashAippScore aipp={aipp} completeness={completeness} profile={profile} />
        <DashResponseTime />
        <DashWaitlistStatus />
        <CoachPanel />
        <AlexSalesPanel />
        <CoachNudges completeness={completeness} aipp={aipp} reviewCount={reviewCount} plan={currentPlan} />
        <DashMatchActivity />
        <DashAutoAccept plan={currentPlan} />
        <DashAiRecommendations completeness={completeness} plan={currentPlan} aipp={aipp} />
        <DashUpsell plan={currentPlan} />
        <DashNotifications />
        <DashPerformance />
        <DashObjective plan={currentPlan} />

        {/* Footer message */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="text-center py-6 space-y-1"
        >
          <p className="text-sm font-bold text-foreground">Soyez recommandé aux bons propriétaires.</p>
          <p className="text-xs text-muted-foreground">Des rendez-vous exclusifs. Pas des leads partagés.</p>
        </motion.div>

      </div>
    </ContractorLayout>
  );
};

export default ProDashboard;
