/**
 * SituationCardsCarousel — Horizontal snap on mobile, 4-col grid on desktop.
 */
import { useNavigate } from "react-router-dom";
import SituationCard from "./SituationCard";
import { HOMEOWNER_SITUATIONS, type HomeownerSituation } from "@/config/homeownerSituations";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

export default function SituationCardsCarousel() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();

  const handle = (s: HomeownerSituation) => {
    if (s.action.kind === "route") {
      navigate(s.action.href);
    } else {
      openAlex("homeowner", s.action.hint);
    }
  };

  return (
    <section className="relative w-full px-5 lg:px-10 mt-2 lg:mt-6">
      <div
        className="flex lg:grid lg:grid-cols-4 gap-4
          overflow-x-auto lg:overflow-visible snap-x snap-mandatory
          -mx-5 px-5 lg:mx-0 lg:px-0
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {HOMEOWNER_SITUATIONS.map((s) => (
          <SituationCard key={s.id} situation={s} onActivate={handle} />
        ))}
      </div>
    </section>
  );
}
