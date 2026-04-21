/**
 * UNPRO — Audit Intake Funnel State Machine
 */
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FunnelViewModel, FunnelStep, IntakeData, PlanGoal, RecommendedPlan } from "@/types/outreachFunnel";
import { recommendPlan } from "@/services/planRecommendationService";

const SESSION_KEY = "unpro_audit_funnel";

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export function useAuditIntakeFunnel(initialOutreachTargetId?: string) {
  const [vm, setVm] = useState<FunnelViewModel>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
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
    };
  });

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(vm));
  }, [vm]);

  const setStep = useCallback((step: FunnelStep) => {
    setVm(prev => ({ ...prev, step }));
  }, []);

  const trackEvent = useCallback(async (eventName: string, props: Record<string, unknown> = {}) => {
    if (!vm.sessionId) return;
    await supabase.from("audit_funnel_events").insert({
      session_id: vm.sessionId,
      event_name: eventName,
      event_props: props as any,
    } as any);
  }, [vm.sessionId]);

  const startAudit = useCallback(async (intake: IntakeData) => {
    const sessionToken = generateToken();

    // Create or upsert contractor
    const { data: contractor } = await supabase.from("contractors").insert({
      business_name: intake.businessName,
      website_url: intake.websiteUrl || null,
      phone: intake.phone || null,
      city: intake.city,
      rbq_number: intake.rbqNumber || null,
      email: intake.email || null,
    } as any).select("id").single();

    const contractorId = contractor?.id;

    // Create intake session
    const sessionRes = await supabase.from("audit_intake_sessions" as any).insert({
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
    } as any).select("id").single();
    const session = sessionRes?.data as unknown as { id: string } | null;

    // Launch audit
    let auditId: string | null = null;
    if (contractorId) {
      const { data } = await supabase.functions.invoke("aipp-run-audit", {
        body: { contractor_id: contractorId },
      });
      auditId = data?.audit_id || null;

      if (auditId && session?.id) {
        await supabase.from("audit_intake_sessions" as any).update({ audit_id: auditId } as any).eq("id", session.id);
      }
    }

    setVm(prev => ({
      ...prev,
      step: "running",
      sessionId: session?.id || null,
      sessionToken,
      intake,
      contractorId: contractorId || null,
      auditId,
    }));

    await trackEvent("audit_started", { business_name: intake.businessName });
  }, [initialOutreachTargetId, trackEvent]);

  const pollAuditStatus = useCallback(async () => {
    if (!vm.auditId) return;
    const { data } = await supabase
      .from("contractor_aipp_audits")
      .select("analysis_status, overall_score, confidence_level")
      .eq("id", vm.auditId)
      .single();

    if (!data) return;

    if (data.analysis_status === "complete" || data.analysis_status === "partial") {
      setVm(prev => ({
        ...prev,
        step: "reveal",
        auditScore: data.overall_score ? Number(data.overall_score) : null,
        confidenceLevel: data.confidence_level as FunnelViewModel["confidenceLevel"],
      }));
      await trackEvent("audit_completed", { score: data.overall_score });
    }
  }, [vm.auditId, trackEvent]);

  const setGoal = useCallback(async (goal: PlanGoal, opts?: { monthlyAppointmentGoal?: number; averageJobValue?: number; serviceAreaCount?: number }) => {
    const rec = recommendPlan({
      aippScore: vm.auditScore,
      confidenceLevel: vm.confidenceLevel || "low",
      goal,
      ...opts,
    });

    setVm(prev => ({ ...prev, goal, recommendedPlan: rec, step: "recommendation" }));

    if (vm.sessionId) {
      await supabase.from("audit_intake_sessions" as any).update({
        recommended_plan: rec,
        goal,
        monthly_appointment_goal: opts?.monthlyAppointmentGoal,
        average_job_value: opts?.averageJobValue,
        service_area_count: opts?.serviceAreaCount,
        funnel_status: "recommendation",
      } as any).eq("id", vm.sessionId);
    }
    await trackEvent("plan_recommendation_viewed", { plan: rec, goal });
  }, [vm.auditScore, vm.confidenceLevel, vm.sessionId, trackEvent]);

  const selectPlan = useCallback(async (plan: RecommendedPlan) => {
    setVm(prev => ({ ...prev, selectedPlan: plan, step: "checkout" }));
    if (vm.sessionId) {
      await supabase.from("audit_intake_sessions" as any).update({
        selected_plan: plan,
        funnel_status: "checkout",
      } as any).eq("id", vm.sessionId);
    }
    await trackEvent("plan_selected", { plan });
  }, [vm.sessionId, trackEvent]);

  const completeCheckout = useCallback(async () => {
    setVm(prev => ({ ...prev, step: "success" }));
    if (vm.sessionId) {
      await supabase.from("audit_intake_sessions").update({ funnel_status: "success" }).eq("id", vm.sessionId);
    }
    await trackEvent("checkout_completed");
  }, [vm.sessionId, trackEvent]);

  const reset = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setVm({
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
    });
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
  };
}
