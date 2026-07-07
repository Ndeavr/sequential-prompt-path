/**
 * SectionsBelowFold — Passeport Maison narrative below the fold.
 *
 * Three sections:
 *  1. « Tout ce qui concerne votre propriété. Au même endroit. » (8 cards)
 *  2. « Prenez de meilleures décisions. » (5 value bullets)
 *  3. « Votre maison évolue. Son historique devrait suivre. » (lifecycle)
 */
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, ArrowRight, CheckCircle2, ClipboardList,
  History, Wrench, FileText, Camera, Calendar, FileStack, Award, Users,
} from "lucide-react";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import {
  PASSPORT_CONTAINS,
  PASSPORT_DECISIONS,
  PASSPORT_PRIMARY_CTA,
  PASSPORT_PRIMARY_HREF,
} from "@/lib/copy/passportPositioning";

const CONTAIN_ICONS = [History, ClipboardList, Award, FileText, Camera, Calendar, Users, FileStack];

export default function SectionsBelowFold() {
  const navigate = useNavigate();

  const goCreate = () => {
    trackCopilotEvent("passport_cta_clicked", { placement: "below_fold" });
    navigate(PASSPORT_PRIMARY_HREF);
  };

  return (
    <div className="bg-[hsl(220_50%_4%)] text-white">
      {/* 1. Tout ce qui concerne votre propriété */}
      <section className="px-5 pt-12 pb-8">
        <h2 className="text-center text-[22px] sm:text-[26px] font-bold leading-tight max-w-md mx-auto">
          Tout ce qui concerne votre propriété.
          <br />
          <span className="text-sky-400">Au même endroit.</span>
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 max-w-md mx-auto">
          {PASSPORT_CONTAINS.map((card, i) => {
            const Icon = CONTAIN_ICONS[i] ?? ClipboardList;
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-col"
              >
                <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center mb-2.5">
                  <Icon className="w-4.5 h-4.5 text-sky-400" />
                </div>
                <p className="text-[13.5px] font-semibold leading-tight">{card.title}</p>
                <p className="text-[11.5px] text-white/60 leading-snug mt-1">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Prenez de meilleures décisions */}
      <section className="px-5 py-10">
        <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/3 backdrop-blur-xl p-5">
          <h2 className="text-[20px] sm:text-[22px] font-bold leading-tight">
            Prenez de meilleures décisions.
          </h2>
          <p className="text-[13px] text-white/65 mt-1.5">UNPRO vous aide à :</p>
          <ul className="mt-4 space-y-2.5">
            {PASSPORT_DECISIONS.map((d) => (
              <li key={d} className="flex items-start gap-2.5 text-[13.5px] text-white/90">
                <CheckCircle2 className="w-4.5 h-4.5 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Votre maison évolue */}
      <section className="px-5 pb-10">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-[22px] sm:text-[26px] font-bold leading-tight">
            Votre maison évolue.
            <br />
            <span className="text-sky-400">Son historique devrait suivre.</span>
          </h2>
          <p className="text-[13.5px] text-white/70 mt-3 leading-relaxed">
            Le Passeport Maison grandit avec votre propriété : nouvelles rénovations,
            entretiens saisonniers, garanties, factures et professionnels. Chaque
            information ajoutée aujourd'hui vous fait gagner des heures — et parfois
            des milliers de dollars — demain.
          </p>
          <button
            onClick={goCreate}
            className="mt-6 w-full h-12 rounded-2xl bg-gradient-to-r from-[hsl(220_100%_55%)] to-[hsl(207_100%_58%)] text-white text-[14.5px] font-semibold flex items-center justify-center gap-2 shadow-[0_10px_30px_-8px_hsl(220_100%_50%/0.6)] active:scale-[0.98] transition"
          >
            <ClipboardList className="w-4.5 h-4.5" />
            {PASSPORT_PRIMARY_CTA}
            <ArrowRight className="w-4 h-4" />
          </button>
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
