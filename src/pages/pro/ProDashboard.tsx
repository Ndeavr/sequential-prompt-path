/**
 * UNPRO — Dashboard Entrepreneur v1
 * Recevez des rendez-vous exclusifs. Pas des leads partagés.
 */
import ContractorLayout from "@/layouts/ContractorLayout";
import { LoadingState } from "@/components/shared";
import { useContractorProfile, useContractorReviews } from "@/hooks/useContractor";
import { useAppointments } from "@/hooks/useAppointments";
import DashHero from "@/components/pro-dashboard/DashHero";
import DashKpiRow from "@/components/pro-dashboard/DashKpiRow";
import DashProbability from "@/components/pro-dashboard/DashProbability";
import DashChecklist from "@/components/pro-dashboard/DashChecklist";
import DashPipeline from "@/components/pro-dashboard/DashPipeline";
import DashAippScore from "@/components/pro-dashboard/DashAippScore";
import DashAutoAccept from "@/components/pro-dashboard/DashAutoAccept";
import DashAiRecommendations from "@/components/pro-dashboard/DashAiRecommendations";
import DashUpsell from "@/components/pro-dashboard/DashUpsell";
import DashNotifications from "@/components/pro-dashboard/DashNotifications";
import DashPerformance from "@/components/pro-dashboard/DashPerformance";
import DashObjective from "@/components/pro-dashboard/DashObjective";
import DashWaitlistStatus from "@/components/pro-dashboard/DashWaitlistStatus";
import { motion } from "framer-motion";

const ProDashboard = () => {
  const { data: profile, isLoading: pL } = useContractorProfile();
  const { data: reviews, isLoading: rL } = useContractorReviews();
  const { data: appointments, isLoading: aL } = useAppointments();

  if (pL || rL || aL) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const fields = [profile?.business_name, profile?.specialty, profile?.description, profile?.phone, profile?.email, profile?.city, profile?.license_number, profile?.insurance_info, profile?.logo_url, profile?.website];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);
  const aipp = profile?.aipp_score ?? 42;
  const reviewCount = reviews?.length ?? 0;
  const avgRating = profile?.rating ?? 0;
  const appts = appointments ?? [];
  const newAppts = appts.filter(a => a.status === "requested" || a.status === "under_review").length;
  const acceptedAppts = appts.filter(a => a.status === "accepted" || a.status === "scheduled").length;
  const completedAppts = appts.filter(a => a.status === "completed").length;
  const currentPlan = "recrue"; // TODO: from subscription

  return (
    <ContractorLayout>
      <div className="dark max-w-4xl mx-auto space-y-5 pb-24">
        <DashHero profile={profile} completeness={completeness} aipp={aipp} />
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
        <DashAippScore aipp={aipp} completeness={completeness} profile={profile} />
        <DashAutoAccept plan={currentPlan} />
        <DashAiRecommendations completeness={completeness} plan={currentPlan} aipp={aipp} />
        <DashUpsell plan={currentPlan} />
        <DashNotifications />
        <DashPerformance appointments={appts} />
        <DashObjective plan={currentPlan} />

        {/* Footer message */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="text-center py-6 space-y-1"
        >
          <p className="text-sm font-bold text-foreground">Recevez des rendez-vous exclusifs</p>
          <p className="text-xs text-muted-foreground">Pas des leads partagés.</p>
        </motion.div>

        {/* Mobile sticky CTA */}
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
          <motion.button
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-[var(--shadow-glow)]"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Compléter mon profil
          </motion.button>
        </div>
      </div>
    </ContractorLayout>
  );
};

export default ProDashboard;
