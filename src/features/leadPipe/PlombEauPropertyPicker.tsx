/**
 * UNPRO — Plomb-Eau Property Picker
 * Shows user's properties for analysis. Triggers auth overlay if logged out.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { openAuthOverlay } from "@/hooks/useAuthOverlay";
import { useAnalyzeLeadPipe, useCreatePlumberLead } from "@/hooks/useLeadPipe";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Home, Plus, ShieldAlert, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { trackLeadPipeEvent } from "@/hooks/useLeadPipe";

interface Props {
  citySlug: string;
  cityName: string;
}

export default function PlombEauPropertyPicker({ citySlug, cityName }: Props) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const analyze = useAnalyzeLeadPipe();
  const createLead = useCreatePlumberLead();
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["my-properties-quick", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, address, city, year_built, property_type")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleStart = () => {
    trackLeadPipeEvent({ citySlug, slug: citySlug, event: "click_login" });
    if (!isAuthenticated) {
      openAuthOverlay({
        label: "Connectez-vous pour analyser votre propriété",
        returnPath: window.location.pathname,
        action: "lead_pipe_analyze",
      });
      return;
    }
  };

  const handleAnalyze = async (propertyId: string) => {
    setSelected(propertyId);
    setResult(null);
    try {
      const res = await analyze.mutateAsync({ propertyId });
      setResult(res?.result);
      trackLeadPipeEvent({ citySlug, slug: citySlug, event: "analyze_success" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBookPlumber = async () => {
    trackLeadPipeEvent({ citySlug, slug: citySlug, event: "click_plumber" });
    if (selected) {
      await createLead.mutateAsync({
        propertyId: selected,
        city: cityName,
        citySlug,
        category: "lead_pipe_inspection",
        urgency: result?.riskLevel === "Élevé" ? "urgent" : "normal",
      });
    }
    openAlex("plumber_lead_pipe");
  };

  if (!isAuthenticated) {
    return (
      <Card className="p-6 bg-white/80 backdrop-blur border-blue-200/60">
        <div className="flex items-start gap-3 mb-4">
          <ShieldAlert className="text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-lg">Vérifier mon adresse gratuitement</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Connectez-vous pour estimer le risque de tuyauterie en plomb pour votre propriété à {cityName}.
            </p>
          </div>
        </div>
        <Button onClick={handleStart} size="lg" className="w-full">
          Connectez-vous pour analyser
        </Button>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Analyse indicative. Test certifié recommandé si doute.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white/80 backdrop-blur border-blue-200/60 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Choisissez une propriété</h3>
        <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/properties/new")}>
          <Plus className="size-4 mr-1" /> Adresse
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>
      ) : properties && properties.length > 0 ? (
        <div className="space-y-2">
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => handleAnalyze(p.id)}
              disabled={analyze.isPending}
              className={`w-full text-left p-3 rounded-lg border transition ${
                selected === p.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-border hover:border-blue-300 hover:bg-blue-50/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <Home className="size-4 text-blue-600" />
                <span className="font-medium text-sm">{p.address}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {p.city} • {p.year_built ?? "année?"} • {p.property_type ?? "type?"}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">Aucune propriété enregistrée.</p>
          <Button onClick={() => navigate("/dashboard/properties/new")} size="sm">
            <Plus className="size-4 mr-1" /> Ajouter une adresse
          </Button>
        </div>
      )}

      {analyze.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="animate-spin size-4" /> Analyse en cours…
        </div>
      )}

      {result && (
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-slate-50 border-blue-300">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-medium">Score Risque Plomb</span>
            <span
              className={`text-lg font-bold ${
                result.riskLevel === "Élevé"
                  ? "text-red-600"
                  : result.riskLevel === "Modéré"
                  ? "text-orange-600"
                  : "text-emerald-600"
              }`}
            >
              {result.riskLevel} ({result.score}/100)
            </span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 mb-3">
            {result.factors?.slice(0, 4).map((f: any, i: number) => (
              <li key={i}>• {f.label} {f.detail ? `— ${f.detail}` : ""}</li>
            ))}
          </ul>
          <div className="text-xs font-medium mb-1">Recommandations :</div>
          <ul className="text-xs text-muted-foreground space-y-1 mb-4">
            {result.recommendedActions?.map((a: string, i: number) => (
              <li key={i}>✓ {a}</li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => openAlex("lead_pipe_chat")} variant="outline">
              Parler à Alex
            </Button>
            <Button onClick={handleBookPlumber}>
              <Phone className="size-4 mr-1" /> Plombier
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 text-center">
            Analyse indicative. Test certifié recommandé si doute.
          </p>
        </Card>
      )}
    </Card>
  );
}
