/**
 * UNPRO Condo — Diagnostic CTA Section (replaces LeadMagnet/Checklist)
 */
import { Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionContainer from "@/components/unpro/SectionContainer";
import { useNavigate } from "react-router-dom";

export default function SectionCondoDiagnosticCTA() {
  const navigate = useNavigate();

  return (
    <SectionContainer>
      <div className="max-w-2xl mx-auto glass-card rounded-2xl border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="p-4 rounded-xl bg-primary/10 shrink-0">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2 text-center md:text-left flex-1">
          <h3 className="text-lg font-display font-bold text-foreground">
            Diagnostic Condo IA Gratuit
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Obtenez votre diagnostic condo en 60 secondes. Score de conformité,
            détection des risques et 3 actions prioritaires — gratuitement.
          </p>
        </div>
        <Button
          onClick={() => navigate("/condos/diagnostic")}
          className="gap-2 shrink-0"
        >
          Analyser mon condo <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </SectionContainer>
  );
}
