import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, MapPin, Calendar, Camera, UserCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PageOnboardingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [activating, setActivating] = useState(true);
  const [activation, setActivation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setActivating(false);
      return;
    }

    const activate = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("activate-contractor-plan", {
          body: { checkout_session_id: sessionId },
        });
        if (fnError) throw fnError;
        setActivation(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setActivating(false);
      }
    };

    activate();
  }, [sessionId]);

  const nextSteps = [
    { icon: UserCircle, label: "Compléter votre profil", path: "/pro/profile" },
    { icon: MapPin, label: "Choisir vos villes desservies", path: "/pro/territories" },
    { icon: Calendar, label: "Configurer vos disponibilités", path: "/pro/booking-settings" },
    { icon: Camera, label: "Ajouter vos photos de projets", path: "/pro/profile" },
  ];

  if (activating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Activation de votre plan…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-lg mx-auto space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-3 pt-8">
        <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black text-foreground">
          {activation?.success ? "Bienvenue chez UNPRO!" : "Activation en cours"}
        </h1>
        {activation?.plan_code && (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            Plan {activation.plan_code} activé
          </Badge>
        )}
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Next Steps */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <p className="text-sm font-semibold text-foreground mb-3">Prochaines étapes</p>
          {nextSteps.map((step, i) => (
            <button
              key={i}
              onClick={() => navigate(step.path)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
            >
              <step.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-foreground flex-1">{step.label}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={() => navigate("/pro")}>
        Aller à mon tableau de bord
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
