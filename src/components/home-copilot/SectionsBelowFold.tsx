/**
 * SectionsBelowFold — light, focused below-fold blocks.
 * No clutter, no marketplace vibe.
 */
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Brain, Clock, HeartHandshake, Star, Upload, FileStack, ArrowRight } from "lucide-react";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

const VALUES = [
  { icon: ShieldCheck, title: "Pros vérifiés", desc: "Rigoureux et fiables" },
  { icon: Brain, title: "IA intelligente", desc: "Recommandations précises" },
  { icon: Clock, title: "Gain de temps", desc: "On fait le tri pour vous" },
  { icon: HeartHandshake, title: "Moins de stress", desc: "On vous guide à chaque étape" },
];

const REVIEWS = [
  {
    name: "Sophie L.",
    city: "Laval, QC",
    text: "Alex m'a recommandé le bon pro du premier coup. Service incroyable!",
  },
  {
    name: "Marc-Antoine B.",
    city: "Longueuil, QC",
    text: "J'ai évité une mauvaise soumission grâce à l'analyse d'Alex.",
  },
  {
    name: "Geneviève P.",
    city: "Montréal, QC",
    text: "Recommandation claire, rendez-vous rapide. Exactement ce qu'il me fallait.",
  },
];

export default function SectionsBelowFold() {
  const navigate = useNavigate();

  return (
    <div className="bg-[hsl(220_50%_4%)] text-white">
      {/* B. Reviews */}
      <section className="px-5 py-10">
        <h2 className="text-center text-[18px] font-bold mb-5">
          Ce que disent <span className="text-sky-400">nos clients</span>
        </h2>
        <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-2 snap-x snap-mandatory scrollbar-hide">
          {REVIEWS.map((r) => (
            <article
              key={r.name}
              className="snap-start flex-shrink-0 w-[78%] max-w-[300px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4"
            >
              <div className="flex gap-0.5 mb-2 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="text-[13px] text-white/85 leading-relaxed">{r.text}</p>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-[13px] font-semibold">{r.name}</p>
                <p className="text-[11px] text-white/55">{r.city}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* C. Quote upload secondary */}
      <section className="px-5 pb-10">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/3 backdrop-blur-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center flex-shrink-0">
              <FileStack className="w-6 h-6 text-sky-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold leading-tight">Vous avez déjà des soumissions?</h3>
              <p className="text-[12.5px] text-white/65 mt-1 leading-relaxed">
                Téléversez-les. Alex explique les écarts et recommande la meilleure prochaine action.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              trackCopilotEvent("quote_upload_clicked");
              navigate("/soumission/analyse");
            }}
            className="mt-4 w-full h-11 rounded-xl bg-white/8 border border-white/15 text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-white/12 transition"
          >
            <Upload className="w-4 h-4" />
            Analyser mes soumissions
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      </section>

      {/* A. Why UNPRO */}
      <section className="px-5 pb-12">
        <h2 className="text-center text-[18px] font-bold mb-5">Pourquoi choisir UNPRO?</h2>
        <div className="grid grid-cols-2 gap-3">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-full bg-sky-500/15 border border-sky-400/30 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-sky-400" />
                </div>
                <p className="text-[13px] font-bold leading-tight">{v.title}</p>
                <p className="text-[11px] text-white/60 leading-tight mt-1">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer trust */}
      <div className="px-5 pb-8 text-center text-[11px] text-white/45 inline-flex items-center justify-center gap-1.5 w-full">
        <ShieldCheck className="w-3.5 h-3.5 text-sky-400/60" />
        Vos informations sont confidentielles.
      </div>
    </div>
  );
}
