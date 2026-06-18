import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, Briefcase } from "lucide-react";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionDualCtaFinal({ onTrackCta }: Props) {
  const navigate = useNavigate();

  return (
    <section className="px-5 py-12 md:py-20 bg-background">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Homeowner */}
        <div className="alex-immersive relative overflow-hidden bg-primary text-primary-foreground rounded-3xl p-8 md:p-10">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <Home className="h-10 w-10 mb-5 opacity-90" strokeWidth={1.5} />
          <p className="text-[10px] tracking-[0.2em] opacity-80 font-medium mb-2">
            POUR LES PROPRIÉTAIRES
          </p>
          <h3 className="text-2xl md:text-3xl font-bold leading-tight mb-5">
            Trouvez le bon entrepreneur pour votre projet.
          </h3>
          <Button
            onClick={() => {
              onTrackCta("final_homeowner", "final_cta");
              navigate("/alex");
            }}
            size="lg"
            variant="secondary"
            className="rounded-2xl h-12 px-6 font-semibold bg-white text-primary hover:bg-white/90"
          >
            Commencer <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs opacity-75 mt-3">Gratuit et sans obligation</p>
        </div>

        {/* Contractor */}
        <div className="alex-immersive relative overflow-hidden bg-[#0a1428] text-white rounded-3xl p-8 md:p-10 border border-white/10">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <Briefcase className="h-10 w-10 mb-5 text-primary" strokeWidth={1.5} />
          <p className="text-[10px] tracking-[0.2em] text-white/70 font-medium mb-2">
            POUR LES ENTREPRENEURS
          </p>
          <h3 className="text-2xl md:text-3xl font-bold leading-tight mb-5">
            Êtes-vous déjà recommandable par l'IA ?
          </h3>
          <Button
            onClick={() => {
              onTrackCta("final_contractor", "final_cta");
              navigate("/entrepreneurs");
            }}
            size="lg"
            className="rounded-2xl h-12 px-6 font-semibold bg-primary hover:bg-primary/90 shadow-glow"
          >
            Activer mon profil <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs text-white/60 mt-3">Activation rapide en 2 minutes</p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10">
        UNPRO — L'IA au service de meilleures décisions.
      </p>
    </section>
  );
}
