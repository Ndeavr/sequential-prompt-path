import { Zap, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import Countdown36hTimer from "./Countdown36hTimer";

interface Props {
  session: { id: string; end_time: string; status: string; actual_conversions: number; target_conversions: number } | null;
  onStart: () => void;
  onClose: () => void;
  isStarting: boolean;
}

export default function HeroSection36hStrike({ session, onStart, onClose, isStarting }: Props) {
  if (!session) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Zap className="w-3 h-3" /> Revenue Strike Engine
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Strike 36h</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          Lancez un sprint de conversion intensif. Objectif : 1 abonnement en 36h.
        </p>
        <Button onClick={onStart} disabled={isStarting} className="gap-2">
          <Play className="w-4 h-4" />
          {isStarting ? "Lancement…" : "Lancer Strike 36h"}
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
        <Zap className="w-3 h-3" />
        {session.status === "success" ? "Objectif atteint!" : session.status === "critical" ? "CRITIQUE" : "Strike actif"}
      </div>
      <Countdown36hTimer endTime={session.end_time} status={session.status} />
      <div className="mt-3 text-xs text-muted-foreground">
        {session.actual_conversions}/{session.target_conversions} conversion{session.target_conversions > 1 ? "s" : ""}
      </div>
      {session.status !== "success" && session.status !== "closed" && (
        <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={onClose}>
          <Square className="w-3 h-3 mr-1" /> Fermer Strike
        </Button>
      )}
    </div>
  );
}
