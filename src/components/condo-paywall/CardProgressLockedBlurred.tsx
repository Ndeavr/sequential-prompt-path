import { Lock } from "lucide-react";

interface Props {
  score: number;
  remainingActions: number;
}

export default function CardProgressLockedBlurred({ score, remainingActions }: Props) {
  return (
    <div className="relative glass-card rounded-2xl border border-primary/20 p-6 overflow-hidden">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10 flex flex-col items-center justify-center gap-3">
        <div className="p-3 rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground text-center px-4">
          {remainingActions} action{remainingActions > 1 ? "s" : ""} restante{remainingActions > 1 ? "s" : ""} à débloquer
        </p>
        <p className="text-xs text-muted-foreground">Risque non corrigé</p>
      </div>

      {/* Blurred background content */}
      <div className="space-y-3 filter blur-[2px]">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-8 bg-primary/10 rounded-lg w-full" />
      </div>
    </div>
  );
}
