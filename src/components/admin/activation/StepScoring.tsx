/**
 * Step 4 — AIPP Score Calculation + Override
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Calculator, Edit3, Shield, Star, Globe, Camera, MapPin, FileCheck, Clock, Award } from "lucide-react";
import { toast } from "sonner";
import type { ActivationWizardState } from "@/pages/admin/PageAdminEntrepreneurActivation";

interface Props {
  state: ActivationWizardState;
  updateState: (p: Partial<ActivationWizardState>) => void;
  addEvent: (type: string, detail?: string) => void;
}

const SIGNALS = [
  { key: "profile_completeness", label: "Complétude profil", icon: FileCheck, weight: 20 },
  { key: "reviews", label: "Avis clients", icon: Star, weight: 15 },
  { key: "brand_presence", label: "Présence marque", icon: Globe, weight: 15 },
  { key: "regulatory", label: "Crédibilité réglementaire", icon: Shield, weight: 15 },
  { key: "media_quality", label: "Qualité médias", icon: Camera, weight: 10 },
  { key: "service_precision", label: "Précision services", icon: Award, weight: 10 },
  { key: "geo_coverage", label: "Couverture géographique", icon: MapPin, weight: 10 },
  { key: "recency", label: "Fraîcheur données", icon: Clock, weight: 5 },
];

export default function StepScoring({ state, updateState, addEvent }: Props) {
  const [signals, setSignals] = useState<Record<string, number>>(
    Object.fromEntries(SIGNALS.map(s => [s.key, 50]))
  );
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideScore, setOverrideScore] = useState(0);
  const [overrideReason, setOverrideReason] = useState("");

  const calculatedScore = Math.round(
    SIGNALS.reduce((acc, s) => acc + (signals[s.key] || 0) * (s.weight / 100), 0)
  );

  const effectiveScore = overrideEnabled ? overrideScore : calculatedScore;

  const { data: existingScore } = useQuery({
    queryKey: ["admin-contractor-score", state.contractorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractors")
        .select("aipp_score, profile_completion_score")
        .eq("id", state.contractorId!)
        .single();
      return data;
    },
    enabled: !!state.contractorId,
  });

  useEffect(() => {
    if (existingScore?.aipp_score) {
      setOverrideScore(existingScore.aipp_score);
    }
  }, [existingScore]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("contractors")
        .update({ aipp_score: effectiveScore })
        .eq("id", state.contractorId!);
      if (error) throw error;

      // Log event
      const user = (await supabase.auth.getUser()).data.user;
      await supabase.from("admin_activation_events").insert({
        contractor_id: state.contractorId!,
        admin_user_id: user?.id || "",
        event_type: overrideEnabled ? "score_overridden" : "score_computed",
        event_payload_json: {
          calculated: calculatedScore,
          effective: effectiveScore,
          override: overrideEnabled,
          override_reason: overrideReason,
          signals,
        },
      });
    },
    onSuccess: () => {
      updateState({ scoreComputed: true });
      addEvent(overrideEnabled ? "score_overridden" : "score_computed", `Score: ${effectiveScore}`);
      toast.success(`Score AIPP ${effectiveScore} enregistré`);
    },
  });

  const getTier = (score: number) => {
    if (score >= 90) return { label: "Élite", color: "bg-purple-500" };
    if (score >= 75) return { label: "Authority", color: "bg-blue-500" };
    if (score >= 60) return { label: "Gold", color: "bg-yellow-500" };
    if (score >= 40) return { label: "Silver", color: "bg-gray-400" };
    return { label: "Bronze", color: "bg-orange-600" };
  };

  const tier = getTier(effectiveScore);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Score AIPP</h2>
        <p className="text-sm text-muted-foreground">
          Calculez ou ajustez le score de l'entrepreneur
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signals */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Signaux de scoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {SIGNALS.map(signal => {
                const Icon = signal.icon;
                return (
                  <div key={signal.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {signal.label}
                        <span className="text-xs text-muted-foreground">({signal.weight}%)</span>
                      </Label>
                      <span className="text-sm font-medium">{signals[signal.key]}</span>
                    </div>
                    <Input
                      type="range"
                      min={0}
                      max={100}
                      value={signals[signal.key]}
                      onChange={e => setSignals(p => ({ ...p, [signal.key]: Number(e.target.value) }))}
                      className="h-2"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Override */}
          <Card className={overrideEnabled ? "border-yellow-500/50" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Override manuel
                </CardTitle>
                <Switch checked={overrideEnabled} onCheckedChange={setOverrideEnabled} />
              </div>
            </CardHeader>
            {overrideEnabled && (
              <CardContent className="space-y-4">
                <div>
                  <Label>Score override ({overrideScore})</Label>
                  <Input
                    type="range"
                    min={0}
                    max={100}
                    value={overrideScore}
                    onChange={e => setOverrideScore(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Raison de l'override *</Label>
                  <Textarea
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="Justification de la modification manuelle..."
                    rows={2}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (overrideEnabled && !overrideReason)}
            className="w-full sm:w-auto"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Enregistrer le score
          </Button>
        </div>

        {/* Score preview card */}
        <div>
          <Card className="sticky top-32">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="relative w-28 h-28 mx-auto">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                  <circle
                    cx="60" cy="60" r="50" fill="none" strokeWidth="8"
                    className="text-primary"
                    strokeDasharray={`${(effectiveScore / 100) * 314} 314`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">{effectiveScore}</span>
                </div>
              </div>
              <div>
                <Badge className={`${tier.color} text-white`}>{tier.label}</Badge>
                {overrideEnabled && (
                  <p className="text-xs text-yellow-600 mt-1">Override actif</p>
                )}
              </div>
              <div className="text-left space-y-1 pt-2 border-t">
                <p className="text-xs text-muted-foreground">Score calculé: {calculatedScore}</p>
                {overrideEnabled && <p className="text-xs text-muted-foreground">Score override: {overrideScore}</p>}
                <p className="text-xs text-muted-foreground">Score effectif: {effectiveScore}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
