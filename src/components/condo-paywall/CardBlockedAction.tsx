import { Lock } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export default function CardBlockedAction({ title, description }: Props) {
  return (
    <div className="relative flex gap-3 p-4 rounded-xl border border-border/50 bg-muted/20 opacity-60">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted text-muted-foreground shrink-0">
        <Lock className="h-4 w-4" />
      </div>
      <div className="space-y-1 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
