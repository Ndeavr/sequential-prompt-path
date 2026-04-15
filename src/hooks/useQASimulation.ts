import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

// ─── Types ───
export interface SimulationScenario {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  step_order_json: string[];
  default_environment: string;
  severity_level: string;
  created_at: string;
}

export interface SimulationRun {
  id: string;
  scenario_id: string | null;
  environment: string;
  run_name: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  started_by: string | null;
  health_score: number;
  critical_failures_count: number;
  warnings_count: number;
  notes: string | null;
  created_at: string;
  simulation_scenarios?: SimulationScenario | null;
}

export interface SimulationStep {
  id: string;
  run_id: string;
  step_code: string;
  step_label: string;
  step_order: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  expected_result: string | null;
  actual_result: string | null;
  is_critical: boolean;
  retry_count: number;
  created_at: string;
}

export interface SimulationEvent {
  id: string;
  run_id: string;
  step_id: string | null;
  event_type: string;
  event_label: string | null;
  event_payload_json: any;
  status: string;
  created_at: string;
}

export interface SimulationError {
  id: string;
  run_id: string;
  step_id: string | null;
  error_code: string | null;
  error_title: string;
  error_message: string | null;
  error_context_json: any;
  severity: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface StepCheck {
  label: string;
  passed: boolean;
  detail: string;
}

// Step definitions
const STEP_DEFINITIONS: Record<string, { label: string; critical: boolean }> = {
  extract: { label: "Pipeline d'extraction", critical: true },
  email: { label: "Séquence email", critical: true },
  cta_click: { label: "Clic CTA / boutons", critical: true },
  signup: { label: "Inscription entrepreneur", critical: true },
  payment: { label: "Paiement Stripe", critical: true },
  profile: { label: "Création du profil", critical: false },
};

// ─── Hooks ───

export function useSimulationScenarios() {
  return useQuery({
    queryKey: ["simulation-scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simulation_scenarios")
        .select("*")
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as SimulationScenario[];
    },
  });
}

export function useSimulationRuns(filters?: { status?: string; scenarioId?: string }) {
  return useQuery({
    queryKey: ["simulation-runs", filters],
    queryFn: async () => {
      let q = supabase
        .from("simulation_runs")
        .select("*, simulation_scenarios(*)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.scenarioId) q = q.eq("scenario_id", filters.scenarioId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SimulationRun[];
    },
  });
}

export function useSimulationRun(runId: string | undefined) {
  return useQuery({
    queryKey: ["simulation-run", runId],
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .from("simulation_runs")
        .select("*, simulation_scenarios(*)")
        .eq("id", runId)
        .maybeSingle();
      if (error) throw error;
      return data as SimulationRun | null;
    },
    enabled: !!runId,
  });
}

export function useSimulationSteps(runId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!runId) return;
    const channel = supabase
      .channel(`sim-steps-${runId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "simulation_steps", filter: `run_id=eq.${runId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["simulation-steps", runId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [runId, queryClient]);

  return useQuery({
    queryKey: ["simulation-steps", runId],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .from("simulation_steps")
        .select("*")
        .eq("run_id", runId)
        .order("step_order");
      if (error) throw error;
      return (data ?? []) as SimulationStep[];
    },
    enabled: !!runId,
  });
}

export function useSimulationEvents(runId: string | undefined) {
  return useQuery({
    queryKey: ["simulation-events", runId],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .from("simulation_events")
        .select("*")
        .eq("run_id", runId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SimulationEvent[];
    },
    enabled: !!runId,
  });
}

export function useSimulationErrors(runId: string | undefined) {
  return useQuery({
    queryKey: ["simulation-errors", runId],
    queryFn: async () => {
      if (!runId) return [];
      const { data, error } = await supabase
        .from("simulation_errors")
        .select("*")
        .eq("run_id", runId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SimulationError[];
    },
    enabled: !!runId,
  });
}

// ─── Real simulation engine ───
async function executeStepReal(stepCode: string): Promise<{ passed: boolean; actual: string; checks: StepCheck[]; errors: string[] }> {
  try {
    const { data, error } = await supabase.functions.invoke("edge-qa-simulation-executor", {
      body: { step_code: stepCode, mode: "real" },
    });
    if (error) throw error;
    return data as { passed: boolean; actual: string; checks: StepCheck[]; errors: string[] };
  } catch (e: any) {
    // Fallback: edge function unreachable
    return {
      passed: false,
      actual: `Exécuteur QA inaccessible: ${e.message || String(e)}`,
      checks: [{ label: "Edge function edge-qa-simulation-executor accessible", passed: false, detail: String(e) }],
      errors: ["EXECUTOR_UNREACHABLE"],
    };
  }
}

// Mock fallback
async function executeStepMock(stepCode: string): Promise<{ passed: boolean; actual: string; checks: StepCheck[]; errors: string[] }> {
  const delay = 300 + Math.random() * 700;
  await new Promise((r) => setTimeout(r, delay));

  const mockChecks: StepCheck[] = [
    { label: `Mock: ${stepCode} simulé`, passed: true, detail: "Résultat simulé (mode mock)" },
  ];

  switch (stepCode) {
    case "extract":
      return { passed: true, actual: "Mock: Prospect extrait et normalisé", checks: mockChecks, errors: [] };
    case "email":
      return { passed: true, actual: "Mock: Email template validé", checks: mockChecks, errors: [] };
    case "cta_click":
      return { passed: true, actual: "Mock: Routes CTA valides", checks: mockChecks, errors: [] };
    case "signup":
      return { passed: true, actual: "Mock: Inscription validée", checks: mockChecks, errors: [] };
    case "payment":
      return { passed: true, actual: "Mock: Paiement validé", checks: mockChecks, errors: [] };
    case "profile":
      return { passed: true, actual: "Mock: Profil validé", checks: mockChecks, errors: [] };
    default:
      return { passed: true, actual: `Mock: ${stepCode} passé`, checks: mockChecks, errors: [] };
  }
}

export function useLaunchSimulation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ scenarioId, environment, realMode = true }: { scenarioId: string; environment: string; realMode?: boolean }) => {
      // 1. Get scenario
      const { data: scenario, error: sErr } = await supabase
        .from("simulation_scenarios")
        .select("*")
        .eq("id", scenarioId)
        .single();
      if (sErr || !scenario) throw new Error("Scénario introuvable");

      const steps = scenario.step_order_json as unknown as string[];

      // 2. Create run
      const { data: run, error: rErr } = await supabase
        .from("simulation_runs")
        .insert({
          scenario_id: scenarioId,
          environment,
          run_name: `${scenario.name} — ${realMode ? "réel" : "mock"} — ${new Date().toLocaleString("fr-CA")}`,
          status: "running",
          started_at: new Date().toISOString(),
          started_by: user?.id || null,
        })
        .select()
        .single();
      if (rErr || !run) throw new Error("Impossible de créer le run");

      // 3. Create step rows
      const stepRows = steps.map((code, i) => ({
        run_id: run.id,
        step_code: code,
        step_label: STEP_DEFINITIONS[code]?.label || code,
        step_order: i,
        status: "pending",
        is_critical: STEP_DEFINITIONS[code]?.critical ?? true,
      }));
      const { data: createdSteps, error: csErr } = await supabase
        .from("simulation_steps")
        .insert(stepRows)
        .select();
      if (csErr) throw csErr;

      // 4. Execute steps sequentially
      let passed = 0;
      let failed = 0;
      let criticalFails = 0;

      const executor = realMode ? executeStepReal : executeStepMock;

      for (const step of (createdSteps || []).sort((a: any, b: any) => a.step_order - b.step_order)) {
        const startTime = Date.now();

        await supabase.from("simulation_steps").update({ status: "running", started_at: new Date().toISOString() }).eq("id", step.id);

        const result = await executor(step.step_code);
        const duration = Date.now() - startTime;

        await supabase.from("simulation_steps").update({
          status: result.passed ? "passed" : "failed",
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          expected_result: "passed",
          actual_result: result.actual,
        }).eq("id", step.id);

        // Log event with checks detail
        await supabase.from("simulation_events").insert({
          run_id: run.id,
          step_id: step.id,
          event_type: result.passed ? "step_passed" : "step_failed",
          event_label: result.actual,
          event_payload_json: { checks: result.checks, mode: realMode ? "real" : "mock" },
          status: result.passed ? "success" : "error",
        });

        if (result.passed) {
          passed++;
        } else {
          failed++;
          if (step.is_critical) criticalFails++;
          for (const errCode of result.errors) {
            await supabase.from("simulation_errors").insert({
              run_id: run.id,
              step_id: step.id,
              error_code: errCode,
              error_title: `Échec: ${step.step_label}`,
              error_message: result.checks.filter((c) => !c.passed).map((c) => `${c.label}: ${c.detail}`).join(" | "),
              error_context_json: { checks: result.checks },
              severity: step.is_critical ? "critical" : "medium",
            });
          }
        }

        // Log specialized events
        if (step.step_code === "email") {
          await supabase.from("simulation_email_events").insert({
            run_id: run.id,
            sequence_name: "prospect_acquisition_v2",
            template_code: "prospect_v2",
            recipient_email: "test@simulation.unpro.ca",
            delivery_status: result.passed ? "delivered" : "failed",
            open_status: result.passed ? "opened" : "unknown",
            click_status: result.passed ? "clicked" : "unknown",
            cta_url: "/signup/contractor",
          });
        }
        if (step.step_code === "payment") {
          await supabase.from("simulation_payment_events").insert({
            run_id: run.id,
            plan_code: "recrue",
            amount_cents: 14900,
            payment_status: result.passed ? "succeeded" : "failed",
            webhook_status: result.passed ? "received" : "timeout",
          });
        }
        if (step.step_code === "profile") {
          await supabase.from("simulation_profile_events").insert({
            run_id: run.id,
            profile_status_before: "incomplete",
            profile_status_after: result.passed ? "active" : "incomplete",
            completion_before: 0,
            completion_after: result.passed ? 100 : 45,
            activated: result.passed,
          });
        }
      }

      // 5. Finalize
      const total = passed + failed;
      const criticalSteps = (createdSteps || []).filter((s: any) => s.is_critical).length;
      const criticalPassed = criticalSteps - criticalFails;
      const healthScore = total > 0
        ? Math.round(((criticalPassed / Math.max(criticalSteps, 1)) * 70) + ((passed / total) * 30))
        : 0;

      await supabase.from("simulation_runs").update({
        status: failed > 0 ? "failed" : "passed",
        completed_at: new Date().toISOString(),
        health_score: healthScore,
        critical_failures_count: criticalFails,
        warnings_count: failed - criticalFails,
      }).eq("id", run.id);

      return run.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation-runs"] });
    },
  });
}

export function useRetryStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, realMode = true }: { stepId: string; realMode?: boolean }) => {
      const { data: step } = await supabase.from("simulation_steps").select("*").eq("id", stepId).single();
      if (!step) throw new Error("Étape introuvable");

      await supabase.from("simulation_steps").update({
        status: "running",
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_ms: null,
        actual_result: null,
        retry_count: (step.retry_count || 0) + 1,
      }).eq("id", stepId);

      const startTime = Date.now();
      const executor = realMode ? executeStepReal : executeStepMock;
      const result = await executor(step.step_code);
      const duration = Date.now() - startTime;

      await supabase.from("simulation_steps").update({
        status: result.passed ? "passed" : "failed",
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        actual_result: result.actual,
      }).eq("id", stepId);

      // Update run health
      const { data: allSteps } = await supabase.from("simulation_steps").select("*").eq("run_id", step.run_id);
      if (allSteps) {
        const p = allSteps.filter((s: any) => s.status === "passed").length;
        const f = allSteps.filter((s: any) => s.status === "failed").length;
        const cf = allSteps.filter((s: any) => s.status === "failed" && s.is_critical).length;
        const total = p + f;
        const critTotal = allSteps.filter((s: any) => s.is_critical).length;
        const health = total > 0 ? Math.round((((critTotal - cf) / Math.max(critTotal, 1)) * 70) + ((p / total) * 30)) : 0;
        await supabase.from("simulation_runs").update({
          status: f > 0 ? "failed" : "passed",
          health_score: health,
          critical_failures_count: cf,
          warnings_count: f - cf,
        }).eq("id", step.run_id);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation-steps"] });
      queryClient.invalidateQueries({ queryKey: ["simulation-run"] });
      queryClient.invalidateQueries({ queryKey: ["simulation-runs"] });
      queryClient.invalidateQueries({ queryKey: ["simulation-errors"] });
    },
  });
}

export function useCancelRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      await supabase.from("simulation_runs").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", runId);
      await supabase.from("simulation_steps").update({ status: "skipped" }).eq("run_id", runId).in("status", ["pending", "running"]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulation-runs"] });
      queryClient.invalidateQueries({ queryKey: ["simulation-run"] });
      queryClient.invalidateQueries({ queryKey: ["simulation-steps"] });
    },
  });
}
