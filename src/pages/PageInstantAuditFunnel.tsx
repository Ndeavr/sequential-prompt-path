/**
 * UNPRO — Instant Audit Intake Funnel
 * Hard 10s watchdog forces reveal even if backend stalls.
 */
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuditIntakeFunnel } from "@/hooks/useAuditIntakeFunnel";
import { AuditLandingScreen } from "@/components/audit-funnel/AuditLandingScreen";
import { AuditIntakeForm } from "@/components/audit-funnel/AuditIntakeForm";
import { AuditProgressScreen } from "@/components/audit-funnel/AuditProgressScreen";
import { AuditRevealScreen } from "@/components/audit-funnel/AuditRevealScreen";
import { PlanRecommendationScreen } from "@/components/audit-funnel/PlanRecommendationScreen";
import { AuditSuccessScreen } from "@/components/audit-funnel/AuditSuccessScreen";
import { motion, AnimatePresence } from "framer-motion";

export default function PageInstantAuditFunnel() {
  const [searchParams] = useSearchParams();
  const outreachTargetId = searchParams.get("target") || undefined;
  const funnel = useAuditIntakeFunnel(outreachTargetId);
  const navigate = useNavigate();
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const watchdogRef = useRef<ReturnType<typeof setTimeout>>();

  // Poll while audit is running and we have an auditId
  useEffect(() => {
    if (funnel.vm.step === "running" && funnel.vm.auditId) {
      pollRef.current = setInterval(() => funnel.pollAuditStatus(), 3000);
      return () => clearInterval(pollRef.current);
    }
  }, [funnel.vm.step, funnel.vm.auditId]);

  // Hard 10s watchdog — guarantees a reveal transition
  useEffect(() => {
    if (funnel.vm.step !== "running") {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      return;
    }
    watchdogRef.current = setTimeout(() => {
      funnel.forceReveal("hard_deadline_10s");
    }, funnel.HARD_DEADLINE_MS);
    return () => {
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, [funnel.vm.step, funnel.vm.startedAt]);

  return (
    <div className="min-h-screen bg-[#060B14] text-foreground">
      <AnimatePresence mode="wait">
        <motion.div
          key={funnel.vm.step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {funnel.vm.step === "landing" && (
            <AuditLandingScreen onStart={() => funnel.setStep("intake")} />
          )}
          {funnel.vm.step === "intake" && (
            <AuditIntakeForm onSubmit={funnel.startAudit} />
          )}
          {funnel.vm.step === "running" && (
            <AuditProgressScreen
              businessName={funnel.vm.intake?.businessName}
              hasContractor={!!funnel.vm.contractorId}
              hasAudit={!!funnel.vm.auditId}
              degraded={!!funnel.vm.degraded}
              pollAttempts={funnel.vm.pollAttempts ?? 0}
              onContinueAnyway={() => funnel.forceReveal("user_continue")}
              onRetry={funnel.retryAudit}
              onHome={() => navigate("/")}
            />
          )}
          {funnel.vm.step === "reveal" && (
            <AuditRevealScreen
              contractorId={funnel.vm.contractorId}
              auditId={funnel.vm.auditId}
              score={funnel.vm.auditScore}
              confidence={funnel.vm.confidenceLevel}
              degraded={!!funnel.vm.degraded}
              onContinue={() => funnel.setStep("recommendation")}
              onRetry={funnel.retryAudit}
            />
          )}
          {(funnel.vm.step === "recommendation" || funnel.vm.step === "checkout") && (
            <PlanRecommendationScreen
              score={funnel.vm.auditScore}
              confidence={funnel.vm.confidenceLevel}
              onGoalSet={funnel.setGoal}
              recommendedPlan={funnel.vm.recommendedPlan}
              onSelectPlan={funnel.selectPlan}
              selectedPlan={funnel.vm.selectedPlan}
              showCheckout={funnel.vm.step === "checkout"}
              onCheckoutComplete={funnel.completeCheckout}
            />
          )}
          {funnel.vm.step === "success" && (
            <AuditSuccessScreen
              businessName={funnel.vm.intake?.businessName}
              plan={funnel.vm.selectedPlan}
              auditId={funnel.vm.auditId}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
