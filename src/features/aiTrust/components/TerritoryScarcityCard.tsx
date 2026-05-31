/**
 * UNPRO AI Trust — TerritoryScarcityCard
 * Communicates remaining authority slots in a city × specialty territory.
 */
import { motion } from "framer-motion";
import { Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  city: string;
  specialty: string;
  totalSlots: number;
  takenSlots: number;
  className?: string;
}

export default function TerritoryScarcityCard({
  city,
  specialty,
  totalSlots,
  takenSlots,
  className,
}: Props) {
  const remaining = Math.max(0, totalSlots - takenSlots);
  const ratio = totalSlots ? takenSlots / totalSlots : 0;
  const state =
    remaining === 0 ? "locked" : ratio >= 0.6 ? "scarce" : "open";

  const tone = {
    locked: "border-rose-500/40 bg-rose-500/5",
    scarce: "border-amber-500/40 bg-amber-500/5",
    open: "border-emerald-500/30 bg-emerald-500/5",
  }[state];

  const Icon = {
    locked: Lock,
    scarce: ShieldAlert,
    open: ShieldCheck,
  }[state];

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 backdrop-blur-xl glass-intel",
        tone,
        className,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Territoire d'autorité
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-1">
            {specialty} · {city}
          </h3>
        </div>
        <Icon className="w-5 h-5 opacity-80" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Places exposées</span>
          <span className="font-mono">
            {takenSlots}/{totalSlots}
          </span>
        </div>
        <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              state === "locked"
                ? "bg-rose-400"
                : state === "scarce"
                  ? "bg-amber-400"
                  : "bg-emerald-400",
            )}
          />
        </div>
        <p className="text-xs text-foreground/80 pt-1">
          {state === "locked" && "Territoire complet — liste d'attente uniquement."}
          {state === "scarce" &&
            `Plus que ${remaining} place${remaining > 1 ? "s" : ""} avant verrouillage.`}
          {state === "open" &&
            `${remaining} places disponibles pour devenir l'autorité IA.`}
        </p>
      </div>
    </div>
  );
}
