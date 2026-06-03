/**
 * ScarcitySignal — Calm, strategic scarcity messaging.
 * Never aggressive. Never fake countdowns. Sourced from entrepreneurMessaging.scarcity.
 */
import { MapPin, Lock, Crown } from "lucide-react";
import { entrepreneurMessaging } from "@/lib/copy/entrepreneurs";
import { cn } from "@/lib/utils";

type Mode = "placesLeft" | "territoryLocking" | "trade" | "founderPriority" | "regionalExclusivity";

interface Props {
  mode: Mode;
  city?: string;
  trade?: string;
  placesLeft?: number;
  className?: string;
}

export default function ScarcitySignal({ mode, city = "", trade = "", placesLeft = 0, className }: Props) {
  const s = entrepreneurMessaging.scarcity;
  let text = "";
  let Icon = MapPin;

  switch (mode) {
    case "placesLeft":
      text = s.placesLeft(placesLeft, city);
      Icon = MapPin;
      break;
    case "territoryLocking":
      text = s.territoryLocking(city);
      Icon = Lock;
      break;
    case "trade":
      text = s.trade(trade, city);
      Icon = MapPin;
      break;
    case "founderPriority":
      text = s.founderPriority;
      Icon = Crown;
      break;
    case "regionalExclusivity":
      text = s.regionalExclusivity;
      Icon = Lock;
      break;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-white/[0.04] backdrop-blur-xl border border-primary/20",
        "text-[11px] font-medium text-foreground/90",
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span>{text}</span>
    </div>
  );
}
