import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  endTime: string;
  status: string;
}

export default function Countdown36hTimer({ endTime, status }: Props) {
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0, total: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(endTime).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining({ h, m, s, total: diff });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endTime]);

  const pct = Math.max(0, remaining.total / (36 * 3600000));
  const color =
    status === "success" ? "text-emerald-400" :
    status === "critical" || pct < 0.15 ? "text-red-400" :
    pct < 0.4 ? "text-orange-400" : "text-emerald-400";

  const bgRing =
    status === "success" ? "border-emerald-500/30" :
    status === "critical" || pct < 0.15 ? "border-red-500/30" :
    pct < 0.4 ? "border-orange-500/30" : "border-emerald-500/30";

  const pad = (n: number) => String(n).padStart(2, "0");

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className={`w-28 h-28 rounded-full border-4 ${bgRing} flex items-center justify-center bg-background/50`}>
          <span className="text-2xl font-bold text-emerald-400">✓</span>
        </div>
        <span className="text-sm text-emerald-400 font-medium">Objectif atteint!</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-28 h-28 rounded-full border-4 ${bgRing} flex items-center justify-center bg-background/50`}>
        <div className="text-center">
          <div className={`text-2xl font-mono font-bold ${color}`}>
            {pad(remaining.h)}:{pad(remaining.m)}
          </div>
          <div className={`text-xs font-mono ${color} opacity-70`}>:{pad(remaining.s)}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>Temps restant</span>
      </div>
    </div>
  );
}
