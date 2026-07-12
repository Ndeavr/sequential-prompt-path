/**
 * LocalizedDemandCard — Personalized demand teaser shown when trade + city are known.
 * No fabricated numbers — pure qualitative signal.
 */
import { MapPin, Radar } from "lucide-react";

interface Props {
  trade: string;
  city: string;
}

export default function LocalizedDemandCard({ trade, city }: Props) {
  const t = trade.trim();
  const c = city.trim();
  if (!t || !c) return null;

  return (
    <div
      className="rounded-3xl p-5 md:p-6 border mb-5 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(245,200,90,0.10) 0%, rgba(245,200,90,0.03) 60%, rgba(255,255,255,0.02) 100%)",
        borderColor: "rgba(245,200,90,0.35)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wider"
          style={{
            background: "rgba(245,200,90,0.15)",
            color: "#F5C85A",
            border: "1px solid rgba(245,200,90,0.35)",
          }}
        >
          <Radar className="w-3 h-3" />
          En temps réel · UNPRO
        </span>
      </div>

      <p
        className="text-[15px] md:text-[16px] font-semibold leading-snug mb-2"
        style={{ color: "#fff", letterSpacing: "-0.01em" }}
      >
        Des propriétaires recherchent actuellement un entrepreneur en{" "}
        <span style={{ color: "#F5C85A" }}>{t.toLowerCase()}</span> à{" "}
        <span style={{ color: "#F5C85A" }}>{c}</span>.
      </p>

      <div
        className="flex items-center gap-1.5 text-[12px]"
        style={{ color: "rgba(255,255,255,0.65)" }}
      >
        <MapPin className="w-3.5 h-3.5" />
        Zone active — {c}
      </div>
    </div>
  );
}
