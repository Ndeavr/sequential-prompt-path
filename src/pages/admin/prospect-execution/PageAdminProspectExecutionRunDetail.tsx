import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import PanelExecutionTimeline from "@/components/prospect-execution/PanelExecutionTimeline";
import PanelProspectIdentity from "@/components/prospect-execution/PanelProspectIdentity";
import PanelAIPPScorePreview from "@/components/prospect-execution/PanelAIPPScorePreview";
import PanelEmailGeneration from "@/components/prospect-execution/PanelEmailGeneration";
import WidgetRunStatus from "@/components/prospect-execution/WidgetRunStatus";

export default function PageAdminProspectExecutionRunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ["exec-run", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_execution_runs")
        .select("*")
        .eq("id", runId!)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });

  const { data: prospect } = useQuery({
    queryKey: ["exec-prospect", run?.prospect_id],
    enabled: !!run?.prospect_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_records")
        .select("*")
        .eq("id", run!.prospect_id!)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: steps } = useQuery({
    queryKey: ["exec-steps", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_execution_steps")
        .select("*")
        .eq("run_id", runId!)
        .order("step_order");
      if (error) throw error;
      return data;
    },
    refetchInterval: 3000,
  });

  const { data: aippSnapshot } = useQuery({
    queryKey: ["exec-aipp", run?.prospect_id],
    enabled: !!run?.prospect_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_aipp_snapshots")
        .select("*")
        .eq("prospect_id", run!.prospect_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: emailMessage } = useQuery({
    queryKey: ["exec-email", run?.prospect_id],
    enabled: !!run?.prospect_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_email_messages")
        .select("*")
        .eq("prospect_id", run!.prospect_id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!emailMessage) throw new Error("Pas de message");
      const { error } = await supabase
        .from("prospect_email_messages")
        .update({ approval_status: "approved" })
        .eq("id", emailMessage.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Courriel approuvé");
      qc.invalidateQueries({ queryKey: ["exec-email"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!emailMessage) throw new Error("Pas de message");
      const { error } = await supabase
        .from("prospect_email_messages")
        .update({ approval_status: "rejected" })
        .eq("id", emailMessage.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.info("Courriel rejeté");
      qc.invalidateQueries({ queryKey: ["exec-email"] });
    },
  });

  const retryStep = async (stepId: string) => {
    const { error } = await supabase
      .from("prospect_execution_steps")
      .update({ status: "queued", error_message: null, error_code: null })
      .eq("id", stepId);
    if (error) toast.error("Erreur retry");
    else {
      toast.success("Étape relancée");
      qc.invalidateQueries({ queryKey: ["exec-steps"] });
      // Re-trigger pipeline
      if (run) {
        supabase.functions.invoke("execute-prospect-pipeline", { body: { run_id: run.id, prospect_id: run.prospect_id } });
      }
    }
  };

  if (runLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/prospect-execution")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-display font-bold">
            Run Pipeline
          </h1>
          <p className="text-xs text-muted-foreground">{runId}</p>
        </div>
        <WidgetRunStatus status={run?.status ?? "queued"} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <PanelProspectIdentity prospect={prospect ?? null} />
          <PanelAIPPScorePreview snapshot={aippSnapshot ? { ...aippSnapshot, weaknesses_json: (aippSnapshot.weaknesses_json as any[] | null) ?? [], opportunities_json: (aippSnapshot.opportunities_json as any[] | null) ?? [] } : null} />
        </div>

        {/* Center — timeline */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Timeline d'exécution</CardTitle>
            </CardHeader>
            <CardContent>
              {steps ? (
                <>
                  <PanelExecutionTimeline steps={steps} />
                  {/* Retry failed steps */}
                  {steps.filter((s) => s.status === "failed").map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant="outline"
                      className="mt-2 gap-1 w-full"
                      onClick={() => retryStep(s.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Relancer : {s.step_label}
                    </Button>
                  ))}
                </>
              ) : (
                <Skeleton className="h-40 w-full" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — email */}
        <div className="space-y-4">
          <PanelEmailGeneration
            message={emailMessage ?? null}
            onApprove={() => approveMutation.mutate()}
            onReject={() => rejectMutation.mutate()}
          />
          {emailMessage?.approval_status === "approved" && emailMessage?.send_status === "draft" && (
            <Button
              className="w-full gap-2"
              onClick={async () => {
                await supabase
                  .from("prospect_email_messages")
                  .update({ send_status: "queued" })
                  .eq("id", emailMessage.id);
                toast.success("Courriel mis en file d'envoi");
                qc.invalidateQueries({ queryKey: ["exec-email"] });
                // Trigger send
                if (run) {
                  supabase.functions.invoke("execute-prospect-pipeline", {
                    body: { run_id: run.id, prospect_id: run.prospect_id, resume_from: "email_send" },
                  });
                }
              }}
            >
              <Send className="h-4 w-4" />
              Envoyer le courriel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
