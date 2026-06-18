import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import heroImg from "@/assets/home-v3-hero.jpg";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function HeroLeBon({ onTrackCta }: Props) {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();

  const handleAlex = () => {
    onTrackCta("hero_alex", "hero");
    try {
      openAlex("homeowner", "Trouvez le bon entrepreneur");
    } catch {
      navigate("/alex");
    }
  };

  return (
    <section className="alex-immersive relative overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 pt-10 pb-12 md:pt-20 md:pb-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="order-2 md:order-1">
            <p className="text-xs tracking-[0.2em] text-primary/80 font-medium mb-4">
              POUR LES PROPRIÉTAIRES
            </p>
            <h1 className="text-[42px] leading-[1.05] md:text-6xl font-bold tracking-tight">
              Trouvez le<br />
              <span className="text-primary">bon</span> entrepreneur.
            </h1>
            <div className="mt-6 space-y-1 text-lg md:text-xl text-white/75">
              <p>Pas le plus visible.</p>
              <p>Pas le moins cher.</p>
              <p className="text-primary font-medium">Le bon.</p>
            </div>

            <Button
              onClick={handleAlex}
              size="lg"
              className="mt-8 rounded-2xl h-14 px-7 text-base font-semibold shadow-glow bg-primary hover:bg-primary/90"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              <span className="flex flex-col items-start leading-tight">
                <span>Parler à Alex</span>
                <span className="text-[11px] font-normal opacity-80">Réponse en 2 minutes</span>
              </span>
            </Button>
          </div>

          <div className="order-1 md:order-2 relative">
            <img
              src={heroImg}
              alt="Maison entourée d'entrepreneurs flous avec l'entrepreneur recommandé illuminé"
              width={1024}
              height={1024}
              className="w-full h-auto rounded-3xl"
            />
            <div className="absolute top-3 right-3 md:top-6 md:right-6 bg-primary/95 backdrop-blur text-primary-foreground rounded-2xl px-4 py-2 shadow-glow">
              <p className="text-[10px] tracking-widest uppercase opacity-80">Correspondance</p>
              <p className="text-2xl md:text-3xl font-bold leading-none">97%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
