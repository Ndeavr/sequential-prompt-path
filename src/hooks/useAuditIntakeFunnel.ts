/**
 * UNPRO — Audit Intake Funnel State Machine
 * Hardened with timeouts, retries, partial-data fallback, and forceReveal watchdog.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FunnelViewModel, FunnelStep, IntakeData, PlanGoal, RecommendedPlan } from "@/types/outreachFunnel";
import { recommendPlan } from "@/services/planRecommendationService";
import { safeAsyncOperation, heuristicAippScore } from "@/lib/safeAsync";
import { logBoot } from "@/lib/bootDebug";

const SESSION_KEY = "unpro_audit_funnel";
const MAX_POLL_ATTEMPTS = 5; // ~15s at 3s/poll
const HARD_DEADLINE_MS = 10_000;

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

function initialState(): FunnelViewModel {
  return {
    step: "landing",
    sessionId: null,
    sessionToken: null,
    intake: null,
    contractorId: null,
    auditId: null,
    auditScore: null,
    confidenceLevel: null,
    recommendedPlan: null,
    selectedPlan: null,
    goal: null,
    isFounderMode: false,
    degraded: false,
    pollAttempts: 0,
    startedAt: null,
  };
}

export function useAuditIntakeFunnel(initialOutreachTargetId?: string) {
  const [vm, setVm] = useState<FunnelViewModel>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return { ...initialState(), ...JSON.parse(saved) };
    } catch {}
    return initialState();
  });
  const lastIntakeRef = useRef<IntakeData | null>(vm.intake);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(vm));
  }, [vm]);

  const setStep = useCallback((step: FunnelStep) => {
    setVm((prev) => ({ ...prev, step }));
  }, []);

  const trackEvent = useCallback(
    async (eventName: string, props: Record<string, unknown> = {}) => {
      if (!vm.sessionId) return;
      // Fire-and-forget, never await long
      safeAsyncOperation(
        () =>
          supabase.from("audit_funnel_events").insert({
            session_id: vm.sessionId,
            event_name: eventName,
            event_props: props as any,
          } as any) as unknown as Promise<unknown>,
        { timeoutMs: 2500, retries: 0, label: `track:${eventName}` }
      );
    },
    [vm.sessionId]
  );

  const forceReveal = useCallback(
    (reason: string) => {
      logBoot("AUDIT_FORCE_REVEAL", { reason });
      setVm((prev) => {
        if (prev.step === "reveal" || prev.step === "recommendation" || prev.step === "checkout" || prev.step === "success") {
          return prev;
        }
        const intake = prev.intake;
        const score = prev.auditScore ?? heuristicAippScore({
          websiteUrl: intake?.websiteUrl,
          phone: intake?.phone,
          city: intake?.city,
          businessName: intake?.businessName,
          rbqNumber: intake?.rbqNumber,
          email: intake?.email,
        });
        return {
          ...prev,
          step: "reveal",
          degraded: true,
          auditScore: score,
          confidenceLevel: prev.confidenceLevel ?? "low",
        };
      });
    },
    []
  );

  const startAudit = useCallback(
    async (intake: IntakeData) => {
      lastIntakeRef.current = intake;
      const sessionToken = generateToken();
      const startedAt = Date.now();
      logBoot("AUDIT_START", { name: intake.businessName });

      // Optimistic transition — UI never waits on inserts
      setVm((prev) => ({
        ...prev,
        step: "running",
        sessionToken,
        intake,
        startedAt,
        pollAttempts: 0,
        degraded: false,
        auditScore: null,
        confidenceLevel: null,
      }));

      // 1) Contractor insert (best-effort, 4s + 1 retry)
      const contractorRes = await safeAsyncOperation(
        async () => {
          const { data, error } = await supabase
            .from("contractors")
            .insert({
              business_name: intake.businessName,
              website_url: intake.websiteUrl || null,
              phone: intake.phone || null,
              city: intake.city,
              rbq_number: intake.rbqNumber || null,
              email: intake.email || null,
            } as any)
            .select("id")
            .single();
          if (error) throw error;
          return data as { id: string } | null;
        },
        { timeoutMs: 4000, retries: 1, label: "contractor_insert" }
      );
      const contractorId = contractorRes.data?.id ?? null;
      if (contractorId) setVm((p) => ({ ...p, contractorId }));

      // 2) Session insert (3s + 1 retry)
      const sessionRes = await safeAsyncOperation(
        async () => {
          const { data, error } = await supabase
            .from("audit_intake_sessions" as any)
            .insert({
              contractor_id: contractorId,
              session_token: sessionToken,
              business_name: intake.businessName,
              website_url: intake.websiteUrl,
              phone: intake.phone,
              city: intake.city,
              rbq_number: intake.rbqNumber,
              email: intake.email,
              funnel_status: "running",
              outreach_target_id: initialOutreachTargetId || null,
            } as any)
            .select("id")
            .single();
          if (error) throw error;
          return data as unknown as { id: string } | null;
        },
        { timeoutMs: 3000, retries: 1, label: "session_insert" }
      );
      const sessionId = sessionRes.data?.id ?? null;
      if (sessionId) setVm((p) => ({ ...p, sessionId }));

      // 3) Launch audit (8s + 1 retry) — only if we have a contractor
      let auditId: string | null = null;
      if (contractorId) {
        const auditRes = await safeAsyncOperation(
          async () => {
            const { data, error } = await supabase.functions.invoke("aipp-run-audit", {
              body: { contractor_id: contractorId },
            });
            if (error) throw error;
            return (data as { audit_id?: string })?.audit_id ?? null;
          },
          { timeoutMs: 8000, retries: 1, label: "aipp_run_audit" }
        );
        auditId = auditRes.data ?? null;
        logBoot(auditRes.ok ? "AUDIT_INVOKE_OK" : "AUDIT_INVOKE_FAIL", { auditId, timedOut: auditRes.timedOut });

        if (auditId && sessionId) {
          safeAsyncOperation(
            () => supabase.from("audit_intake_sessions" as any).update({ audit_id: auditId } as any).eq("id", sessionId) as unknown as Promise<unknown>,
            { timeoutMs: 2500, label: "session_link_audit" }
          );
        }
      }

      setVm((p) => ({ ...p, auditId, degraded: !auditId ? true : p.degraded }));
      trackEvent("audit_started", { business_name: intake.businessName, has_audit_id: !!auditId });

      // If we never got an auditId, the watchdog will forceReveal at 10s.
    },
    [initialOutreachTargetId, trackEvent]
  );

  const pollAuditStatus = useCallback(async () => {
    if (!vm.auditId) return;
    const res = await safeAsyncOperation(
      async () => {
        const { data, error } = await supabase
          .from("contractor_aipp_audits")
          .select("analysis_status, overall_score, confidence_level")
          .eq("id", vm.auditId!)
          .single();
        if (error) throw error;
        return data;
      },
      { timeoutMs: 4000, retries: 0, label: "audit_poll" }
    );
    logBoot("AUDIT_POLL_TICK", { attempt: (vm.pollAttempts ?? 0) + 1, status: res.data?.analysis_status });

    setVm((prev) => {
      const attempts = (prev.pollAttempts ?? 0) + 1;
      const data = res.data;
      if (data && (data.analysis_status === "complete" || data.analysis_status === "partial")) {
        trackEvent("audit_completed", { score: data.overall_score, status: data.analysis_status });
        return {
          ...prev,
          step: "reveal",
          pollAttempts: attempts,
          auditScore: data.overall_score ? Number(data.overall_score) : prev.auditScore,
          confidenceLevel: (data.confidence_level as FunnelViewModel["confidenceLevel"]) ?? prev.confidenceLevel,
          degraded: data.analysis_status === "partial" ? true : prev.degraded,
        };
      }
      if (data && data.analysis_status === "failed") {
        logBoot("AUDIT_DEGRADED", { reason: "status_failed" });
        const intake = prev.intake;
        return {
          ...prev,
          step: "reveal",
          pollAttempts: attempts,
          degraded: true,
          auditScore: prev.auditScore ?? heuristicAippScore({
            websiteUrl: intake?.websiteUrl,
            phone: intake?.phone,
            city: intake?.city,
            businessName: intake?.businessName,
            rbqNumber: intake?.rbqNumber,
            email: intake?.email,
          }),
          confidenceLevel: "low",
        };
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        logBoot("AUDIT_DEGRADED", { reason: "max_poll_attempts" });
        const intake = prev.intake;
        return {
          ...prev,
          step: "reveal",
          pollAttempts: attempts,
          degraded: true,
          auditScore: prev.auditScore ?? heuristicAippScore({
            websiteUrl: intake?.websiteUrl,
            phone: intake?.phone,
            city: intake?.city,
            businessName: intake?.businessName,
            rbqNumber: intake?.rbqNumber,
            email: intake?.email,
          }),
          confidenceLevel: "low",
        };
      }
      return { ...prev, pollAttempts: attempts };
    });
  }, [vm.auditId, vm.pollAttempts, trackEvent]);

  const retryAudit = useCallback(() => {
    const intake = lastIntakeRef.current ?? vm.intake;
    if (!intake) return;
    logBoot("AUDIT_RETRY", {});
    setVm((p) => ({ ...p, auditId: null, auditScore: null, degraded: false, pollAttempts: 0 }));
    void startAudit(intake);
  }, [startAudit, vm.intake]);

  const cancelAudit = useCallback(() => {
    logBoot("AUDIT_CANCEL", {});
    setVm((p) => ({ ...p, step: "intake", auditId: null, pollAttempts: 0, degraded: false }));
  }, []);

  const setGoal = useCallback(
    async (goal: PlanGoal, opts?: { monthlyAppointmentGoal?: number; averageJobValue?: number; serviceAreaCount?: number }) => {
      const rec = recommendPlan({
        aippScore: vm.auditScore,
        confidenceLevel: vm.confidenceLevel || "low",
        goal,
        ...opts,
      });

      setVm((prev) => ({ ...prev, goal, recommendedPlan: rec, step: "recommendation" }));

      if (vm.sessionId) {
        safeAsyncOperation(
          () =>
            supabase
              .from("audit_intake_sessions" as any)
              .update({
                recommended_plan: rec,
                goal,
                monthly_appointment_goal: opts?.monthlyAppointmentGoal,
                average_job_value: opts?.averageJobValue,
                service_area_count: opts?.serviceAreaCount,
                funnel_status: "recommendation",
              } as any)
              .eq("id", vm.sessionId) as unknown as Promise<unknown>,
          { timeoutMs: 3000, label: "session_set_goal" }
        );
      }
      trackEvent("plan_recommendation_viewed", { plan: rec, goal });
    },
    [vm.auditScore, vm.confidenceLevel, vm.sessionId, trackEvent]
  );

  const selectPlan = useCallback(
    async (plan: RecommendedPlan) => {
      setVm((prev) => ({ ...prev, selectedPlan: plan, step: "checkout" }));
      if (vm.sessionId) {
        safeAsyncOperation(
          () =>
            supabase
              .from("audit_intake_sessions" as any)
              .update({ selected_plan: plan, funnel_status: "checkout" } as any)
              .eq("id", vm.sessionId) as unknown as Promise<unknown>,
          { timeoutMs: 3000, label: "session_select_plan" }
        );
      }
      trackEvent("plan_selected", { plan });
    },
    [vm.sessionId, trackEvent]
  );

  const completeCheckout = useCallback(async () => {
    setVm((prev) => ({ ...prev, step: "success" }));
    if (vm.sessionId) {
      safeAsyncOperation(
        () =>
          supabase
            .from("audit_intake_sessions" as any)
            .update({ funnel_status: "success" } as any)
            .eq("id", vm.sessionId) as unknown as Promise<unknown>,
        { timeoutMs: 3000, label: "session_complete" }
      );
    }
    trackEvent("checkout_completed");
  }, [vm.sessionId, trackEvent]);

  const reset = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setVm(initialState());
  }, []);

  return {
    vm,
    setStep,
    startAudit,
    pollAuditStatus,
    setGoal,
    selectPlan,
    completeCheckout,
    trackEvent,
    reset,
    forceReveal,
    retryAudit,
    cancelAudit,
    HARD_DEADLINE_MS,
  };
}
