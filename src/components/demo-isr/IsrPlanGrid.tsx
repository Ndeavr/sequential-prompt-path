import { ISR_PLANS } from "@/config/isrDemoConfig";

interface Props {
  recommended: "Signature" | null;
}

export default function IsrPlanGrid({ recommended }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ISR_PLANS.map((p) => {
        const isReco = recommended === p.name;
        return (
          <div
            key={p.name}
            className={`relative rounded-[22px] border p-4 backdrop-blur-xl transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)] ${
              isReco
                ? "border-amber-300/60 bg-gradient-to-b from-amber-300/15 to-amber-400/5 shadow-[0_30px_80px_-30px_rgba(251,191,36,0.4)]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            {isReco && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#050816] whitespace-nowrap">
                Recommandé pour ISR
              </div>
            )}
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{p.tag}</div>
            <div className="mt-1 text-base font-semibold text-white">{p.name}</div>
            <div className="mt-2 text-xl font-semibold text-white">
              {p.price}<span className="text-sm font-normal text-white/50">$/mois</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
