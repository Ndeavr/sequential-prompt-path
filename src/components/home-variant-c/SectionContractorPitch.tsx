import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, ShieldCheck, Target, CalendarCheck, Trophy } from "lucide-react";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionContractorPitch({ onTrackCta }: Props) {
  const navigate = useNavigate();

  const handle = () => {
    onTrackCta("contractor_activate", "contractor_pitch");
    navigate("/entrepreneurs");
  };

  return (
    <section className="alex-immersive relative bg-[#0a1428] text-white py-16 md:py-24 px-5 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[40vw] rounded-full bg-primary/8 blur-[100px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div>
          <p className="text-xs tracking-[0.2em] text-primary/80 font-medium mb-4">
            POUR LES ENTREPRENEURS
          </p>
          <h2 className="text-2xl md:text-4xl font-bold leading-tight">
            Les propriétaires demandent déjà à l'IA quel entrepreneur choisir.
          </h2>
          <p className="text-lg md:text-xl text-white/75 mt-5 leading-snug">
            Votre entreprise ferait-elle partie des recommandations ?
          </p>

          <Button
            onClick={handle}
            size="lg"
            className="mt-7 rounded-2xl h-13 px-7 font-semibold bg-primary hover:bg-primary/90 shadow-glow"
          >
            Activer mon profil
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Phone mock */}
        <div className="mx-auto w-full max-w-[300px]">
          <div className="bg-[#0f1c33] border border-white/10 rounded-[28px] p-4 shadow-2xl">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-3.5 w-3.5 text-white/60" />
              </div>
              <p className="text-xs text-white/75 leading-snug">
                Quel entrepreneur me recommandez-vous pour refaire ma toiture à Laval ?
              </p>
            </div>
            <div className="bg-primary/15 border border-primary/30 rounded-2xl p-3 mt-3">
              <p className="text-[10px] tracking-wider text-primary/90 font-bold mb-2">
                VOICI L'ENTREPRENEUR RECOMMANDÉ
              </p>
              <ul className="space-y-1.5 text-xs text-white/90">
                {[
                  { icon: ShieldCheck, t: "RBQ vérifiée" },
                  { icon: Target, t: "Spécialiste toiture" },
                  { icon: CalendarCheck, t: "Disponibilités cette semaine" },
                  { icon: Trophy, t: "Performance vérifiée" },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
