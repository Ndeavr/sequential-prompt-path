/**
 * HomeIntelligenceActionGrid — 8 premium intelligence cards.
 * Horizontal snap-scroll on mobile, 4×2 grid on desktop. Glass tokens, no redesign.
 */
import { useNavigate } from "react-router-dom";
import {
  Camera, FileText, ShieldCheck, Home, ThermometerSun,
  Droplets, Zap, Building2, ArrowRight,
} from "lucide-react";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

interface ActionCard {
  id: string;
  title: string;
  desc: string;
  icon: typeof Camera;
  href: string;
}

const CARDS: ActionCard[] = [
  { id: "diagnostic", title: "Diagnostic visuel IA", desc: "Importez une photo et laissez Alex analyser le problème.", icon: Camera, href: "/diagnostic-photo" },
  { id: "quote", title: "Vérifier une soumission", desc: "Détectez les oublis, écarts de prix et risques avant de signer.", icon: FileText, href: "/soumission/analyse" },
  { id: "verify-pro", title: "Vérifier un entrepreneur", desc: "Consultez les signaux de confiance et spécialités détectés par l'IA.", icon: ShieldCheck, href: "/trouver-entrepreneur" },
  { id: "passport", title: "Passeport Maison", desc: "Votre maison mérite une mémoire intelligente.", icon: Home, href: "/mes-proprietes" },
  { id: "hot", title: "Maison trop chaude?", desc: "Découvrez les causes possibles et les solutions recommandées.", icon: ThermometerSun, href: "/probleme/maison-trop-chaude" },
  { id: "attic", title: "Humidité au grenier", desc: "Détectez les signes avant que les dommages empirent.", icon: Droplets, href: "/probleme/humidite-grenier" },
  { id: "hydro", title: "Facture Hydro trop élevée", desc: "Analysez les pertes d'énergie possibles de votre propriété.", icon: Zap, href: "/probleme/facture-hydro" },
  { id: "condo", title: "Condo / Loi 16", desc: "Simplifiez les décisions et réduisez les risques du bâtiment.", icon: Building2, href: "/condo" },
];

export default function HomeIntelligenceActionGrid() {
  const navigate = useNavigate();

  const handleClick = (c: ActionCard) => {
    trackCopilotEvent("intelligence_card_clicked", { id: c.id });
    navigate(c.href);
  };

  return (
    <section className="px-5 py-10 bg-[hsl(220_50%_4%)] text-white">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-[18px] font-bold mb-1">
          Que voulez-vous{" "}
          <span className="text-sky-400">comprendre aujourd'hui?</span>
        </h2>
        <p className="text-center text-[12.5px] text-white/55 mb-5">
          Chaque carte ouvre une intelligence dédiée à votre propriété.
        </p>

        {/* Mobile: horizontal snap. Desktop: 4-col grid. */}
        <div className="md:hidden -mx-5 px-5 flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => handleClick(c)}
                className="snap-start flex-shrink-0 w-[78%] max-w-[300px] text-left rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 hover:-translate-y-[2px] transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
              >
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="text-[14px] font-bold leading-tight">{c.title}</h3>
                <p className="text-[12px] text-white/65 mt-1 leading-relaxed">{c.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-sky-400/90 font-medium">
                  Ouvrir <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden md:grid md:grid-cols-4 gap-4">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => handleClick(c)}
                className="text-left rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 hover:-translate-y-[2px] hover:border-white/20 transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
              >
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="text-[15px] font-bold leading-tight">{c.title}</h3>
                <p className="text-[12.5px] text-white/65 mt-1 leading-relaxed">{c.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] text-sky-400/90 font-medium">
                  Ouvrir <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
